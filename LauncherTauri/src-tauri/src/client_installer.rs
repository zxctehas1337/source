use std::path::{Path, PathBuf};
use std::fs;
use std::io::Write;
use tauri::{AppHandle, Emitter, Runtime};
use serde::{Deserialize, Serialize};
use reqwest::Client;
use anyhow::{Result, Context};
use futures_util::StreamExt;

const SERVER_URL: &str = "https://oneshakedown.onrender.com";
const LAUNCH_ZIP_URL: &str = "https://github.com/zxctehas1337/1/releases/download/Beta/launch.zip";
const FABRIC_API_URL: &str = "https://cdn.modrinth.com/data/P7dR8mSH/versions/P7uGFii0/fabric-api-0.92.2%2B1.20.1.jar";
const FABRIC_API_VERSION: &str = "0.92.2+1.20.1";
const SODIUM_URL: &str = "https://cdn.modrinth.com/data/AANobbMI/versions/mhZtY2lR/sodium-fabric-0.5.8%2Bmc1.20.1.jar";
const SODIUM_VERSION: &str = "0.5.11+mc1.20.1";
const VIAFABRIC_URL: &str = "https://cdn.modrinth.com/data/YlKdE5VK/versions/n9T0mzox/ViaFabric-0.4.18%2B104-main.jar";
const VIAFABRIC_VERSION: &str = "0.4.18+104-main";

#[derive(Serialize, Clone)]
pub struct InstallProgress {
    pub stage: String,
    pub progress: f64,
    pub message: String,
}

#[derive(Deserialize, Debug)]
pub struct VersionInfo {
    pub version: String,
    #[serde(alias = "downloadUrl", alias = "download_url")]
    pub download_url: String,
    pub changelog: Option<String>,
}

#[derive(Deserialize, Debug)]
struct ApiResponse {
    success: bool,
    data: Option<VersionInfo>,
    message: Option<String>,
}

pub struct ClientInstaller {
    base_dir: PathBuf,
    launch_dir: PathBuf,
    mods_dir: PathBuf,
    client: Client,
}

impl ClientInstaller {
    pub fn new(base_dir: PathBuf) -> Self {
        let launch_dir = base_dir.join("launch");
        // Моды должны быть в папке launch/run/mods
        // gradlew runClient запускается из launch/ и использует run/ как runDir
        let mods_dir = launch_dir.join("run").join("mods");
        
        Self {
            base_dir,
            launch_dir,
            mods_dir,
            client: Client::new(),
        }
    }

    pub fn ensure_directories(&self) -> Result<()> {
        fs::create_dir_all(&self.base_dir)?;
        fs::create_dir_all(&self.launch_dir)?;
        fs::create_dir_all(&self.mods_dir)?;
        println!("✓ Ensured directories exist:");
        println!("  - Base: {:?}", self.base_dir);
        println!("  - Launch: {:?}", self.launch_dir);
        println!("  - Mods: {:?}", self.mods_dir);
        Ok(())
    }

    pub fn get_mods_dir(&self) -> &Path {
        &self.mods_dir
    }

    async fn download_file<R: Runtime>(
        &self,
        url: &str,
        dest: &Path,
        app: &AppHandle<R>,
        stage: &str,
    ) -> Result<()> {
        println!("📥 Скачивание: {} -> {:?}", url, dest);
        
        // Проверяем размер существующего файла
        if dest.exists() {
            if let Ok(metadata) = fs::metadata(dest) {
                let size = metadata.len();
                println!("⚠️  Файл уже существует: {:?} ({} байт)", dest, size);
                
                // Если файл пустой или слишком маленький, удаляем и скачиваем заново
                if size < 1000 {
                    println!("🗑️  Файл слишком маленький, удаляем и скачиваем заново");
                    fs::remove_file(dest)?;
                } else {
                    println!("⏭️  Файл выглядит нормально, пропускаем скачивание");
                    return Ok(());
                }
            }
        }

        if let Some(parent) = dest.parent() {
            fs::create_dir_all(parent)?;
            println!("📁 Создана папка: {:?}", parent);
        }

        let response = self.client.get(url).send().await?;
        let status = response.status();
        println!("📡 Статус скачивания: {}", status);
        
        if !status.is_success() {
            return Err(anyhow::anyhow!("Ошибка скачивания: статус {}", status));
        }
        
        let total_size = response.content_length().unwrap_or(0);
        println!("📦 Размер файла: {} байт ({:.2} MB)", total_size, total_size as f64 / 1024.0 / 1024.0);
        
        let mut downloaded: u64 = 0;
        let mut file = fs::File::create(dest)?;

        let mut stream = response.bytes_stream();

        while let Some(chunk) = stream.next().await {
            let chunk = chunk?;
            file.write_all(&chunk)?;
            downloaded += chunk.len() as u64;

            if total_size > 0 {
                let progress = (downloaded as f64 / total_size as f64) * 100.0;
                let _ = app.emit("client-install-progress", InstallProgress {
                    stage: stage.to_string(),
                    progress,
                    message: format!("Скачивание: {:.1}%", progress),
                });
            }
        }

        println!("✅ Файл скачан: {:?} ({} байт)", dest, downloaded);
        
        // Проверяем, что файл действительно записан
        if let Ok(metadata) = fs::metadata(dest) {
            println!("✓ Проверка: файл на диске {} байт", metadata.len());
            if metadata.len() == 0 {
                return Err(anyhow::anyhow!("Ошибка: скачанный файл пустой!"));
            }
        }
        
        Ok(())
    }

    pub async fn get_latest_version(&self, user_id: Option<i32>) -> Result<VersionInfo> {
        let url = if let Some(uid) = user_id {
            format!("{}/api/client/version?userId={}", SERVER_URL, uid)
        } else {
            format!("{}/api/client/version", SERVER_URL)
        };
        println!("🔍 Запрос версии клиента: {}", url);
        
        let response = self.client.get(&url)
            .send()
            .await
            .context("Не удалось подключиться к серверу")?;
        
        let status = response.status();
        println!("📡 Статус ответа: {}", status);
        
        let response_text = response.text().await
            .context("Не удалось прочитать ответ сервера")?;
        
        println!("📦 Ответ сервера: {}", response_text);
        
        let api_response: ApiResponse = serde_json::from_str(&response_text)
            .context(format!("Ошибка декодирования ответа сервера. Статус: {}, Ответ: {}", status, response_text))?;
        
        if !api_response.success {
            let error_msg = api_response.message.unwrap_or_else(|| "Неизвестная ошибка".to_string());
            return Err(anyhow::anyhow!("Ошибка сервера: {}", error_msg));
        }
        
        let version_info = api_response.data.context("Версия клиента не найдена в ответе сервера")?;
        println!("✅ Получена версия: {} ({})", version_info.version, version_info.download_url);
        
        Ok(version_info)
    }

    pub fn get_current_version(&self) -> Option<String> {
        let version_file = self.base_dir.join("client-version.txt");
        if version_file.exists() {
            fs::read_to_string(version_file).ok().map(|s| s.trim().to_string())
        } else {
            None
        }
    }

    pub fn get_installed_client_version(&self) -> Option<String> {
        // Ищем файл ShakeDown Client в папке модов
        if let Ok(entries) = fs::read_dir(&self.mods_dir) {
            for entry in entries.flatten() {
                let file_name = entry.file_name();
                let name = file_name.to_string_lossy();
                
                if name.to_lowercase().contains("shakedown") || name.to_lowercase().contains("arizon") {
                    // Пытаемся извлечь версию из имени файла
                    // Формат: ShakeDownClient-v1.0.0.jar или arizon-client-1.0.0.jar
                    if let Some(version) = self.extract_version_from_filename(&name) {
                        return Some(version);
                    }
                }
            }
        }
        
        // Если не нашли в имени файла, проверяем сохраненную версию
        self.get_current_version()
    }

    fn extract_version_from_filename(&self, filename: &str) -> Option<String> {
        // Пытаемся найти паттерн версии: v1.0.0 или 1.0.0
        let re = regex::Regex::new(r"v?(\d+\.\d+\.\d+)").ok()?;
        re.captures(filename)
            .and_then(|cap| cap.get(1))
            .map(|m| m.as_str().to_string())
    }

    async fn install_fabric_api<R: Runtime>(&self, app: &AppHandle<R>) -> Result<()> {
        let fabric_api_path = self.mods_dir.join(format!("fabric-api-{}.jar", FABRIC_API_VERSION));
        
        // Проверяем существующие версии
        if let Ok(entries) = fs::read_dir(&self.mods_dir) {
            for entry in entries.flatten() {
                let file_name = entry.file_name();
                let name = file_name.to_string_lossy();
                if name.starts_with("fabric-api-") && name.ends_with(".jar") {
                    let path = entry.path();
                    if path != fabric_api_path {
                        fs::remove_file(path)?;
                    } else {
                        // Уже установлена нужная версия
                        let _ = app.emit("client-install-progress", InstallProgress {
                            stage: "fabric-api".to_string(),
                            progress: 100.0,
                            message: "Fabric API уже установлен".to_string(),
                        });
                        return Ok(());
                    }
                }
            }
        }

        let _ = app.emit("client-install-progress", InstallProgress {
            stage: "fabric-api".to_string(),
            progress: 0.0,
            message: "Скачивание Fabric API...".to_string(),
        });

        self.download_file(FABRIC_API_URL, &fabric_api_path, app, "fabric-api").await?;

        let _ = app.emit("client-install-progress", InstallProgress {
            stage: "fabric-api".to_string(),
            progress: 100.0,
            message: "Fabric API установлен".to_string(),
        });

        Ok(())
    }

    async fn install_sodium<R: Runtime>(&self, app: &AppHandle<R>) -> Result<()> {
        let sodium_path = self.mods_dir.join(format!("sodium-fabric-{}.jar", SODIUM_VERSION));
        
        if let Ok(entries) = fs::read_dir(&self.mods_dir) {
            for entry in entries.flatten() {
                let file_name = entry.file_name();
                let name = file_name.to_string_lossy();
                if name.starts_with("sodium-") && name.ends_with(".jar") {
                    let path = entry.path();
                    if path != sodium_path {
                        fs::remove_file(path)?;
                    } else {
                        let _ = app.emit("client-install-progress", InstallProgress {
                            stage: "sodium".to_string(),
                            progress: 100.0,
                            message: "Sodium уже установлен".to_string(),
                        });
                        return Ok(());
                    }
                }
            }
        }

        let _ = app.emit("client-install-progress", InstallProgress {
            stage: "sodium".to_string(),
            progress: 0.0,
            message: "Скачивание Sodium...".to_string(),
        });

        self.download_file(SODIUM_URL, &sodium_path, app, "sodium").await?;

        let _ = app.emit("client-install-progress", InstallProgress {
            stage: "sodium".to_string(),
            progress: 100.0,
            message: "Sodium установлен".to_string(),
        });

        Ok(())
    }

    async fn install_viafabric<R: Runtime>(&self, app: &AppHandle<R>) -> Result<()> {
        let viafabric_path = self.mods_dir.join(format!("ViaFabric-{}.jar", VIAFABRIC_VERSION));
        
        if let Ok(entries) = fs::read_dir(&self.mods_dir) {
            for entry in entries.flatten() {
                let file_name = entry.file_name();
                let name = file_name.to_string_lossy();
                if name.starts_with("ViaFabric-") && name.ends_with(".jar") {
                    let path = entry.path();
                    if path != viafabric_path {
                        fs::remove_file(path)?;
                    } else {
                        let _ = app.emit("client-install-progress", InstallProgress {
                            stage: "viafabric".to_string(),
                            progress: 100.0,
                            message: "ViaFabric уже установлен".to_string(),
                        });
                        return Ok(());
                    }
                }
            }
        }

        let _ = app.emit("client-install-progress", InstallProgress {
            stage: "viafabric".to_string(),
            progress: 0.0,
            message: "Скачивание ViaFabric...".to_string(),
        });

        match self.download_file(VIAFABRIC_URL, &viafabric_path, app, "viafabric").await {
            Ok(_) => {
                let _ = app.emit("client-install-progress", InstallProgress {
                    stage: "viafabric".to_string(),
                    progress: 100.0,
                    message: "ViaFabric установлен".to_string(),
                });
                Ok(())
            }
            Err(e) => {
                eprintln!("Ошибка установки ViaFabric: {}", e);
                let _ = app.emit("client-install-progress", InstallProgress {
                    stage: "viafabric".to_string(),
                    progress: 100.0,
                    message: "ViaFabric пропущен (ошибка)".to_string(),
                });
                Ok(()) // Продолжаем без ViaFabric
            }
        }
    }

    async fn install_shakedown_client<R: Runtime>(&self, app: &AppHandle<R>, user_id: Option<i32>) -> Result<()> {
        let _ = app.emit("client-install-progress", InstallProgress {
            stage: "client-info".to_string(),
            progress: 0.0,
            message: "Проверка версии клиента...".to_string(),
        });

        let version_info = self.get_latest_version(user_id).await?;
        let current_version = self.get_current_version();

        // Проверяем, установлен ли клиент в папке mods (только JAR файлы)
        let client_exists_in_mods = if let Ok(entries) = fs::read_dir(&self.mods_dir) {
            entries.flatten().any(|entry| {
                let name = entry.file_name().to_string_lossy().to_lowercase();
                name.ends_with(".jar") && (name.contains("shakedown") || name.contains("arizon"))
            })
        } else {
            false
        };

        if current_version.as_ref() == Some(&version_info.version) && client_exists_in_mods {
            let _ = app.emit("client-install-progress", InstallProgress {
                stage: "client".to_string(),
                progress: 100.0,
                message: format!("Клиент актуален ({})", version_info.version),
            });
            return Ok(());
        }

        let _ = app.emit("client-install-progress", InstallProgress {
            stage: "client".to_string(),
            progress: 0.0,
            message: format!("Скачивание клиента {}...", version_info.version),
        });

        println!("📦 Installing ShakeDown client to: {:?}", self.mods_dir);
        println!("📦 Mods directory exists: {}", self.mods_dir.exists());
        
        // Убеждаемся, что папка mods существует
        if !self.mods_dir.exists() {
            fs::create_dir_all(&self.mods_dir)?;
            println!("✓ Created mods directory: {:?}", self.mods_dir);
        }

        // Удаляем старые версии и распакованные файлы
        println!("🔍 Checking for old client versions...");
        if let Ok(entries) = fs::read_dir(&self.mods_dir) {
            for entry in entries.flatten() {
                let file_name = entry.file_name();
                let name = file_name.to_string_lossy().to_lowercase();
                let path = entry.path();
                
                // Удаляем старые JAR файлы клиента
                if name.ends_with(".jar") && (name.contains("shakedown") || name.contains("arizon")) {
                    println!("🗑️  Removing old client JAR: {:?}", path);
                    fs::remove_file(path)?;
                }
                // Удаляем распакованные файлы клиента (папки и файлы конфигурации)
                else if name.contains("arizon") || name == "com" || name == "meta-inf" {
                    println!("🗑️  Removing unpacked client files: {:?}", path);
                    if path.is_dir() {
                        fs::remove_dir_all(path)?;
                    } else {
                        fs::remove_file(path)?;
                    }
                }
            }
        }

        // Определяем имя файла из URL или используем версию
        let default_filename = format!("arizon-client-{}.jar", version_info.version);
        let client_filename = version_info.download_url
            .split('/')
            .last()
            .unwrap_or(&default_filename);
        
        let client_jar_path = self.mods_dir.join(client_filename);
        
        println!("📥 Target path: {:?}", client_jar_path);
        println!("📥 Download URL: {}", version_info.download_url);
        
        // Скачиваем JAR-файл напрямую в папку mods
        self.download_file(&version_info.download_url, &client_jar_path, app, "client").await?;
        
        println!("✓ Downloaded client JAR to: {:?}", client_jar_path);
        
        // Проверяем, что файл действительно существует
        if client_jar_path.exists() {
            if let Ok(metadata) = fs::metadata(&client_jar_path) {
                println!("✓ File verified: {} bytes", metadata.len());
            }
        } else {
            println!("❌ ERROR: File does not exist after download!");
            return Err(anyhow::anyhow!("Client file not found after download"));
        }

        // Сохраняем версию
        let version_file = self.base_dir.join("client-version.txt");
        fs::write(version_file, &version_info.version)?;
        
        println!("✓ ShakeDown client {} installed successfully", version_info.version);

        let _ = app.emit("client-install-progress", InstallProgress {
            stage: "client".to_string(),
            progress: 100.0,
            message: format!("Клиент {} установлен", version_info.version),
        });

        Ok(())
    }

    async fn install_launch_files<R: Runtime>(&self, app: &AppHandle<R>) -> Result<()> {
        let _ = app.emit("client-install-progress", InstallProgress {
            stage: "launch".to_string(),
            progress: 0.0,
            message: "Скачивание, пожалуйста подождите...".to_string(),
        });

        let launch_zip_path = self.base_dir.join("launch.zip");
        
        // Проверяем, установлены ли уже launch файлы
        let gradlew_exists = if cfg!(target_os = "windows") {
            self.launch_dir.join("gradlew.bat").exists()
        } else {
            self.launch_dir.join("gradlew").exists()
        };
        
        if gradlew_exists {
            let _ = app.emit("client-install-progress", InstallProgress {
                stage: "launch".to_string(),
                progress: 100.0,
                message: "Файлы уже установлены".to_string(),
            });
            return Ok(());
        }

        // Скачиваем launch.zip
        self.download_file(LAUNCH_ZIP_URL, &launch_zip_path, app, "launch").await?;

        let _ = app.emit("client-install-progress", InstallProgress {
            stage: "launch".to_string(),
            progress: 70.0,
            message: "Ещё чуть-чуть...".to_string(),
        });

        // Распаковываем во временную директорию
        let temp_extract_dir = self.base_dir.join("temp_launch");
        if temp_extract_dir.exists() {
            fs::remove_dir_all(&temp_extract_dir)?;
        }
        fs::create_dir_all(&temp_extract_dir)?;
        
        let file = fs::File::open(&launch_zip_path)?;
        let mut archive = zip::ZipArchive::new(file)?;
        archive.extract(&temp_extract_dir)?;
        
        println!("📦 Extracted launch.zip to temp directory");

        // Ищем папку с файлами (может быть launchMode или другая)
        let mut source_dir = None;
        if let Ok(entries) = fs::read_dir(&temp_extract_dir) {
            for entry in entries.flatten() {
                if entry.path().is_dir() {
                    // Проверяем, есть ли в этой папке gradlew файлы
                    let potential_gradlew = if cfg!(target_os = "windows") {
                        entry.path().join("gradlew.bat")
                    } else {
                        entry.path().join("gradlew")
                    };
                    
                    if potential_gradlew.exists() {
                        source_dir = Some(entry.path());
                        println!("✓ Found gradlew in: {:?}", entry.path());
                        break;
                    }
                }
            }
        }
        
        // Если не нашли подпапку, используем саму temp директорию
        let source = source_dir.unwrap_or(temp_extract_dir.clone());
        
        println!("📁 Copying launch files from: {:?}", source);
        println!("📁 Copying launch files to: {:?}", self.launch_dir);
        println!("⚠️  Skipping 'run' directory to preserve mods");
        
        // Копируем файлы из source в launch_dir
        self.copy_dir_contents(&source, &self.launch_dir)?;
        
        // Удаляем временные файлы
        fs::remove_dir_all(temp_extract_dir)?;
        fs::remove_file(launch_zip_path)?;
        
        // Устанавливаем права на выполнение для gradlew на Unix системах
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let gradlew_path = self.launch_dir.join("gradlew");
            if gradlew_path.exists() {
                let mut perms = fs::metadata(&gradlew_path)?.permissions();
                perms.set_mode(0o755);
                fs::set_permissions(&gradlew_path, perms)?;
            }
        }

        let _ = app.emit("client-install-progress", InstallProgress {
            stage: "launch".to_string(),
            progress: 100.0,
            message: "Файлы установлены".to_string(),
        });

        Ok(())
    }
    
    fn copy_dir_contents(&self, src: &Path, dst: &Path) -> Result<()> {
        if !dst.exists() {
            fs::create_dir_all(dst)?;
        }
        
        for entry in fs::read_dir(src)? {
            let entry = entry?;
            let src_path = entry.path();
            let file_name = entry.file_name();
            
            // Skip the 'run' directory completely - we manage it separately for mods
            if file_name == "run" {
                println!("⏭️  Skipping 'run' directory from launch.zip");
                continue;
            }
            
            let dst_path = dst.join(&file_name);
            
            if src_path.is_dir() {
                self.copy_dir_contents(&src_path, &dst_path)?;
            } else {
                fs::copy(&src_path, &dst_path)?;
            }
        }
        
        Ok(())
    }

    pub async fn install_all_mods<R: Runtime>(&self, app: &AppHandle<R>, user_id: Option<i32>) -> Result<()> {
        self.ensure_directories()?;

        let _ = app.emit("client-install-progress", InstallProgress {
            stage: "init".to_string(),
            progress: 0.0,
            message: "Подготовка к установке...".to_string(),
        });

        // Сначала устанавливаем launch файлы (gradlew и т.д.)
        self.install_launch_files(app).await?;
        
        // Затем устанавливаем моды
        self.install_fabric_api(app).await?;
        self.install_sodium(app).await?;
        self.install_viafabric(app).await?;
        self.install_shakedown_client(app, user_id).await?;

        let _ = app.emit("client-install-progress", InstallProgress {
            stage: "complete".to_string(),
            progress: 100.0,
            message: "Установка завершена".to_string(),
        });

        Ok(())
    }

    pub fn check_mods_installed(&self) -> bool {
        // Проверяем наличие launch файлов
        let gradlew_exists = if cfg!(target_os = "windows") {
            self.launch_dir.join("gradlew.bat").exists()
        } else {
            self.launch_dir.join("gradlew").exists()
        };
        
        if !gradlew_exists {
            return false;
        }
        
        // Проверяем наличие папки mods
        if !self.mods_dir.exists() {
            return false;
        }

        let required_mods = ["fabric-api", "sodium", "shakedown"];
        let mut found_mods = vec![false; required_mods.len()];

        if let Ok(entries) = fs::read_dir(&self.mods_dir) {
            for entry in entries.flatten() {
                let file_name = entry.file_name();
                let name = file_name.to_string_lossy().to_lowercase();
                
                // Проверяем только JAR файлы
                if !name.ends_with(".jar") {
                    continue;
                }
                
                for (i, mod_name) in required_mods.iter().enumerate() {
                    if name.contains(mod_name) || (mod_name == &"shakedown" && name.contains("arizon")) {
                        found_mods[i] = true;
                    }
                }
            }
        }

        // Все необходимые моды должны быть установлены
        found_mods.iter().all(|&found| found)
    }
}

