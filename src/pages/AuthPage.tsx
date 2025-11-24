import { useState, useEffect } from 'react'
import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import Notification from '../components/Notification'
import { setCurrentUser } from '../utils/database'
import { initAnalytics, trackPageView, trackButtonClick } from '../utils/analytics'
import { NotificationType } from '../types'
import '../styles/AuthPage.css'

const FEATURES = [
  {
    title: "Лучшие обходы",
    description: "Непробиваемые обходы античитов с постоянными обновлениями",
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M24 4L40 12V28C40 35.732 33.732 42 26 42H22C14.268 42 8 35.732 8 28V12L24 4Z" />
      </svg>
    )
  },
  {
    title: "Высокая производительность",
    description: "Оптимизированный код без просадок FPS",
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M26 4L14 24H24L22 44L34 24H24L26 4Z" fill="currentColor" />
      </svg>
    )
  },
  {
    title: "Стильный интерфейс",
    description: "Современный GUI с темами и настройками",
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="6" y="8" width="36" height="26" rx="2" />
        <path d="M6 30H42" />
        <path d="M18 40H30" strokeLinecap="round" />
        <path d="M24 34V40" />
      </svg>
    )
  },
  {
    title: "Богатый функционал",
    description: "Более 100 модулей для всех аспектов игры",
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="10" y="10" width="28" height="4" rx="1" fill="currentColor" />
        <rect x="10" y="18" width="28" height="4" rx="1" fill="currentColor" />
        <rect x="10" y="26" width="28" height="4" rx="1" fill="currentColor" />
        <rect x="10" y="34" width="20" height="4" rx="1" fill="currentColor" />
      </svg>
    )
  },
  {
    title: "Регулярные обновления",
    description: "Еженедельные обновления с новыми функциями",
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="24" cy="24" r="18" />
        <path d="M24 10V24L32 32" strokeLinecap="round" />
      </svg>
    )
  },
  {
    title: "Поддержка 24/7",
    description: "Круглосуточная помощь и активное сообщество",
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="24" cy="16" r="8" fill="currentColor" />
        <path d="M10 42C10 33.163 16.268 26 24 26C31.732 26 38 33.163 38 42" fill="currentColor" />
      </svg>
    )
  }
]

export default function AuthPage() {
  const [notification, setNotification] = useState<{ message: string; type: NotificationType } | null>(null)
  const [isAdminMode, setIsAdminMode] = useState(false)
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [currentFeature, setCurrentFeature] = useState(0)
  const navigate = useNavigate()

  // Инициализация аналитики
  React.useEffect(() => {
    initAnalytics()
    trackPageView('/auth')
  }, [])

  // Автоматическое переключение слайдов
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % FEATURES.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  // Проверяем URL параметры для OAuth callback
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const authStatus = params.get('auth')
    const userData = params.get('user')

    if (authStatus === 'success' && userData) {
      try {
        const user = JSON.parse(decodeURIComponent(userData))
        console.log('✅ OAuth успешен, сохраняем пользователя с токеном')
        setCurrentUser(user) // Токен будет сохранен автоматически
        setNotification({ message: 'Вход выполнен успешно!', type: 'success' })

        // Перенаправление
        if (user.isAdmin) {
          setTimeout(() => navigate('/admin'), 1500)
        } else {
          setTimeout(() => navigate('/dashboard'), 1500)
        }
      } catch (error) {
        console.error('Error parsing user data:', error)
        setNotification({ message: 'Ошибка при входе', type: 'error' })
      }
    }
  }, [navigate])

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!adminEmail || !adminPassword) {
      setNotification({ message: 'Заполните все поля', type: 'error' })
      return
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://oneshakedown.onrender.com'}/api/auth/admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: adminEmail, password: adminPassword }),
      })

      const result = await response.json()

      if (result.success && result.data) {
        console.log('✅ Вход администратора успешен, сохраняем с токеном')
        setCurrentUser(result.data) // Токен будет сохранен автоматически
        setNotification({ message: 'Вход администратора выполнен!', type: 'success' })
        setTimeout(() => navigate('/admin'), 1500)
      } else {
        setNotification({ message: result.message || 'Неверные данные администратора', type: 'error' })
      }
    } catch (error) {
      console.error('Admin login error:', error)
      setNotification({ message: 'Ошибка подключения к серверу', type: 'error' })
    }
  }

  return (
    <div className="auth-page-split">
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Левая часть - Слайдер */}
      <div className="auth-left-panel">
        <div className="slider-content">
          <div className="feature-icon">
            {FEATURES[currentFeature].icon}
          </div>
          <h2 className="feature-title fade-in-text" key={`title-${currentFeature}`}>
            {FEATURES[currentFeature].title}
          </h2>
          <p className="feature-description fade-in-text" key={`desc-${currentFeature}`}>
            {FEATURES[currentFeature].description}
          </p>

          <div className="slider-dots">
            {FEATURES.map((_, index) => (
              <button
                key={index}
                className={`slider-dot ${index === currentFeature ? 'active' : ''}`}
                onClick={() => setCurrentFeature(index)}
                aria-label={`Перейти к слайду ${index + 1}`}
              />
            ))}
          </div>
        </div>

        <div className="auth-bg-overlay"></div>
      </div>

      {/* Правая часть - Форма */}
      <div className="auth-right-panel">
        <div className="auth-box-clean">
          <div className="auth-header">
            <div className="auth-logo-small">
              <img src="/icon.ico" alt="ShakeDown" width="40" height="40" />
            </div>
            <div className="auth-title-clean">
              <h2>Добро пожаловать</h2>
              <p>Войдите в свой аккаунт чтобы продолжить</p>
            </div>
          </div>

          <div className="auth-form-clean">
            {!isAdminMode ? (
              <>
                <div className="social-buttons">
                  <a
                    href={`${import.meta.env.VITE_API_URL || 'https://oneshakedown.onrender.com'}/api/auth/google`}
                    className="btn-social btn-google-clean"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M18.1713 8.36788H17.5001V8.33329H10.0001V11.6666H14.7096C14.0225 13.6069 12.1763 15 10.0001 15C7.23882 15 5.00007 12.7612 5.00007 9.99996C5.00007 7.23871 7.23882 4.99996 10.0001 4.99996C11.2746 4.99996 12.4342 5.48079 13.3171 6.26621L15.6742 3.90913C14.1859 2.52204 12.1951 1.66663 10.0001 1.66663C5.39799 1.66663 1.66675 5.39788 1.66675 9.99996C1.66675 14.602 5.39799 18.3333 10.0001 18.3333C14.6022 18.3333 18.3334 14.602 18.3334 9.99996C18.3334 9.44121 18.2759 8.89579 18.1713 8.36788Z" fill="#FFC107" />
                      <path d="M2.6275 6.12121L5.36542 8.12954C6.10625 6.29537 7.90042 4.99996 10.0004 4.99996C11.2754 4.99996 12.4346 5.48079 13.3175 6.26621L15.6746 3.90913C14.1863 2.52204 12.1951 1.66663 10.0004 1.66663C6.79917 1.66663 4.02334 3.47371 2.6275 6.12121Z" fill="#FF3D00" />
                      <path d="M10.0004 18.3333C12.1529 18.3333 14.1083 17.5095 15.5871 16.17L13.0079 13.9875C12.1431 14.6452 11.0864 15.0008 10.0004 15C7.83294 15 5.99211 13.6179 5.29878 11.6891L2.58211 13.7829C3.96044 16.4816 6.76128 18.3333 10.0004 18.3333Z" fill="#4CAF50" />
                      <path d="M18.1713 8.36796H17.5V8.33337H10V11.6667H14.7096C14.3809 12.5902 13.7889 13.3972 13.0067 13.9879L13.0079 13.9871L15.5871 16.1696C15.4046 16.3355 18.3333 14.1667 18.3333 10C18.3333 9.44129 18.2758 8.89587 18.1713 8.36796Z" fill="#1976D2" />
                    </svg>
                    <span>Google</span>
                  </a>

                  <a
                    href={`${import.meta.env.VITE_API_URL || 'https://oneshakedown.onrender.com'}/api/auth/yandex`}
                    className="btn-social btn-yandex-clean"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" fill="#FC3F1D" />
                      <path d="M13.5 7.5H11.2C9.3 7.5 8.5 8.6 8.5 10.1C8.5 11.9 9.4 12.8 10.7 13.7L12.3 14.8L8.3 20.5H5.5L9.2 15.2C7.4 13.9 6 12.5 6 10.1C6 7.3 7.9 5 11.2 5H16V20.5H13.5V7.5Z" fill="white" />
                    </svg>
                    <span>Yandex</span>
                  </a>

                  <a
                    href={`${import.meta.env.VITE_API_URL || 'https://oneshakedown.onrender.com'}/api/auth/github`}
                    className="btn-social btn-github-clean"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12C2 16.42 4.865 20.17 8.839 21.49C9.339 21.58 9.521 21.27 9.521 21C9.521 20.77 9.513 20.14 9.508 19.31C6.726 19.91 6.139 17.77 6.139 17.77C5.685 16.61 5.029 16.3 5.029 16.3C4.121 15.68 5.098 15.69 5.098 15.69C6.101 15.76 6.629 16.73 6.629 16.73C7.521 18.28 8.97 17.84 9.539 17.58C9.631 16.93 9.889 16.49 10.175 16.24C7.955 16 5.62 15.13 5.62 11.52C5.62 10.43 6.01 9.54 6.649 8.85C6.546 8.6 6.203 7.57 6.747 6.17C6.747 6.17 7.586 5.9 9.497 7.2C10.31 6.98 11.16 6.87 12.01 6.87C12.86 6.87 13.71 6.98 14.523 7.2C16.434 5.9 17.272 6.17 17.272 6.17C17.817 7.57 17.474 8.6 17.371 8.85C18.01 9.54 18.397 10.43 18.397 11.52C18.397 15.14 16.058 15.99 13.833 16.24C14.191 16.56 14.512 17.19 14.512 18.15C14.512 19.53 14.499 20.64 14.499 21C14.499 21.27 14.679 21.58 15.186 21.49C19.157 20.16 22 16.42 22 12C22 6.477 17.523 2 12 2Z" fill="currentColor" />
                    </svg>
                    <span>GitHub</span>
                  </a>
                </div>

                <div className="divider-clean">
                  <span>или</span>
                </div>

                <button
                  onClick={() => {
                    setIsAdminMode(true)
                    trackButtonClick('admin_mode')
                  }}
                  className="btn-text-only"
                >
                  Войти как администратор
                </button>
              </>
            ) : (
              <>
                <form onSubmit={handleAdminLogin} className="admin-form-clean">
                  <div className="form-group-clean">
                    <label htmlFor="admin-email">Email</label>
                    <input
                      id="admin-email"
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="admin@example.com"
                      className="input-clean"
                      required
                    />
                  </div>

                  <div className="form-group-clean">
                    <label htmlFor="admin-password">Пароль</label>
                    <input
                      id="admin-password"
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="••••••••"
                      className="input-clean"
                      required
                    />
                  </div>

                  <button type="submit" className="btn-primary-clean">
                    Войти
                  </button>
                </form>

                <button
                  onClick={() => setIsAdminMode(false)}
                  className="btn-text-only"
                  style={{ marginTop: '16px' }}
                >
                  Вернуться назад
                </button>
              </>
            )}
          </div>

          <div className="auth-footer-clean">
            <a href="/" className="back-link-clean">
              На главную
            </a>
            <span className="version-tag">v3.1.9</span>
          </div>
        </div>
      </div>
    </div>
  )
}