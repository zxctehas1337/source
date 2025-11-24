import { useState, useEffect } from 'react'
import type { User } from '../types'
import TitleBar from '../components/TitleBar'
import '../styles/AuthPage.css'

const API_URL = 'https://oneshakedown.onrender.com'

interface AuthPageProps {
  onLogin: (user: User) => void
}

export default function AuthPage({ onLogin }: AuthPageProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    // Слушаем OAuth callback от локального сервера
    const handleOAuthCallback = (_event: any, data: { userData?: string }) => {
      console.log('📥 Получен OAuth callback:', data)

      // Всегда сбрасываем состояние загрузки при получении callback
      setIsLoading(false)

      if (data.userData) {
        try {
          const user = JSON.parse(decodeURIComponent(data.userData))
          console.log('✅ Пользователь успешно авторизован:', user.email)
          setStatusMessage('Вход выполнен успешно!')
          setHasError(false)

          setTimeout(() => {
            onLogin(user)
          }, 500)
        } catch (error) {
          console.error('❌ Ошибка парсинга данных пользователя:', error)
          setStatusMessage('Ошибка обработки данных')
          setHasError(true)
        }
      } else {
        console.error('❌ Не получены данные пользователя')
        setStatusMessage('Ошибка авторизации. Попробуйте еще раз.')
        setHasError(true)
      }
    }

    // Подписываемся на событие OAuth callback
    window.electron?.ipcRenderer.on('oauth-callback', handleOAuthCallback)

    // Отписываемся при размонтировании
    return () => {
      window.electron?.ipcRenderer.removeListener('oauth-callback', handleOAuthCallback)
    }
  }, [onLogin])

  const resetError = () => {
    setStatusMessage('')
    setHasError(false)
    setIsLoading(false)
  }

  const handleGoogleLogin = async () => {
    resetError() // Сбрасываем предыдущие ошибки
    setIsLoading(true)
    setStatusMessage('Запуск локального сервера...')

    try {
      // Запускаем локальный OAuth сервер
      const serverResult = await window.electron?.ipcRenderer.invoke('start-oauth-server')

      if (!serverResult?.success) {
        throw new Error('Не удалось запустить локальный сервер')
      }

      console.log('✅ Локальный OAuth сервер запущен на порту', serverResult.port)

      setStatusMessage('Открываем браузер для входа...')

      // Открываем Google OAuth в браузере с параметром redirect=launcher
      const authUrl = `${API_URL}/api/auth/google?redirect=launcher`
      console.log('🌐 Открываем URL для лаунчера:', authUrl)
      window.electron?.openExternal(authUrl)

      setStatusMessage('Ожидание авторизации в браузере...')
      
      // Добавляем таймаут на случай если пользователь не завершит авторизацию
      setTimeout(() => {
        if (isLoading) {
          setIsLoading(false)
          setStatusMessage('Время авторизации истекло. Попробуйте еще раз.')
        }
      }, 120000) // 2 минуты
      
    } catch (error) {
      console.error('❌ Ошибка запуска OAuth:', error)
      setStatusMessage('Ошибка запуска авторизации')
      setIsLoading(false)
    }
  }

  const handleYandexLogin = async () => {
    resetError() // Сбрасываем предыдущие ошибки
    setIsLoading(true)
    setStatusMessage('Запуск локального сервера...')

    try {
      // Запускаем локальный OAuth сервер
      const serverResult = await window.electron?.ipcRenderer.invoke('start-oauth-server')

      if (!serverResult?.success) {
        throw new Error('Не удалось запустить локальный сервер')
      }

      console.log('✅ Локальный OAuth сервер запущен на порту', serverResult.port)

      setStatusMessage('Открываем браузер для входа...')

      // Открываем Yandex OAuth в браузере с параметром redirect=launcher
      const authUrl = `${API_URL}/api/auth/yandex?redirect=launcher`
      console.log('🌐 Открываем Yandex URL для лаунчера:', authUrl)
      window.electron?.openExternal(authUrl)

      setStatusMessage('Ожидание авторизации в браузере...')
      
      // Добавляем таймаут
      setTimeout(() => {
        if (isLoading) {
          setIsLoading(false)
          setStatusMessage('Время авторизации истекло. Попробуйте еще раз.')
        }
      }, 120000)
      
    } catch (error) {
      console.error('❌ Ошибка запуска OAuth:', error)
      setStatusMessage('Ошибка запуска авторизации')
      setIsLoading(false)
    }
  }

  const handleGithubLogin = async () => {
    resetError() // Сбрасываем предыдущие ошибки
    setIsLoading(true)
    setStatusMessage('Запуск локального сервера...')

    try {
      // Запускаем локальный OAuth сервер
      const serverResult = await window.electron?.ipcRenderer.invoke('start-oauth-server')

      if (!serverResult?.success) {
        throw new Error('Не удалось запустить локальный сервер')
      }

      console.log('✅ Локальный OAuth сервер запущен на порту', serverResult.port)

      setStatusMessage('Открываем браузер для входа...')

      // Открываем GitHub OAuth в браузере с параметром redirect=launcher
      const authUrl = `${API_URL}/api/auth/github?redirect=launcher`
      console.log('🌐 Открываем GitHub URL для лаунчера:', authUrl)
      window.electron?.openExternal(authUrl)

      setStatusMessage('Ожидание авторизации в браузере...')
      
      // Добавляем таймаут
      setTimeout(() => {
        if (isLoading) {
          setIsLoading(false)
          setStatusMessage('Время авторизации истекло. Попробуйте еще раз.')
        }
      }, 120000)
      
    } catch (error) {
      console.error('❌ Ошибка запуска OAuth:', error)
      setStatusMessage('Ошибка запуска авторизации')
      setIsLoading(false)
    }
  }

  return (
    <div className="app">
      <TitleBar />
      <div className="auth-page">
        <div className="auth-bg"></div>
        <div className="auth-content">
          <div className="auth-logo">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
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
          <h1>ShakeDown Client</h1>

          {statusMessage && (
            <div className="auth-status">
              <p>{statusMessage}</p>
              {hasError && (
                <button 
                  className="btn-retry"
                  onClick={resetError}
                  style={{
                    marginTop: '12px',
                    padding: '8px 16px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Попробовать снова
                </button>
              )}
            </div>
          )}

          <div className="auth-buttons">
            <button
              className="btn-google"
              onClick={handleGoogleLogin}
              disabled={isLoading}
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {isLoading ? 'Ожидание...' : 'Войти через Google'}
            </button>

            <button
              className="btn-yandex"
              onClick={handleYandexLogin}
              disabled={isLoading}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" fill="white" />
                <path d="M13.5 7.5H11.2C9.3 7.5 8.5 8.6 8.5 10.1C8.5 11.9 9.4 12.8 10.7 13.7L12.3 14.8L8.3 20.5H5.5L9.2 15.2C7.4 13.9 6 12.5 6 10.1C6 7.3 7.9 5 11.2 5H16V20.5H13.5V7.5Z" fill="#FC3F1D" />
              </svg>
              {isLoading ? 'Ожидание...' : 'Войти через Yandex'}
            </button>

            <button
              className="btn-github"
              onClick={handleGithubLogin}
              disabled={isLoading}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12C2 16.42 4.865 20.17 8.839 21.49C9.339 21.58 9.521 21.27 9.521 21C9.521 20.77 9.513 20.14 9.508 19.31C6.726 19.91 6.139 17.77 6.139 17.77C5.685 16.61 5.029 16.3 5.029 16.3C4.121 15.68 5.098 15.69 5.098 15.69C6.101 15.76 6.629 16.73 6.629 16.73C7.521 18.28 8.97 17.84 9.539 17.58C9.631 16.93 9.889 16.49 10.175 16.24C7.955 16 5.62 15.13 5.62 11.52C5.62 10.43 6.01 9.54 6.649 8.85C6.546 8.6 6.203 7.57 6.747 6.17C6.747 6.17 7.586 5.9 9.497 7.2C10.31 6.98 11.16 6.87 12.01 6.87C12.86 6.87 13.71 6.98 14.523 7.2C16.434 5.9 17.272 6.17 17.272 6.17C17.817 7.57 17.474 8.6 17.371 8.85C18.01 9.54 18.397 10.43 18.397 11.52C18.397 15.14 16.058 15.99 13.833 16.24C14.191 16.56 14.512 17.19 14.512 18.15C14.512 19.53 14.499 20.64 14.499 21C14.499 21.27 14.679 21.58 15.186 21.49C19.157 20.16 22 16.42 22 12C22 6.477 17.523 2 12 2Z" fill="currentColor" />
              </svg>
              {isLoading ? 'Ожидание...' : 'Войти через GitHub'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
