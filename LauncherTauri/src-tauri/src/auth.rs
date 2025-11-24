use tauri::{AppHandle, Emitter, Runtime, State};
use tokio::net::TcpListener;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use std::sync::Mutex;
use serde::Serialize;

pub struct AuthState {
    pub server_stop_tx: Mutex<Option<tokio::sync::oneshot::Sender<()>>>,
}

#[derive(Serialize, Clone)]
struct OAuthCallbackPayload {
    token: Option<String>,
    #[serde(rename = "userData")]
    user_data: Option<String>,
}

#[tauri::command]
pub async fn start_oauth_server<R: Runtime>(app: AppHandle<R>, state: State<'_, AuthState>) -> Result<serde_json::Value, String> {
    let mut stop_tx_guard = state.server_stop_tx.lock().unwrap();
    if stop_tx_guard.is_some() {
        return Ok(serde_json::json!({ "success": true, "port": 3000 }));
    }

    let (tx, mut rx) = tokio::sync::oneshot::channel();
    *stop_tx_guard = Some(tx);

    let app_clone = app.clone();
    
    tokio::spawn(async move {
        let listener = match TcpListener::bind("127.0.0.1:3000").await {
            Ok(l) => l,
            Err(e) => {
                eprintln!("Failed to bind to port 3000: {}", e);
                return;
            }
        };

        println!("OAuth server listening on port 3000");

        loop {
            tokio::select! {
                _ = &mut rx => {
                    println!("Stopping OAuth server");
                    break;
                }
                Ok((mut socket, _)) = listener.accept() => {
                    let app = app_clone.clone();
                    tokio::spawn(async move {
                        let mut buf = [0; 4096]; // Increased buffer size
                        let n = match socket.read(&mut buf).await {
                            Ok(n) if n == 0 => return,
                            Ok(n) => n,
                            Err(_) => return,
                        };

                        let request = String::from_utf8_lossy(&buf[..n]);
                        if let Some(line) = request.lines().next() {
                            if line.starts_with("GET /callback") {
                                let url_part = line.split_whitespace().nth(1).unwrap_or("");
                                let query_start = url_part.find('?').unwrap_or(url_part.len());
                                let query = &url_part[query_start..];
                                
                                let mut token = None;
                                let mut user_data = None;

                                if query.starts_with('?') {
                                    for pair in query[1..].split('&') {
                                        let mut parts = pair.splitn(2, '=');
                                        if let (Some(key), Some(value)) = (parts.next(), parts.next()) {
                                            match key {
                                                "token" => token = Some(value.to_string()),
                                                "user" => user_data = Some(value.to_string()),
                                                _ => {}
                                            }
                                        }
                                    }
                                }

                                if token.is_some() || user_data.is_some() {
                                    let _ = app.emit("oauth-callback", OAuthCallbackPayload {
                                        token,
                                        user_data,
                                    });
                                } else {
                                    // Отправляем ошибку если нет данных
                                    let _ = app.emit("oauth-callback", OAuthCallbackPayload {
                                        token: None,
                                        user_data: None,
                                    });
                                }

                                let response_body = r#"
                                    <!DOCTYPE html>
                                    <html>
                                    <head>
                                        <meta charset="utf-8">
                                        <title>ShakeDown Launcher - Авторизация</title>
                                        <style>
                                            body { background: #0a0a0f; color: white; display: flex; justify-content: center; align-items: center; height: 100vh; font-family: sans-serif; }
                                            .container { text-align: center; padding: 40px; background: rgba(255,255,255,0.03); border-radius: 24px; border: 1px solid rgba(138,75,255,0.2); }
                                            h1 { background: linear-gradient(135deg, #8A4BFF 0%, #FF6B9D 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                                        </style>
                                    </head>
                                    <body>
                                        <div class="container">
                                            <h1>Авторизация успешна!</h1>
                                            <p>Вы успешно вошли. Можете закрыть это окно.</p>
                                            <script>setTimeout(() => window.close(), 3000);</script>
                                        </div>
                                    </body>
                                    </html>
                                "#;
                                
                                let response = format!(
                                    "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\n\r\n{}",
                                    response_body.len(),
                                    response_body
                                );
                                let _ = socket.write_all(response.as_bytes()).await;
                            } else {
                                let response = "HTTP/1.1 404 Not Found\r\n\r\n";
                                let _ = socket.write_all(response.as_bytes()).await;
                            }
                        }
                    });
                }
            }
        }
    });

    Ok(serde_json::json!({ "success": true, "port": 3000 }))
}

#[tauri::command]
pub async fn stop_oauth_server(state: State<'_, AuthState>) -> Result<serde_json::Value, String> {
    let mut stop_tx_guard = state.server_stop_tx.lock().unwrap();
    if let Some(tx) = stop_tx_guard.take() {
        let _ = tx.send(());
    }
    Ok(serde_json::json!({ "success": true }))
}
