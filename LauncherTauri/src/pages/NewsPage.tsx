import { useState, useEffect } from 'react'
import type { NewsPost } from '../types'
import { getNews } from '../utils/api'
import '../styles/NewsPage.css'

export default function NewsPage() {
  const [news, setNews] = useState<NewsPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadNews()
    
    // Автоматическое обновление новостей каждые 5 минут
    const intervalId = setInterval(() => {
      loadNews()
    }, 5 * 60 * 1000)

    return () => clearInterval(intervalId)
  }, [])

  const loadNews = async () => {
    try {
      console.log('📰 Загрузка новостей с сервера...')
      const data = await getNews()
      console.log('📰 Получены данные:', data)
      
      if (data.success && data.data && Array.isArray(data.data)) {
        const launcherNews = data.data.filter((n: NewsPost) => n.type === 'launcher')
        console.log(`📰 Найдено ${launcherNews.length} новостей для лаунчера`)
        setNews(launcherNews)
        setError(null)
      } else {
        console.warn('📰 Неверный формат данных:', data)
        setError(data.message || 'Неверный формат данных с сервера')
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки новостей:', error)
      setError(error instanceof Error ? error.message : 'Не удалось загрузить новости')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="page news-page">
        <div className="page-header">
          <h1>Новости</h1>
          <p>Последние обновления ShakeDown Client</p>
        </div>
        <div className="news-loading">
          <div className="loader"></div>
          <p>Загрузка новостей...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page news-page">
      <div className="page-header">
        <h1>Новости</h1>
        <p>Последние обновления ShakeDown Client</p>
      </div>

      <div className="news-container">
        {error && (
          <div className="news-error">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor"/>
            </svg>
            <div>
              <h3>Ошибка загрузки новостей</h3>
              <p>{error}</p>
              <button onClick={loadNews} className="retry-btn">Попробовать снова</button>
            </div>
          </div>
        )}
        
        {!error && news.length === 0 && (
          <div className="news-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" fill="currentColor" opacity="0.3"/>
            </svg>
            <h3>Новостей пока нет</h3>
            <p>Следите за обновлениями!</p>
          </div>
        )}
        
        {!error && news.length > 0 && news.map((item) => (
          <article key={item.id} className="news-item">
            <div className="news-date">
              {new Date(item.date).toLocaleDateString('ru-RU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
            <h3>{item.title}</h3>
            <p>{item.content}</p>
            {item.author && (
              <div className="news-author">Автор: {item.author}</div>
            )}
          </article>
        ))}
      </div>
    </div>
  )
}
