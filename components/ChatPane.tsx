"use client"

import { useState, forwardRef, useImperativeHandle, useRef, useEffect } from "react"
// ✅ Removed RefreshCw from import
import { Pencil, Check, Square, Sparkles, User, Bot, Copy } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { Message as MessageType } from "@/lib/api"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Composer, { ComposerHandle } from "./Composer" 

export interface ChatPaneHandle {
  insertTemplate: (content: string) => void;
  focus: () => void;
}

interface ChatPaneProps {
  conversation: {
    id: string
    title: string
    messages: MessageType[]
    updatedAt: string
    preview: string
    pinned: boolean
    folder: string
    messageCount: number
  } | null
  onSend: (content: string) => void
  onEditMessage: (messageId: string, newContent: string) => void
  onResendMessage: (messageId: string) => void
  isThinking: boolean
  onPauseThinking: () => void
  userName?: string
  userAvatar?: string
}

const ChatPane = forwardRef<ChatPaneHandle, ChatPaneProps>(function ChatPane(
  { conversation, onSend, onEditMessage, onResendMessage, isThinking, onPauseThinking, userName, userAvatar },
  ref,
) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  
  const internalComposerRef = useRef<ComposerHandle>(null)

  useEffect(() => {
    if (scrollRef.current) {
        const div = scrollRef.current
        const isNearBottom = div.scrollHeight - div.scrollTop - div.clientHeight < 100
        if(isNearBottom || isThinking) {
            div.scrollTop = div.scrollHeight
        }
    }
  }, [conversation?.messages, isThinking])

  useImperativeHandle(ref, () => ({
      insertTemplate: (templateContent: string) => {
        internalComposerRef.current?.insertTemplate(templateContent)
      },
      focus: () => {
        internalComposerRef.current?.focus()
      }
  }), [])

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const getInitials = (name?: string) => {
    if (!name) return "U"
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
  }

  if (!conversation) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-zinc-500 bg-white dark:bg-zinc-950">
        <div className="mb-4 rounded-full bg-zinc-100 p-4 dark:bg-zinc-800">
          <Sparkles className="h-8 w-8 text-zinc-400" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">AI Assistant</h3>
        <p className="max-w-sm text-sm">Select a conversation from the sidebar or start a new chat to begin.</p>
      </div>
    )
  }

  const messages = conversation.messages || []

  return (
    <div className="flex flex-1 flex-col min-h-0 bg-white dark:bg-zinc-950 relative">
      
      <div className="flex-1 overflow-y-auto p-4 space-y-6" ref={scrollRef}>
        
        {messages.map((msg, index) => {
            const isLastMessage = index === messages.length - 1
            const isStreaming = isLastMessage && isThinking && msg.role === "assistant"

            return (
            <div 
              key={msg.id} 
              className={cn(
                "group flex gap-4 w-full max-w-3xl mx-auto px-2", 
                msg.role === "user" ? "flex-row-reverse" : "flex-row"
              )}
            >
              
              {/* Icon / Avatar */}
              <div className={cn(
                "flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full border text-xs font-medium shadow-sm mt-1 overflow-hidden",
                msg.role === "user" 
                  ? "border-zinc-200 bg-zinc-100 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-400"
                  : "border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-400"
              )}>
                {msg.role === "user" ? (
                    userAvatar ? (
                        <img src={userAvatar} alt="You" className="h-full w-full object-cover" />
                    ) : (
                        <span>{getInitials(userName)}</span>
                    )
                ) : (
                    <Bot className="h-4 w-4" />
                )}
              </div>

              {/* Content Container */}
              <div className={cn(
                  "flex-1 min-w-0 space-y-1 flex flex-col",
                  msg.role === "user" ? "items-end" : "items-start"
              )}>

                {editingId === msg.id ? (
                  <div className="mt-2 space-y-2 text-left w-full max-w-[75%]">
                    <Textarea
                      value={draft}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDraft(e.target.value)}
                      className="min-h-[100px] bg-white dark:bg-zinc-900"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" onClick={() => {
                        onEditMessage(msg.id, draft)
                        setEditingId(null)
                      }}><Check className="w-3 h-3 mr-1"/> Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className={cn(
                      "rounded-2xl px-4 py-3 shadow-sm text-sm leading-relaxed border max-w-[100%] text-left",
                      msg.role === "user" 
                        ? "bg-zinc-100 border-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 rounded-tr-none"
                        : "bg-white border-transparent dark:bg-zinc-900/50 dark:border-zinc-800 text-zinc-800 dark:text-zinc-100 rounded-tl-none"
                  )}>
                     {msg.content ? (
                        <div className={cn(
                          "prose prose-sm dark:prose-invert max-w-none break-words",
                          "prose-table:border-collapse prose-th:bg-zinc-100 dark:prose-th:bg-zinc-800 prose-td:border prose-th:border prose-td:border-zinc-200 dark:prose-td:border-zinc-700 prose-th:p-2 prose-td:p-2"
                        )}>
                            <ReactMarkdown 
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline" />,
                                    code: ({node, className, children, ...props}) => {
                                        return (
                                            <code className={cn("bg-zinc-100 dark:bg-zinc-800 rounded px-1 py-0.5 font-mono text-xs", className)} {...props}>
                                                {children}
                                            </code>
                                        )
                                    },
                                    pre: ({node, ...props}) => (
                                        <pre className="bg-zinc-900 text-zinc-100 p-3 rounded-lg overflow-x-auto my-2" {...props} />
                                    )
                                }}
                            >
                                {msg.content + (isStreaming ? "▍" : "")}
                            </ReactMarkdown>
                        </div>
                     ) : (
                        <span className="flex items-center gap-2 text-zinc-400">
                             Thinking <span className="animate-pulse">...</span>
                        </span>
                     )}
                  </div>
                )}
                
                {/* Actions */}
                {!editingId && !isThinking && (
                   <div className={cn(
                       "flex gap-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity",
                       msg.role === "user" ? "justify-end" : "justify-start"
                   )}>
                      {msg.role === "user" && (
                         <button onClick={() => { setEditingId(msg.id); setDraft(msg.content); }} className="p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded dark:hover:bg-zinc-800" title="Edit">
                           <Pencil className="w-3.5 h-3.5" />
                         </button>
                      )}
                      {msg.role === "assistant" && (
                        <>
                           <button onClick={() => handleCopy(msg.content)} className="p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded dark:hover:bg-zinc-800" title="Copy">
                             <Copy className="w-3.5 h-3.5" />
                           </button>
                           {/* ✅ REMOVED: The regenerate button (RefreshCw) is gone */}
                        </>
                      )}
                   </div>
                )}
              </div>
            </div>
            )
        })}
      </div>

      <div className="p-4 bg-white dark:bg-zinc-950">
         <div className="mx-auto max-w-3xl">
            <Composer 
                ref={internalComposerRef} 
                onSend={onSend} 
                busy={isThinking} 
            />
         </div>
      </div>
    </div>
  )
})

export default ChatPane