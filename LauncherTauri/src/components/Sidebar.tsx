import type { User } from '../types'
import '../styles/Sidebar.css'

interface SidebarProps {
  activeTab: 'home' | 'profile' | 'settings' | 'news'
  onTabChange: (tab: 'home' | 'profile' | 'settings' | 'news') => void
  user: User
}

export default function Sidebar({ activeTab, onTabChange, user }: SidebarProps) {
  return (
    <div className="sidebar">
      <div className="sidebar-user">
        <div className="sidebar-avatar">
          {user.avatar ? (
            <img src={user.avatar} alt={user.username} />
          ) : (
            <svg width="40" height="40" viewBox="0 0 60 60" fill="currentColor">
              <circle cx="30" cy="20" r="12" />
              <path d="M30 35C18 35 10 40 10 50H50C50 40 42 35 30 35Z" />
            </svg>
          )}
        </div>
        <div className="sidebar-user-info">
          <div className="sidebar-username">{user.username}</div>
          <div className="sidebar-uid">{user.uid || `AZ-${new Date(user.registeredAt).getFullYear()}-${user.id.toString().padStart(3, '0')}`}</div>
        </div>
      </div>
      <div
        className={`nav-item ${activeTab === 'home' ? 'active' : ''}`}
        onClick={() => onTabChange('home')}
      >
        <svg className="nav-icon" width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 2L2 8V18C2 18.5304 2.21071 19.0391 2.58579 19.4142C2.96086 19.7893 3.46957 20 4 20H16C16.5304 20 17.0391 19.7893 17.4142 19.4142C17.7893 19.0391 18 18.5304 18 18V8L10 2Z" />
          <path d="M8 20V12H12V20" fill="currentColor" />
        </svg>
        <span>Главная</span>
      </div>
      <div
        className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
        onClick={() => onTabChange('profile')}
      >
        <svg className="nav-icon" width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
          <circle cx="10" cy="6" r="4" />
          <path d="M10 12C5.58172 12 2 14.6863 2 18H18C18 14.6863 14.4183 12 10 12Z" />
        </svg>
        <span>Профиль</span>
      </div>
      <div
        className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
        onClick={() => onTabChange('settings')}
      >
        <svg className="nav-icon" width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
          <circle cx="10" cy="4" r="1.5" />
          <circle cx="10" cy="10" r="1.5" />
          <circle cx="10" cy="16" r="1.5" />
        </svg>
        <span>Настройки</span>
      </div>
      <div
        className={`nav-item ${activeTab === 'news' ? 'active' : ''}`}
        onClick={() => onTabChange('news')}
      >
        <svg className="nav-icon" width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
          <path d="M2 4C2 2.89543 2.89543 2 4 2H16C17.1046 2 18 2.89543 18 4V16C18 17.1046 17.1046 18 16 18H4C2.89543 18 2 17.1046 2 16V4Z" />
          <rect x="5" y="5" width="6" height="4" fill="#0A0A0F" />
          <rect x="5" y="11" width="10" height="1" fill="#0A0A0F" />
          <rect x="5" y="14" width="10" height="1" fill="#0A0A0F" />
        </svg>
        <span>Новости</span>
      </div>
    </div>
  )
}
