"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import SplitText from "@/components/SplitText"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

import { Menu } from "lucide-react"
import { FaArrowUp, FaPlus } from "react-icons/fa"

import { ThemeProvider } from "next-themes";

export default function Chat() {
  // console.log("API Key:", process.env.NEXT_PUBLIC_API_KEY);
  const [collapsed, setCollapsed] = useState(true)

  // now messages can have ai-temp and animated flag
  const [messages, setMessages] = useState<
    { role: "user" | "ai" | "ai-temp"; text: string; animated?: boolean }[]
  >([])

  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const apiKey = process.env.NEXT_PUBLIC_API_KEY;

  // 🔹 Call FastAPI backend (streaming)
  async function sendMessageToBackend(message: string) {
    const res = await fetch("http://localhost:8000/chat/", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({ message }),
    })

    const reader = res.body?.getReader()
    const decoder = new TextDecoder("utf-8")
    let result = ""

    if (reader) {
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          // ✅ When streaming ends → replace temp with final animated message
          setMessages(prev => [
            ...prev.filter(m => m.role !== "ai-temp"),
            { role: "ai", text: result, animated: true },
          ])
          break
        }

        result += decoder.decode(value, { stream: true })

        // 🔹 Keep updating a temporary AI message (no animation yet)
        setMessages(prev => [
          ...prev.filter(m => m.role !== "ai-temp"),
          { role: "ai-temp", text: result, animated: false },
        ])
      }
    }

    return result
  }

  // 🔹 Handle sending message
  async function handleSend() {
    if (!input.trim()) return
    const userMessage = input
    setMessages(prev => [...prev, { role: "user", text: userMessage }])
    setInput("")
    setLoading(true)

    await sendMessageToBackend(userMessage)
    setLoading(false)
  }

function getInitials(name?: string) {
  if (!name) return "U";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const storedName = typeof window !== "undefined" ? localStorage.getItem("userName") : null
const userName = storedName ?? "User"  // fallback to "User"

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        
      <div className="flex h-screen w-screen">
        {/* Sidebar */}
        <aside
          className={`${collapsed ? "w-16" : "w-64"} border-r p-4 flex flex-col transition-all duration-300`}
        >
          <div className="flex items-center justify-between mb-4">
            {!collapsed && <h2 className="text-lg font-semibold">Menu</h2>}
            <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)}>
              <Menu className="h-5 w-5" />
            </Button>
          </div>

          {!collapsed && (
            <>
              <div className="flex flex-col">
                {/* <Button className="mb-2">+ New Chat</Button> */}
                <Button className="mb-2">Reset Chat</Button>
              </div>

              {/* Avatar pinned at bottom */}
              <div className="mt-auto flex items-center gap-2">
              <Avatar>
                <AvatarImage src="https://github.com/shadcn.png" />
                <AvatarFallback>{userName[0].toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="ml-2">{userName}</span>

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
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
                      AI
                    </div>
                    <div className="rounded-2xl px-4 py-2 bg-muted text-foreground max-w-lg text-justify">
                      {msg.animated ? (
                        <SplitText
                          text={msg.text}
                          className="text-base text-justify"
                          delay={100}
                          duration={0.5}
                          ease="power3.out"
                          splitType="words"
                          from={{ opacity: 0, y: 10 }}
                          to={{ opacity: 1, y: 0 }}
                        />
                      ) : (
                        <p className="text-justify">{msg.text}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div key={idx} className="flex items-start gap-3 justify-end">
                    <div className="rounded-2xl px-4 py-2 bg-primary text-primary-foreground max-w-lg">
                      {msg.text}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-semibold text-primary-foreground">
                      U
                    </div>
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

                  const formData = new FormData()
                  formData.append("file", file)

                  const res = await fetch("http://localhost:8000/chat/upload", {
                    method: "POST",
                    body: formData,
                  })

                  const data = await res.json()
                  if (data.text) {
                    // Add extracted text into chat as a "user" message
                    setMessages(prev => [...prev, { role: "user", text: data.text }])
                  }

                  e.target.value = "" // reset file input
                }}
              />

              <div className="absolute right-2 bottom-2 flex gap-2">
                <Button size="icon" className="h-8 w-8 rounded-full" onClick={() => document.getElementById("file-upload")?.click()}>
                  <FaPlus className="h-4 w-4" />
                </Button>
                <Button size="icon" className="h-8 w-8 rounded-full" onClick={handleSend}>
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
