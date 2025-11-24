import '../styles/TitleBar.css'

export default function TitleBar() {
  const handleMinimize = async () => {
    try {
      console.log('🔽 Сворачивание окна...')
      if (window.electron?.minimize) {
        await window.electron.minimize()
        console.log('✅ Окно свернуто')
      } else {
        console.error('❌ window.electron.minimize не доступен')
      }
    } catch (error) {
      console.error('❌ Ошибка сворачивания окна:', error)
    }
  }

  const handleClose = async () => {
    try {
      console.log('❌ Закрытие окна...')
      if (window.electron?.close) {
        await window.electron.close()
        console.log('✅ Окно закрыто')
      } else {
        console.error('❌ window.electron.close не доступен')
      }
    } catch (error) {
      console.error('❌ Ошибка закрытия окна:', error)
    }
  }

  return (
    <div className="titlebar" data-tauri-drag-region>
      <div className="titlebar-left" data-tauri-drag-region>
        <svg className="app-logo-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="url(#gradient1)"/>
          <path d="M2 17L12 22L22 17V7L12 12L2 7V17Z" fill="url(#gradient2)"/>
          <defs>
            <linearGradient id="gradient1" x1="2" y1="2" x2="22" y2="12">
              <stop offset="0%" stopColor="#8A4BFF"/>
              <stop offset="100%" stopColor="#FF6B9D"/>
            </linearGradient>
            <linearGradient id="gradient2" x1="2" y1="7" x2="22" y2="22">
              <stop offset="0%" stopColor="#6C37D7"/>
              <stop offset="100%" stopColor="#8A4BFF"/>
            </linearGradient>
          </defs>
        </svg>
        <div className="app-logo">ShakeDown</div>
        <div className="app-version">v3.1.9</div>
      </div>
      <div className="titlebar-right">
        <button className="title-btn" onClick={handleMinimize} title="Свернуть">
          <svg width="10" height="2" viewBox="0 0 14 2" fill="currentColor">
            <rect width="14" height="2"/>
          </svg>
        </button>
        <button className="title-btn close-btn" onClick={handleClose} title="Закрыть">
          <svg width="10" height="10" viewBox="0 0 14 14" fill="currentColor">
            <path d="M14 1.41L12.59 0L7 5.59L1.41 0L0 1.41L5.59 7L0 12.59L1.41 14L7 8.41L12.59 14L14 12.59L8.41 7L14 1.41Z"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
