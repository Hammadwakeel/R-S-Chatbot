"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AIAssistantUI from '@/components/AIAssistantUI'

export default function ChatPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      setIsAuthenticated(true)
    } else {
      router.push('/login')
    }
    setIsLoading(false)
  }, [router])

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="text-center">
          <div className="inline-flex h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-white"></div>
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) return null

  return (
    // ✅ FIX: Use full screen width/height and hide overflow
    <div className="h-screen w-full overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      <AIAssistantUI />
    </div>
  )
}