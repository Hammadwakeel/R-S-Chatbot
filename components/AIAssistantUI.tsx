"use client"

import React, { useEffect, useRef, useState } from "react"
import Sidebar from "./Sidebar"
import Header from "./Header" 
import ChatPane from "./ChatPane"
import { api, User, Message, ChatSession } from "@/lib/api"

export default function AIAssistantUI() {
  const [mounted, setMounted] = useState(false)
  const [userData, setUserData] = useState<User | null>(null)
  
  const [conversations, setConversations] = useState<ChatSession[]>([])
  
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isThinking, setIsThinking] = useState(false)
  const isStreamingRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [theme, setTheme] = useState("light")
  const composerRef = useRef<any>(null)

  useEffect(() => {
    setMounted(true)
    const savedTheme = localStorage.getItem("theme")
    if (savedTheme) setTheme(savedTheme)
    else if (window.matchMedia("(prefers-color-scheme: dark)").matches) setTheme("dark")

    const savedSidebar = localStorage.getItem("sidebar-collapsed-state")
    if (savedSidebar) setSidebarCollapsed(JSON.parse(savedSidebar))

    fetchData()
  }, [])

  useEffect(() => {
    if (!mounted) return
    if (theme === "dark") document.documentElement.classList.add("dark")
    else document.documentElement.classList.remove("dark")
    localStorage.setItem("theme", theme)
  }, [theme, mounted])

  const fetchData = async () => {
    try {
      const [user, chats] = await Promise.all([
        api.user.getProfile().catch(() => null),
        api.chat.list().catch(() => [])
      ])
      
      if (user) setUserData(user)
      if (chats) setConversations(chats)
    } catch (e) { console.error(e) }
  }

  const refreshConversations = async () => {
     const chats = await api.chat.list().catch(() => [])
     setConversations(chats)
  }

  // ✅ FIXED: Prevent clearing messages if AI is currently streaming/thinking
  useEffect(() => {
    if (isStreamingRef.current) return // <--- CRITICAL FIX

    if (!selectedId || selectedId.startsWith("new_")) {
        setMessages([])
        return
    }

    const loadMessages = async () => {
      try {
        const msgs = await api.chat.getDetails(selectedId)
        setMessages(msgs || [])
      } catch (e) {
        console.error("Failed to load messages", e)
      }
    }
    loadMessages()
  }, [selectedId]) // Removed isThinking from dependency to avoid double-firing

  const createNewChat = () => {
    if (abortControllerRef.current) abortControllerRef.current.abort()
    setSelectedId(null)
    setMessages([])
    setSidebarOpen(false)
  }

  const handlePauseThinking = () => {
    if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
    }
    setIsThinking(false)
    isStreamingRef.current = false
  }

  const handleSend = async (content: string) => {
    if (!content.trim()) return

    if (abortControllerRef.current) abortControllerRef.current.abort()
    const ac = new AbortController()
    abortControllerRef.current = ac

    const tempUserMsg: Message = {
      id: Math.random().toString(),
      chat_id: selectedId || "temp",
      role: "user",
      content: content,
      created_at: new Date().toISOString(),
      is_summarized: false
    }
    
    // This placeholder ensures the "Thinking..." bubble appears in the message list
    const tempAiMsg: Message = {
      id: "ai-placeholder",
      chat_id: selectedId || "temp",
      role: "assistant",
      content: "",
      created_at: new Date().toISOString(),
      is_summarized: false
    }

    // Set streaming flag BEFORE state update to block the useEffect
    isStreamingRef.current = true
    setIsThinking(true)
    setMessages(prev => [...prev, tempUserMsg, tempAiMsg])

    let currentResponse = ""
    let activeThreadId = selectedId

    await api.streamMessage(
      content,
      selectedId,
      (chunk, newThreadId) => {
        currentResponse += chunk
        if (newThreadId && !activeThreadId) {
            activeThreadId = newThreadId
            setSelectedId(newThreadId)
            refreshConversations() 
        }
        setMessages(prev => {
            const newArr = [...prev]
            const lastIdx = newArr.length - 1
            if (lastIdx >= 0 && newArr[lastIdx].role === "assistant") {
                newArr[lastIdx] = { ...newArr[lastIdx], content: currentResponse }
            }
            return newArr
        })
      },
      (error) => {
        console.error("Stream error:", error)
        setMessages(prev => [...prev, { 
            id: "err", chat_id: "err", role: "assistant", 
            content: "Error: " + error, created_at: new Date().toISOString(), is_summarized: false 
        }])
      },
      () => {
        setIsThinking(false)
        isStreamingRef.current = false
        abortControllerRef.current = null
      },
      ac.signal
    )
  }

  const handleEditMessage = async (msgId: string, newContent: string) => {
    if (abortControllerRef.current) abortControllerRef.current.abort()
    const ac = new AbortController()
    abortControllerRef.current = ac

    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: newContent } : m))
    
    const msgIndex = messages.findIndex(m => m.id === msgId)
    if (msgIndex === -1) return
    
    const truncatedMessages = messages.slice(0, msgIndex + 1)
    setMessages([...truncatedMessages, { 
        id: "ai-regen", chat_id: selectedId!, role: "assistant", 
        content: "", created_at: new Date().toISOString(), is_summarized: false 
    }])
    
    isStreamingRef.current = true
    setIsThinking(true)

    let currentResponse = ""

    await api.editMessage(
        msgId, 
        newContent,
        (chunk) => {
            currentResponse += chunk
            setMessages(prev => {
                const newArr = [...prev]
                const lastIdx = newArr.length - 1
                newArr[lastIdx] = { ...newArr[lastIdx], content: currentResponse }
                return newArr
            })
        },
        () => {
            setIsThinking(false)
            isStreamingRef.current = false
            abortControllerRef.current = null
        },
        ac.signal
    )
  }

  const handleDeleteChat = async (id: string) => {
    try {
        await api.chat.delete(id)
        setConversations(prev => prev.filter(c => c.id !== id))
        if (selectedId === id) {
            setSelectedId(null)
            setMessages([])
        }
    } catch (e) { console.error(e) }
  }

  if (!mounted) return <div className="h-screen w-full bg-zinc-50 dark:bg-zinc-950"></div>
  
  const activeConversation = {
      id: selectedId || "new",
      title: selectedId ? "Chat" : "New Chat",
      messages: messages,
      updatedAt: new Date().toISOString(),
      preview: "",
      pinned: false,
      folder: "",
      messageCount: messages.length
  }

  const activeChat = conversations.find(c => c.id === selectedId)
  const displayTitle = activeChat ? activeChat.title : (selectedId ? "Chat" : "New Chat")

  return (
    <div className="h-screen w-full bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      
      <div className="flex h-full w-full overflow-hidden">
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          theme={theme}
          setTheme={setTheme}
          collapsed={{ recent: false }} 
          setCollapsed={() => {}}
          selectedId={selectedId}
          onSelect={(id) => {
            setSelectedId(id)
            setSidebarOpen(false) 
          }}
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={(v) => {
              setSidebarCollapsed(v)
              localStorage.setItem("sidebar-collapsed-state", JSON.stringify(v))
          }}
          conversations={conversations} 
          userData={userData}
          onDeleteChat={handleDeleteChat}
        />

        <main className="relative flex min-w-0 flex-1 flex-col">
          <Header 
             sidebarCollapsed={sidebarCollapsed} 
             setSidebarOpen={setSidebarOpen} 
             title={displayTitle} 
             userData={userData}
             createNewChat={createNewChat}
          />
          
          <ChatPane
            ref={composerRef}
            conversation={activeConversation}
            onSend={handleSend}
            onEditMessage={handleEditMessage}
            onResendMessage={() => {}} 
            isThinking={isThinking}
            onPauseThinking={handlePauseThinking}
            userName={userData?.full_name}
            userAvatar={userData?.avatar_url}
          />
        </main>
      </div>
    </div>
  )
}