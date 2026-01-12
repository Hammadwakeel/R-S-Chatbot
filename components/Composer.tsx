"use client"

import React, { useRef, useState, forwardRef, useImperativeHandle, useEffect } from "react"
import { Send, Loader2 } from "lucide-react"
import { cls } from "./utils"

export interface ComposerHandle {
  insertTemplate: (templateContent: string) => void;
  focus: () => void;
}

interface ComposerProps {
  onSend: (text: string) => Promise<void> | void;
  busy: boolean;
}

const Composer = forwardRef<ComposerHandle, ComposerProps>(function Composer({ onSend, busy }, ref) {
  const [value, setValue] = useState("")
  const [sending, setSending] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize logic
  useEffect(() => {
    if (inputRef.current) {
      const textarea = inputRef.current
      textarea.style.height = "auto" // Reset to shrink if needed
      
      const lineHeight = 24
      const minHeight = 24 
      const maxHeight = 200 
      
      const scrollHeight = textarea.scrollHeight
      const newHeight = Math.min(Math.max(minHeight, scrollHeight), maxHeight)
      
      textarea.style.height = `${newHeight}px`
      textarea.style.overflowY = scrollHeight > maxHeight ? "auto" : "hidden"
    }
  }, [value])

  useImperativeHandle(
    ref,
    () => ({
      insertTemplate: (templateContent: string) => {
        setValue((prev) => {
          const newValue = prev ? `${prev}\n\n${templateContent}` : templateContent
          setTimeout(() => {
            inputRef.current?.focus()
            const length = newValue.length
            inputRef.current?.setSelectionRange(length, length)
          }, 0)
          return newValue
        })
      },
      focus: () => {
        inputRef.current?.focus()
      },
    }),
    [],
  )

  async function handleSend() {
    if (!value.trim() || sending) return
    const textToSend = value; 
    setSending(true)
    setValue("")
    
    try {
      await onSend?.(textToSend)
      setTimeout(() => inputRef.current?.focus(), 10)
    } catch (e) {
      setValue(textToSend)
    } finally {
      setSending(false)
    }
  }

  return (
    // ✅ Added 'sticky bottom-0 z-50' to keep it anchored at the bottom
    <div className="sticky bottom-0 z-50 border-t border-zinc-200/60 bg-white p-3 dark:bg-zinc-950 dark:border-zinc-800">
      <div
        className={cls(
          "mx-auto flex items-end gap-2 rounded-3xl border bg-white shadow-sm dark:bg-zinc-950 transition-all duration-200",
          "max-w-3xl border-zinc-300 dark:border-zinc-700 p-2 pl-4",
        )}
      >
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Message..."
          rows={1}
          className={cls(
            "flex-1 resize-none bg-transparent outline-none placeholder:text-zinc-400",
            "text-sm py-2.5 max-h-[200px]",
          )}
          style={{ height: "24px" }} 
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
        />

        <button
          onClick={handleSend}
          disabled={sending || busy || !value.trim()}
          className={cls(
            "mb-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white shadow-sm transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-white dark:text-zinc-900",
            (sending || busy || !value.trim()) && "opacity-50 cursor-not-allowed",
          )}
        >
          {sending || busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4 ml-0.5" />
          )}
        </button>
      </div>

      <div className="hidden sm:block mx-auto mt-2 max-w-3xl px-1 text-[10px] text-zinc-400 dark:text-zinc-500 text-center">
        Enter to send · Shift + Enter for newline
      </div>
    </div>
  )
})

export default Composer