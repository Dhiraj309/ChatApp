"use client"

import { useState } from "react"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import SplitText from "@/components/SplitText"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Menu } from "lucide-react"
import { FaPlus } from 'react-icons/fa'
import { FaArrowUp } from 'react-icons/fa6'
import { ThemeProvider } from "next-themes"

export default function Chat() {
  const [collapsed, setCollapsed] = useState(true)
  const [selected, setSelected] = useState("Default") // tracks dropdown
  const [messages, setMessages] = useState<
    { role: "user" | "ai" | "ai-temp"; text: string; animated?: boolean }[]
  >([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const apiKey = process.env.NEXT_PUBLIC_API_KEY

  // 🔹 Call FastAPI backend (streaming)
  async function sendMessageToBackend(message: string, mode: string, rawText?: string) {
    const payload: any = { message, mode }
    if (mode === "DocAware" && rawText) payload.raw_text = rawText

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload),
    })

    const reader = res.body?.getReader()
    const decoder = new TextDecoder("utf-8")
    let result = ""

    if (reader) {
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          setMessages(prev => [
            ...prev.filter(m => m.role !== "ai-temp"),
            { role: "ai", text: result, animated: true },
          ])
          break
        }
        result += decoder.decode(value, { stream: true })
        setMessages(prev => [
          ...prev.filter(m => m.role !== "ai-temp"),
          { role: "ai-temp", text: result, animated: false },
        ])
      }
    }

    return result
  }

  // 🔹 Send user message
  // 🔹 Send user message
  async function handleSend(rawText?: string) {
    if (!input.trim() && !rawText) return

    const userMessage = input || rawText || ""
    setMessages(prev => [...prev, { role: "user", text: userMessage }])
    setInput("")
    setLoading(true)

    // ✅ Load stored doc text if in DocAware mode
    const docText = selected === "DocAware" ? localStorage.getItem("doc_text") : ""

    await sendMessageToBackend(userMessage, selected, docText || undefined)
    setLoading(false)
  }


  function getInitials(name?: string) {
    if (!name) return "U"
    const parts = name.trim().split(" ")
    if (parts.length === 1) return parts[0][0].toUpperCase()
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }

  const storedName = typeof window !== "undefined" ? localStorage.getItem("userName") : null
  const userName = storedName ?? "User"

  // 🔹 Handle file upload for DocAware
  // 🔹 Handle file upload for DocAware
  async function handleFileUpload(file: File) {
    const formData = new FormData()
    formData.append("file", file)

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/upload`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}` },
      body: formData,
    })

    const data = await res.json()
    if (data.text) {
      // ✅ Store extracted document text locally
      localStorage.setItem("doc_text", data.text)

      // ✅ Notify user that document is loaded
      setMessages(prev => [
        ...prev,
      ])
    } else {
      setMessages(prev => [
        ...prev,
        { role: "ai", text: "❌ Failed to extract text from document." }
      ])
    }
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <div className="flex h-screen w-screen">
        {/* Sidebar */}
        <aside className={`${collapsed ? "w-16" : "w-64"} border-r p-4 flex flex-col transition-all duration-300`}>
          <div className="flex items-center justify-between mb-4">
            {!collapsed && <h2 className="text-lg font-semibold">Menu</h2>}
            <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)}>
              <Menu className="h-5 w-5" />
            </Button>
          </div>

          {!collapsed && (
            <>
              <div className="flex flex-col">
                <Button className="mb-2">Reset Chat</Button>
              </div>

              <div className="mt-auto flex flex-col items-center gap-2">
                <div className="flex items-center gap-2">
                  <Avatar>
                    <AvatarImage src="https://github.com/shadcn.png" />
                    <AvatarFallback>{getInitials(userName)}</AvatarFallback>
                  </Avatar>
                  <span className="ml-2">{userName}</span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    localStorage.removeItem("token")
                    localStorage.removeItem("userName")
                    setMessages([])
                    window.location.href = "/login"
                  }}
                >
                  Logout
                </Button>
              </div>
            </>
          )}
        </aside>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          <ScrollArea className="flex-1 p-6">
            <div className="max-w-2xl mx-auto flex flex-col gap-6">
              {messages.map((msg, idx) =>
                msg.role === "ai" || msg.role === "ai-temp" ? (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">AI</div>
                    <div className="rounded-2xl px-4 py-2 bg-muted text-foreground max-w-lg text-justify">
                      {msg.animated ? (
                        <SplitText text={msg.text} className="text-base text-justify" delay={100} duration={0.5} ease="power3.out" splitType="words" from={{ opacity: 0, y: 10 }} to={{ opacity: 1, y: 0 }} />
                      ) : (
                        <p className="text-justify">{msg.text}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div key={idx} className="flex items-start gap-3 justify-end">
                    <div className="rounded-2xl px-4 py-2 bg-primary text-primary-foreground max-w-lg">{msg.text}</div>
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-semibold text-primary-foreground">U</div>
                  </div>
                )
              )}
              {loading && <div className="text-sm text-gray-500">AI is typing...</div>}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 border-t">
            <div className="max-w-2xl mx-auto relative">
              <Input
                placeholder="Type your message..."
                className="h-16 pr-20 rounded-xl"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
              />

              {/* Hidden File Input */}
              <input
                type="file"
                accept=".txt,.pdf,.doc,.docx"
                id="file-upload"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  await handleFileUpload(file)
                  e.target.value = ""
                }}
              />

              <div className="absolute right-2 bottom-2 flex gap-2">
                {/* Dropdown Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <FaPlus className="h-6 w-6" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>More Options</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {["Default", "DocAware", "WebSearch", "ImageGeni"].map((item) => (
                      <DropdownMenuItem
                        key={item}
                        onSelect={() => {
                          setSelected(item)
                          if (item === "DocAware") {
                            document.getElementById("file-upload")?.click()
                          }
                        }}
                      >
                        {item}
                        {selected === item && <Check className="mr-2 h-4 w-4" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Send Button */}
                <Button size="icon" className="h-8 w-8 rounded-full fg-white" onClick={() => handleSend()}>
                  <FaArrowUp className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ThemeProvider>
  )
}
