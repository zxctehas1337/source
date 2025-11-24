// API для работы с backend
import { fetch } from '@tauri-apps/plugin-http'

const API_URL = 'https://oneshakedown.onrender.com'

export interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
}

// Получить информацию о пользователе
export async function getUserInfo(userId: number) {
  try {
    const url = `${API_URL}/api/users/${userId}`
    console.log('🔍 API.getUserInfo: Fetching from URL:', url)
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 секунд таймаут
    
    const response = await fetch(url, {
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    
    const data = await response.json()
    console.log('🔍 API.getUserInfo: Response:', data)
    return data
  } catch (error) {
    console.error('❌ Get user error:', error)
    return { success: false, message: 'Ошибка подключения к серверу' }
  }
}

// Проверка доступности сервера
export async function checkServerHealth() {
  try {
    const response = await fetch(`${API_URL}/api/health`)
    return response.ok
  } catch (error) {
    return false
  }
}

// Загрузка пользовательской аватарки
export async function uploadAvatar(userId: number, avatarBase64: string) {
  try {
    const url = `${API_URL}/api/users/${userId}/avatar`
    console.log('🔍 API.uploadAvatar: Uploading to URL:', url)
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ avatar: avatarBase64 })
    })
    const data = await response.json()
    console.log('🔍 API.uploadAvatar: Response:', data)
    return data
  } catch (error) {
    console.error('❌ Upload avatar error:', error)
    return { success: false, message: 'Ошибка подключения к серверу' }
  }
}

// Удаление пользовательской аватарки
export async function deleteAvatar(userId: number) {
  try {
    const url = `${API_URL}/api/users/${userId}/avatar`
    console.log('🔍 API.deleteAvatar: Deleting from URL:', url)
    const response = await fetch(url, {
      method: 'DELETE'
    })
    const data = await response.json()
    console.log('🔍 API.deleteAvatar: Response:', data)
    return data
  } catch (error) {
    console.error('❌ Delete avatar error:', error)
    return { success: false, message: 'Ошибка подключения к серверу' }
  }
}

// Обновление пользователя
export async function updateUser(userId: number, updates: any) {
  try {
    const response = await fetch(`${API_URL}/api/users/${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    })
    return await response.json()
  } catch (error) {
    console.error('Update error:', error)
    return { success: false, message: 'Ошибка подключения к серверу' }
  }
}

// Получить всех пользователей (для админки)
export async function getAllUsers() {
  try {
    const response = await fetch(`${API_URL}/api/users`)
    return await response.json()
  } catch (error) {
    console.error('Get all users error:', error)
    return { success: false, message: 'Ошибка подключения к серверу' }
  }
}

// Изменение подписки пользователя
export async function changeUserSubscription(userId: number, subscription: 'free' | 'premium' | 'alpha') {
  try {
    const response = await fetch(`${API_URL}/api/users/${userId}/subscription`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ subscription }),
    })
    return await response.json()
  } catch (error) {
    console.error('Change subscription error:', error)
    return { success: false, message: 'Ошибка подключения к серверу' }
  }
}

// Удаление пользователя
export async function deleteUser(userId: number) {
  try {
    const response = await fetch(`${API_URL}/api/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    return await response.json()
  } catch (error) {
    console.error('Delete user error:', error)
    return { success: false, message: 'Ошибка подключения к серверу' }
  }
}

// Получить новости
export async function getNews() {
  try {
    const url = `${API_URL}/api/news`
    console.log('🔍 API.getNews: Fetching from URL:', url)
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 секунд таймаут
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      mode: 'cors',
      cache: 'no-cache',
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    console.log('🔍 API.getNews: Response:', data)
    return data
  } catch (error) {
    console.error('❌ Get news error:', error)
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Ошибка подключения к серверу' 
    }
  }
}
