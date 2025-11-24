use std::path::PathBuf;
use std::process::Command;
use std::fs;
use tauri::{AppHandle, Emitter, Runtime, Manager};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct LaunchOptions {
    pub username: String,
    pub java_path: Option<String>,
}

#[derive(Serialize, Clone)]
struct ProgressEvent {
    stage: String,
    progress: f64,
    current: Option<String>,
}

#[derive(Serialize, Clone)]
struct LogEvent {
    message: String,
}

pub struct MinecraftLauncher {
    base_dir: PathBuf,
    launch_dir: PathBuf,
}

impl MinecraftLauncher {
    pub fn new(app_dir: PathBuf) -> Self {
        let launch_dir = app_dir.join("launch");

        Self {
            base_dir: app_dir,
            launch_dir,
        }
    }

    pub fn ensure_directories(&self) -> std::io::Result<()> {
        fs::create_dir_all(&self.base_dir)?;
        fs::create_dir_all(&self.launch_dir)?;
        Ok(())
    }
    
    pub fn get_launch_dir(&self) -> PathBuf {
        self.launch_dir.clone()
    }
    
    fn fix_gui_scale<R: Runtime>(&self, app: &AppHandle<R>) -> std::io::Result<()> {
        let options_path = self.launch_dir.join("run").join("options.txt");
        
        if options_path.exists() {
            let content = fs::read_to_string(&options_path)?;
            
            // Проверяем, нужно ли исправлять guiScale
            // Если guiScale:0 (Auto) или отсутствует, ставим 2 (Normal)
            if !content.contains("guiScale:2") {
                let new_content = if content.contains("guiScale:") {
                    content
                        .lines()
                        .map(|line| {
                            if line.starts_with("guiScale:") {
                                "guiScale:2".to_string()
                            } else {
                                line.to_string()
                            }
                        })
                        .collect::<Vec<_>>()
                        .join("\n")
                } else {
                    format!("{}\nguiScale:2", content)
                };
                
                fs::write(&options_path, new_content)?;
                let _ = app.emit("minecraft-log", LogEvent { 
                    message: "GUI scale fixed to Normal (2)".into() 
                });
            }
        }
        
        Ok(())
    }

    pub async fn launch<R: Runtime>(&self, options: LaunchOptions, app: AppHandle<R>) -> anyhow::Result<()> {
        self.ensure_directories()?;
        
        app.emit("minecraft-progress", ProgressEvent { stage: "init".into(), progress: 0.0, current: None })?;
        app.emit("minecraft-log", LogEvent { message: "Starting launch sequence...".into() })?;

        // Проверяем наличие launch директории с gradlew
        let gradlew_cmd = if cfg!(target_os = "windows") {
            self.launch_dir.join("gradlew.bat")
        } else {
            self.launch_dir.join("gradlew")
        };
        
        if !gradlew_cmd.exists() {
            let error_msg = "Launch files not found. Please install the client first.".to_string();
            app.emit("minecraft-log", LogEvent { message: error_msg.clone() })?;
            return Err(anyhow::anyhow!(error_msg));
        }
        
        // Исправляем GUI scale в options.txt перед запуском
        self.fix_gui_scale(&app)?;
        
        app.emit("minecraft-log", LogEvent { message: format!("Using gradlew: {}", gradlew_cmd.display()) })?;
        app.emit("minecraft-progress", ProgressEvent { stage: "launching".into(), progress: 50.0, current: None })?;
        
        // Создаем команду для запуска
        let mut cmd = Command::new(&gradlew_cmd);
        cmd.arg("runClient");
        cmd.current_dir(&self.launch_dir);
        
        // Скрываем консоль на Windows
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            cmd.creation_flags(CREATE_NO_WINDOW);
        }
        
        // Устанавливаем переменные окружения для Minecraft
        cmd.env("MINECRAFT_USERNAME", &options.username);
        
        app.emit("minecraft-log", LogEvent { message: format!("Username: {}", options.username) })?;
        app.emit("minecraft-log", LogEvent { message: "Launching Minecraft with gradlew runClient...".into() })?;
        app.emit("minecraft-progress", ProgressEvent { stage: "launching".into(), progress: 100.0, current: None })?;
        
        // Запускаем Minecraft через gradlew
        app.emit("minecraft-log", LogEvent { message: "Starting Gradle...".into() })?;
        app.emit("minecraft-log", LogEvent { message: "⏳ Minecraft is loading, please wait...".into() })?;
        app.emit("minecraft-log", LogEvent { message: "This may take 30-60 seconds on first launch".into() })?;
        
        match cmd.spawn() {
            Ok(_) => {
                app.emit("minecraft-log", LogEvent { message: "✓ Gradle process started!".into() })?;
                app.emit("minecraft-log", LogEvent { message: "⏳ Compiling and launching Minecraft...".into() })?;
                app.emit("minecraft-log", LogEvent { message: "The game window will appear shortly".into() })?;
                
                // Отправляем специальное событие для UI, чтобы показать длительный процесс
                app.emit("minecraft-loading", serde_json::json!({ "loading": true }))?;
            }
            Err(e) => {
                let error_msg = format!("✗ Failed to launch Minecraft: {}. Check if Java is installed.", e);
                app.emit("minecraft-log", LogEvent { message: error_msg.clone() })?;
                return Err(anyhow::anyhow!(error_msg));
            }
        }
        
        Ok(())
    }
}

#[tauri::command]
pub async fn launch_minecraft<R: Runtime>(app: AppHandle<R>, options: LaunchOptions) -> Result<serde_json::Value, String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let launcher = MinecraftLauncher::new(app_dir);
    
    launcher.launch(options, app).await.map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "success": true }))
}

#[tauri::command]
pub async fn get_launch_dir<R: Runtime>(app: AppHandle<R>) -> Result<String, String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let launcher = MinecraftLauncher::new(app_dir);
    Ok(launcher.get_launch_dir().to_string_lossy().to_string())
}

#[tauri::command]
pub async fn open_launch_folder<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let launcher = MinecraftLauncher::new(app_dir);
    let launch_dir = launcher.get_launch_dir();
    
    if !launch_dir.exists() {
        fs::create_dir_all(&launch_dir).map_err(|e| e.to_string())?;
    }
    
    #[cfg(target_os = "windows")]
    Command::new("explorer").arg(&launch_dir).spawn().map_err(|e| e.to_string())?;
    
    #[cfg(target_os = "linux")]
    Command::new("xdg-open").arg(&launch_dir).spawn().map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub async fn check_mods_installed<R: Runtime>(app: AppHandle<R>) -> Result<serde_json::Value, String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let installer = crate::client_installer::ClientInstaller::new(app_dir);
    
    let installed = installer.check_mods_installed();
    let version = installer.get_installed_client_version();
    
    Ok(serde_json::json!({
        "installed": installed,
        "version": version
    }))
}

#[tauri::command]
pub async fn check_client_updates<R: Runtime>(app: AppHandle<R>, user_id: Option<i32>) -> Result<serde_json::Value, String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let installer = crate::client_installer::ClientInstaller::new(app_dir);
    
    match installer.get_latest_version(user_id).await {
        Ok(version_info) => {
            let current_version = installer.get_installed_client_version();
            let has_update = current_version.as_ref() != Some(&version_info.version);
            
            Ok(serde_json::json!({
                "success": true,
                "data": {
                    "version": version_info.version,
                    "hasUpdate": has_update,
                    "currentVersion": current_version,
                    "changelog": version_info.changelog
                }
            }))
        }
        Err(e) => {
            Ok(serde_json::json!({
                "success": false,
                "error": e.to_string()
            }))
        }
    }
}

#[tauri::command]
pub async fn install_mods<R: Runtime>(app: AppHandle<R>, user_id: Option<i32>) -> Result<serde_json::Value, String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let installer = crate::client_installer::ClientInstaller::new(app_dir);
    
    match installer.install_all_mods(&app, user_id).await {
        Ok(_) => Ok(serde_json::json!({
            "success": true
        })),
        Err(e) => Ok(serde_json::json!({
            "success": false,
            "error": e.to_string()
        }))
    }
}

#[tauri::command]
pub async fn get_client_dirs<R: Runtime>(app: AppHandle<R>) -> Result<serde_json::Value, String> {
     let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
     let launcher = MinecraftLauncher::new(app_dir.clone());
     let installer = crate::client_installer::ClientInstaller::new(app_dir);
     
     Ok(serde_json::json!({
         "launch": launcher.get_launch_dir(),
         "mods": installer.get_mods_dir()
     }))
}

#[tauri::command]
pub async fn list_mods_folder<R: Runtime>(app: AppHandle<R>) -> Result<serde_json::Value, String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let installer = crate::client_installer::ClientInstaller::new(app_dir);
    let mods_dir = installer.get_mods_dir();
    
    let mut files = Vec::new();
    
    if mods_dir.exists() {
        if let Ok(entries) = fs::read_dir(mods_dir) {
            for entry in entries.flatten() {
                if let Ok(metadata) = entry.metadata() {
                    files.push(serde_json::json!({
                        "name": entry.file_name().to_string_lossy().to_string(),
                        "size": metadata.len(),
                        "is_file": metadata.is_file()
                    }));
                }
            }
        }
    }
    
    Ok(serde_json::json!({
        "path": mods_dir,
        "exists": mods_dir.exists(),
        "files": files
    }))
}
