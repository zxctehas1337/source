import { useState, useEffect } from 'react'
import '../styles/SettingsPage.css'

export default function SettingsPage() {
  const [ramAllocation, setRamAllocation] = useState(4096)
  const [installPath, setInstallPath] = useState('C:\\ShakeDown\\minecraft\\java\\bin\\javaw.exe')
  const [autoUpdate, setAutoUpdate] = useState(true)
  const [interfaceSounds, setInterfaceSounds] = useState(true)
  const [language, setLanguage] = useState('ru')

  const handleBrowse = async () => {
    if (!window.electron) return
    
    try {
      const result = await window.electron.selectFolder()
      if (result) {
        setInstallPath(result)
        localStorage.setItem('javaPath', result)
      }
    } catch (error) {
      console.error('Failed to select folder:', error)
      alert('Не удалось открыть диалог выбора папки')
    }
  }

  const handleOpenMinecraftFolder = async () => {
    if (!window.electron) return
    
    try {
      const dir = await window.electron.getMinecraftDir()
      await window.electron.openExternal(`file:///${dir}`)
    } catch (error) {
      console.error('Failed to open Minecraft folder:', error)
    }
  }

  const handleOpenModsFolder = async () => {
    if (!window.electron) return
    
    try {
      await window.electron.openModsFolder()
    } catch (error) {
      console.error('Failed to open mods folder:', error)
    }
  }

  useEffect(() => {
    // Загружаем настройки из localStorage
    const savedJavaPath = localStorage.getItem('javaPath')
    if (savedJavaPath) {
      setInstallPath(savedJavaPath)
    }
    
    const savedSettings = localStorage.getItem('settings')
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings)
        setRamAllocation(settings.ramAllocation || 4096)
        if (!savedJavaPath) {
          setInstallPath(settings.installPath || 'C:\\ShakeDown\\minecraft\\java\\bin\\javaw.exe')
        }
        setAutoUpdate(settings.autoUpdate !== false)
        setInterfaceSounds(settings.interfaceSounds !== false)
        setLanguage(settings.language || 'ru')
      } catch (e) {
        console.error('Failed to load settings:', e)
      }
    }
  }, [])

  useEffect(() => {
    // Автосохранение настроек при изменении
    const settings = {
      ramAllocation,
      installPath,
      autoUpdate,
      interfaceSounds,
      language
    }
    localStorage.setItem('settings', JSON.stringify(settings))
  }, [ramAllocation, installPath, autoUpdate, interfaceSounds, language])

  const saveSettings = () => {
    const settings = {
      ramAllocation,
      installPath,
      autoUpdate,
      interfaceSounds,
      language
    }
    localStorage.setItem('settings', JSON.stringify(settings))
    localStorage.setItem('javaPath', installPath)
    alert('Настройки сохранены!')
  }

  return (
    <div className="page settings-page">
      <div className="page-header">
        <h1>Настройки</h1>
        <p>Конфигурация лаунчера и игры</p>
      </div>

      <div className="settings-grid">
        <div className="settings-section">
          <h3>Java</h3>
          
          <div className="setting-item">
            <label className="installation-label">Путь к Java:</label>
            <div className="path-input">
              <input 
                type="text" 
                value={installPath} 
                onChange={(e) => setInstallPath(e.target.value)}
              />
              <button className="browse-btn" onClick={handleBrowse}>Обзор</button>
            </div>
          </div>

          <div className="setting-item">
            <label>Выделение RAM:</label>
            <div className="ram-slider">
              <input 
                type="range" 
                min="1024" 
                max="16384" 
                step="512" 
                value={ramAllocation}
                onChange={(e) => setRamAllocation(Number(e.target.value))}
              />
              <span className="ram-value">{(ramAllocation / 1024).toFixed(1)} GB</span>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h3>Лаунчер</h3>
          
          <div className="setting-item">
            <label>Автообновление:</label>
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={autoUpdate}
                onChange={(e) => setAutoUpdate(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="setting-item">
            <label>Язык:</label>
            <select 
              value={language} 
              onChange={(e) => setLanguage(e.target.value)}
              className="language-select"
            >
              <option value="ru">Русский</option>
              <option value="en">English</option>
              <option value="uk">Українська</option>
            </select>
          </div>

          <div className="setting-item">
            <label>Обновления:</label>
            <button 
              className="btn-check-updates"
              onClick={async () => {
                if (window.electron?.checkForUpdates) {
                  const result = await window.electron.checkForUpdates()
                  if (result.success) {
                    alert('Проверка обновлений запущена!')
                  } else {
                    alert('Ошибка проверки обновлений: ' + result.error)
                  }
                }
              }}
            >
              Проверить обновления
            </button>
          </div>
        </div>

        <div className="settings-section">
          <h3>Minecraft</h3>
          
          <div className="setting-item">
            <label>Папка игры:</label>
            <button className="btn-folder" onClick={handleOpenMinecraftFolder}>
              Открыть папку Minecraft
            </button>
          </div>

          <div className="setting-item">
            <label>Моды:</label>
            <button className="btn-folder" onClick={handleOpenModsFolder}>
              Открыть папку модов
            </button>
          </div>
        </div>
      </div>

      <div className="settings-actions">
        <button className="btn-save" onClick={saveSettings}>
          Сохранить настройки
        </button>
      </div>
    </div>
  )
}
