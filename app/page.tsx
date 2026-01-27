"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Hash, User, Zap } from "lucide-react"

export default function Home() {
  const router = useRouter()
  const [roomId, setRoomId] = useState("")
  const [username, setUsername] = useState("")

  const generateId = () => {
    const id = Math.random().toString(36).substring(2, 10)
    setRoomId(id)
  }

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!roomId || !username) return
    router.push(`/room/${roomId}?username=${encodeURIComponent(username)}`)
  }

  return (
    <main className="min-h-screen bg-white text-black flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-[320px] space-y-8">

        {/* Logo Section */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 border-2 border-black flex items-center justify-center">
            <Zap className="w-6 h-6 fill-black" />
          </div>
          <h1 className="text-xl font-bold tracking-tight uppercase italic">
            Collab Space
          </h1>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          {/* Username Input */}
          <div className="relative border-b border-black py-2 ">
            <User className="absolute left-0 top-3 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full pl-6 focus:outline-none placeholder:text-gray-500"
              required
            />
          </div>

          {/* Room ID Input */}
          <div className="relative border-b border-black py-2">
            <Hash className="absolute left-0 top-3 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full pl-6 focus:outline-none placeholder:text-gray-500"
              required
            />
          </div>

          {/* Generate Action */}
          <div className="flex justify-end">
            <span
              onClick={generateId}
              className="text-[10px] font-bold uppercase cursor-pointer hover:underline tracking-widest text-gray-500"
            >
              Generate Unique ID
            </span>
          </div>

          {/* Join Button */}
          <button
            type="submit"
            className="w-full bg-black text-white py-3 font-bold uppercase tracking-widest text-sm hover:bg-gray-800 transition-colors"
          >
            Join Space
          </button>
        </form>

        <footer className="pt-8 text-center">
          <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em]">
            P2P • Local-First • OrbitDB
          </p>
        </footer>
      </div>
    </main>
  )
}