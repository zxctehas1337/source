
import type { User } from '../types'
import '../styles/ProfilePage.css'

interface ProfilePageProps {
  user: User
  onLogout: () => void
  onUserUpdate?: (user: User) => void
}

export default function ProfilePage({ user, onLogout }: ProfilePageProps) {
  const subscriptionLabel = user.subscription === 'premium' ? 'Premium' :
    user.subscription === 'alpha' ? 'Alpha' : 'Free'

  return (
    <div className="page profile-page">
      <div className="page-header">
        <h1>Профиль</h1>
        <p>Информация о вашем аккаунте</p>
      </div>

      <div className="profile-card">
        <div className="profile-avatar-container">
          <div className="profile-avatar">
            {user.avatar ? (
              <img src={user.avatar} alt="Avatar" />
            ) : (
              <svg className="avatar-placeholder" width="48" height="48" viewBox="0 0 60 60" fill="currentColor">
                <circle cx="30" cy="20" r="12" />
                <path d="M30 35C18 35 10 40 10 50H50C50 40 42 35 30 35Z" />
              </svg>
            )}
          </div>
        </div>

        <div className="profile-info">
          <div className="profile-field">
            <label>Никнейм:</label>
            <span className="profile-value">{user.username}</span>
          </div>
          <div className="profile-field">
            <label>Email:</label>
            <span className="profile-value">{user.email}</span>
          </div>
          <div className="profile-field">
            <label>UID:</label>
            <span className="uid-value">{user.uid || `AZ-${new Date(user.registeredAt).getFullYear()}-${user.id.toString().padStart(3, '0')}`}</span>
          </div>
          <div className="profile-field">
            <label>Статус:</label>
            <span className="status-active">Активен</span>
          </div>
          <div className="profile-field">
            <label>Подписка:</label>
            <span className={`subscription-${user.subscription}`}>
              {subscriptionLabel}
            </span>
          </div>
          <div className="profile-field">
            <label>Дата регистрации:</label>
            <span className="profile-value">
              {new Date(user.registeredAt).toLocaleDateString('ru-RU')}
            </span>
          </div>
        </div>

        <div className="profile-actions">
          <button className="btn-logout" onClick={onLogout}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeWidth="2" strokeLinecap="round" />
              <polyline points="16 17 21 12 16 7" strokeWidth="2" strokeLinecap="round" />
              <line x1="21" y1="12" x2="9" y2="12" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Выйти из аккаунта
          </button>
        </div>
      </div>
    </div>
  )
}
