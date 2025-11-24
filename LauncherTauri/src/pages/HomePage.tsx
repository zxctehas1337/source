import { useState, useEffect } from 'react'
import type { User } from '../types'
import '../styles/HomePage.css'

interface HomePageProps {
  user: User
}

interface LaunchProgress {
  stage: string
  progress: number
  current?: string
  message?: string
}

export default function HomePage({ user }: HomePageProps) {
  const [isLaunching, setIsLaunching] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [modInstalled, setModInstalled] = useState(false)
  const [modVersion, setModVersion] = useState<string | null>(null)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [latestVersion, setLatestVersion] = useState<string | null>(null)
  const [progress, setProgress] = useState<LaunchProgress | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [showLogs, setShowLogs] = useState(false)
  const [isMinecraftLoading, setIsMinecraftLoading] = useState(false)

  useEffect(() => {
    if (!window.electron) return

    // Проверяем установлен ли клиент
    const checkInstallation = async () => {
      if (window.electron) {
        const result = await window.electron.checkClientInstalled()
        console.log('🔍 Проверка установки клиента:', result)
        setIsInstalled(result.installed)

        // Проверяем установлен ли мод через IPC
        if (result.installed) {
          try {
            const modCheck = await window.electron.checkModInstalled() as { installed: boolean; version: string | null }
            console.log('🔍 Проверка установки мода:', modCheck)
            setModInstalled(modCheck.installed || false)
            setModVersion(modCheck.version || null)

            // Проверяем наличие обновлений
            if (modCheck.installed && modCheck.version) {
              const updateCheck = await (window.electron as any).checkClientUpdate() as { success: boolean; data?: any; error?: string }
              console.log('🔍 Проверка обновлений чита:', updateCheck)

              if (updateCheck.success && updateCheck.data) {
                setLatestVersion(updateCheck.data.version)
                // Сравниваем версии
                if (updateCheck.data.version !== modCheck.version) {
                  setUpdateAvailable(true)
                  console.log(`📦 Доступно обновление: ${modCheck.version} -> ${updateCheck.data.version}`)
                }
              }
            }
          } catch (e) {
            console.error('❌ Ошибка проверки мода:', e)
            setModInstalled(false)
          }
        }
      }
    }
    checkInstallation()

    const handleProgress = (_: any, data: LaunchProgress) => {
      setProgress(data)
    }

    const handleLog = (_: any, data: any) => {
      const log = typeof data === 'string' ? data : data.message
      setLogs(prev => [...prev.slice(-50), log])
    }

    const handleInstallProgress = (_: any, data: LaunchProgress) => {
      setProgress(data)
    }

    const handleMinecraftLoading = (_: any, data: any) => {
      console.log('🎮 Minecraft loading event:', data)
      setIsMinecraftLoading(data.loading)
      if (data.loading) {
        setShowLogs(true) // Автоматически показываем логи
        // Через 60 секунд скрываем индикатор загрузки
        setTimeout(() => {
          setIsMinecraftLoading(false)
          setIsLaunching(false)
        }, 60000)
      }
    }

    window.electron.ipcRenderer.on('minecraft-progress', handleProgress)
    window.electron.ipcRenderer.on('minecraft-log', handleLog)
    window.electron.ipcRenderer.on('client-install-progress', handleInstallProgress)
    window.electron.ipcRenderer.on('minecraft-loading', handleMinecraftLoading)

    return () => {
      window.electron?.ipcRenderer.removeListener('minecraft-progress', handleProgress)
      window.electron?.ipcRenderer.removeListener('minecraft-log', handleLog)
      window.electron?.ipcRenderer.removeListener('client-install-progress', handleInstallProgress)
      window.electron?.ipcRenderer.removeListener('minecraft-loading', handleMinecraftLoading)
    }
  }, [])

  const handleInstall = async () => {
    if (!window.electron) return

    setIsInstalling(true)
    setProgress({ stage: 'creating-folders', progress: 0, message: 'Создание папок...' })
    setLogs([])

    try {
      const result = await window.electron.installClient()

      if (result.success) {
        setIsInstalled(true)
        setProgress({ stage: 'complete', progress: 100, message: 'Установка завершена!' })
        setTimeout(() => {
          setIsInstalling(false)
          setProgress(null)
        }, 2000)
      } else {
        alert(`Ошибка установки: ${result.error}`)
        setIsInstalling(false)
        setProgress(null)
      }
    } catch (error) {
      console.error('Ошибка установки:', error)
      alert('Не удалось установить клиент')
      setIsInstalling(false)
      setProgress(null)
    }
  }

  const handleLaunch = async () => {
    if (!window.electron) return

    // Если клиент не установлен, запускаем установку
    if (!isInstalled) {
      await handleInstall()
      // После установки запускаем игру
      if (!isInstalled) return
    }

    setIsLaunching(true)
    setProgress({ stage: 'launching', progress: 0, message: 'Запуск игры...' })
    setLogs([])

    try {
      const javaPath = localStorage.getItem('javaPath') || undefined
      const result = await window.electron.launchClient({
        username: user.username,
        javaPath
      })

      if (result.success) {
        // Не скрываем прогресс сразу - ждем пока Minecraft загрузится
        setProgress({ stage: 'loading', progress: 50, message: 'Minecraft загружается...' })
        // isLaunching будет сброшен через событие minecraft-loading или таймаут
      } else {
        alert(`Ошибка запуска: ${result.error}`)
        setIsLaunching(false)
        setProgress(null)
      }
    } catch (error) {
      console.error('Ошибка запуска игры:', error)
      alert(`Не удалось запустить игру: ${error}`)
      setIsLaunching(false)
      setProgress(null)
    }
  }



  const getStageText = (stage: string, message?: string) => {
    if (message) return message

    const stages: Record<string, string> = {
      'init': 'Инициализация...',
      'creating-folders': 'Создание папок...',
      'downloading': 'Скачивание клиента...',
      'extracting': 'Распаковка файлов...',
      'complete': 'Установка завершена!',
      'fabric-json': 'Загрузка Fabric Loader...',
      'minecraft-jar': 'Загрузка Minecraft...',
      'libraries': 'Загрузка библиотек...',
      'asset-index': 'Загрузка индекса ресурсов...',
      'assets': 'Загрузка ресурсов...',
      'launching': 'Запуск игры...',
      'loading': 'Minecraft загружается, пожалуйста подождите...',
      'running': ''
    }
    return stages[stage] || stage
  }

  return (
    <div className="page home-page">
      <div className="home-center">
        <div className="home-logo">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="url(#gradient1)" />
            <path d="M2 17L12 22L22 17V7L12 12L2 7V17Z" fill="url(#gradient2)" />
            <defs>
              <linearGradient id="gradient1" x1="2" y1="2" x2="22" y2="12">
                <stop offset="0%" stopColor="#8A4BFF" />
                <stop offset="100%" stopColor="#FF6B9D" />
              </linearGradient>
              <linearGradient id="gradient2" x1="2" y1="7" x2="22" y2="22">
                <stop offset="0%" stopColor="#6C37D7" />
                <stop offset="100%" stopColor="#8A4BFF" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <h1 className="home-title">ShakeDown Client</h1>
        <p className="home-version">Minecraft 1.20.1</p>

        {isInstalled && (
          <div className="mod-status">
            <div className={`status-indicator ${modInstalled ? 'status-active' : 'status-inactive'}`}>
              <span className="status-dot"></span>
              {modInstalled ? (
                <>
                  Чит установлен
                  {modVersion && <span className="mod-version"> v{modVersion}</span>}
                </>
              ) : (
                'Чит не найден'
              )}
            </div>
            {updateAvailable && latestVersion && (
              <div className="update-available">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2V10M8 10L5 7M8 10L11 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M3 14H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                Доступно обновление: v{latestVersion}
              </div>
            )}
            {!modInstalled && (
              <p className="status-hint">
              </p>
            )}
          </div>
        )}

        {(progress || isMinecraftLoading) && (
          <div className="launch-progress">
            <div className="progress-stage">
              {isMinecraftLoading ? 'Minecraft загружается...' : getStageText(progress?.stage || '', progress?.message)}
            </div>
            {isMinecraftLoading && (
              <div className="progress-text" style={{ color: '#ffa500', marginTop: '8px' }}>
                <span style={{ fontSize: '0.9em', opacity: 0.8 }}></span>
              </div>
            )}
            {!isMinecraftLoading && progress && (
              <>
                <div className="progress-text">{progress.message || getStageText(progress.stage)}</div>
                {progress.current && (
                  <div className="progress-current">{progress.current}</div>
                )}
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${progress.progress}%` }}
                  />
                </div>
                <div className="progress-percent">{Math.round(progress.progress)}%</div>
              </>
            )}
            {isMinecraftLoading && (
              <div className="progress-bar">
                <div
                  className="progress-fill progress-fill-animated"
                  style={{ width: '100%' }}
                />
              </div>
            )}
          </div>
        )}

        <div className="home-actions">
          <button
            className="home-launch-btn"
            onClick={handleLaunch}
            disabled={isLaunching || isInstalling}
          >
            {isLaunching || isInstalling ? (
              <>
                <div className="spinner" />
                {isInstalling ? 'Установка...' : 'Запуск...'}
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M5 4.5L15 10L5 15.5V4.5Z" fill="currentColor" />
                </svg>
                {isInstalled ? 'Запустить' : 'Установить и запустить'}
              </>
            )}
          </button>
        </div>

        {logs.length > 0 && (
          <div className="logs-section">
            <button
              className="logs-toggle"
              onClick={() => setShowLogs(!showLogs)}
            >
              {showLogs ? '▼' : '▶'} Логи ({logs.length})
            </button>
            {showLogs && (
              <div className="logs-container">
                {logs.map((log, i) => (
                  <div key={i} className="log-line">{log}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
