import { useState, useEffect } from 'react'
import TitleBar from './components/TitleBar'
import Sidebar from './components/Sidebar'
import HomePage from './pages/HomePage'
import ProfilePage from './pages/ProfilePage'
import SettingsPage from './pages/SettingsPage'
import NewsPage from './pages/NewsPage'
import AuthPage from './pages/AuthPage'
import UpdateNotification from './components/UpdateNotification'
import type { User } from './types'
import { getUserInfo } from './utils/api'
import './styles/App.css'

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'profile' | 'settings' | 'news'>('home')
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Проверяем сохраненного пользователя и обновляем его данные с сервера
    const loadUser = async () => {
      const savedUser = localStorage.getItem('user')
      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser)
          setUser(parsedUser)
          setIsLoading(false) // Сразу показываем UI с кешированными данными

          // Загружаем актуальные данные с сервера (включая аватарку) в фоне
          console.log('🔄 Обновление данных пользователя с сервера...')
          try {
            const response = await Promise.race([
              getUserInfo(parsedUser.id),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
            ]) as any
            
            if (response.success && response.data) {
              console.log('✅ Данные пользователя обновлены:', response.data)
              const updatedUser = {
                ...parsedUser,
                ...response.data,
                registeredAt: response.data.registeredAt || parsedUser.registeredAt
              }

              // Логируем подписку при загрузке
              console.log('📋 Текущая подписка:', updatedUser.subscription)

              setUser(updatedUser)
              localStorage.setItem('user', JSON.stringify(updatedUser))
            } else {
              console.error('❌ Ошибка загрузки данных пользователя:', response)
            }
          } catch (e) {
            console.error('❌ Не удалось обновить данные с сервера:', e)
            // Продолжаем работу с кешированными данными
          }
        } catch (e) {
          console.error('Failed to parse user:', e)
          setIsLoading(false)
        }
      } else {
        setIsLoading(false)
      }
    }

    loadUser()

    // Автоматическое обновление данных каждые 30 секунд
    const intervalId = setInterval(async () => {
      const savedUser = localStorage.getItem('user')
      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser)
          const response = await getUserInfo(parsedUser.id)
          if (response.success && response.data) {
            const updatedUser = {
              ...parsedUser,
              ...response.data,
              registeredAt: response.data.registeredAt || parsedUser.registeredAt
            }

            // Логируем изменение подписки
            if (parsedUser.subscription !== response.data.subscription) {
              console.log('🔔 ПОДПИСКА ИЗМЕНЕНА!')
              console.log('  Старая:', parsedUser.subscription)
              console.log('  Новая:', response.data.subscription)
            }

            setUser(updatedUser)
            localStorage.setItem('user', JSON.stringify(updatedUser))
            console.log('🔄 Данные автоматически обновлены:', {
              id: updatedUser.id,
              username: updatedUser.username,
              subscription: updatedUser.subscription
            })
          } else {
            console.error('❌ Ошибка обновления данных:', response)
          }
        } catch (e) {
          console.error('Auto-update failed:', e)
        }
      }
    }, 30000) // 30 секунд

    return () => clearInterval(intervalId)
  }, [])

  const handleLogin = (userData: User) => {
    // Сохраняем токен отдельно
    if ('token' in userData) {
      localStorage.setItem('token', (userData as any).token)
    }
    // Сохраняем пользователя без токена
    const userWithoutToken = { ...userData }
    delete (userWithoutToken as any).token
    setUser(userWithoutToken)
    localStorage.setItem('user', JSON.stringify(userWithoutToken))
  }

  const handleUserUpdate = (userData: User) => {
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('user')
    localStorage.removeItem('token')
  }

  if (isLoading) {
    return (
      <div className="app loading">
        <div className="loader"></div>
      </div>
    )
  }

  if (!user) {
    return <AuthPage onLogin={handleLogin} />
  }

  return (
    <div className="app">
      <TitleBar />
      <UpdateNotification />
      <div className="app-main">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} user={user} />
        <div className="app-content">
          {activeTab === 'home' && <HomePage user={user} />}
          {activeTab === 'profile' && <ProfilePage user={user} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />}
          {activeTab === 'settings' && <SettingsPage />}
          {activeTab === 'news' && <NewsPage />}
        </div>
      </div>
    </div>
  )
}
