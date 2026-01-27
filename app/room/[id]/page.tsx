"use client"

import { useParams, useSearchParams } from "next/navigation"
import { useState, useEffect, Suspense } from "react"
import Sidebar from "@/components/Sidebar"
import dynamic from "next/dynamic"

// Import only the Yjs Sync Hook
import { useRealtimeSync } from "@/hooks/useRealtimeSync"
// import { useTldrawSync } from "@/hooks/useTldrawSync" <-- Disabled

const Editor = dynamic(() => import("@monaco-editor/react"), {
    ssr: false,
    loading: () => <div className="h-full w-full bg-white animate-pulse" />
})
function RoomContent() {
    const params = useParams()
    const roomId = params?.id as string
    const searchParams = useSearchParams()

    // UI State
    const [username, setUsername] = useState(() => searchParams.get("username") || "")
    const [isNameDialogOpen, setIsNameDialogOpen] = useState(!searchParams.get("username"))

    // Reference for the Monaco Editor instance
    const [editorRef, setEditorRef] = useState<any>(null)

    // Activate Real-time Sync via Yjs
    // We pass username now for awareness
    const { doc, provider, users } = useRealtimeSync(editorRef, roomId, username)

    const handleJoin = (name: string) => {
        if (!name.trim()) return
        const params = new URLSearchParams(searchParams.toString())
        params.set("username", name)
        window.history.replaceState(null, "", `?${params.toString()}`)
        setUsername(name)
        setIsNameDialogOpen(false)
    }

    if (isNameDialogOpen) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-gray-50">
                <div className="bg-white p-8 rounded-lg shadow-lg w-96 text-black">
                    <h2 className="text-xl font-bold mb-4">Join Room</h2>
                    <form onSubmit={(e) => {
                        e.preventDefault()
                        handleJoin((e.currentTarget.elements.namedItem('username') as HTMLInputElement).value)
                    }}>
                        <input
                            name="username"
                            autoFocus
                            placeholder="Enter your name..."
                            className="w-full border p-2 mb-4 rounded text-black placeholder:text-gray-400"
                            autoComplete="off"
                        />
                        <button type="submit" className="w-full bg-black text-white p-2 rounded font-bold">
                            Join
                        </button>
                    </form>
                </div>
            </div>
        )
    }

    return (
        <div className="h-screen flex bg-zinc-900 overflow-hidden text-black">
            <Sidebar
                roomId={roomId}
                username={username}
                users={users}
            />

            <main className="flex-grow relative h-full bg-white">
                <div className="h-full w-full">
                    <Editor
                        height="100%"
                        defaultLanguage="javascript"
                        defaultValue="// Real-time Session Active. Type to sync..."
                        theme="light"
                        onMount={(editor) => setEditorRef(editor)} // Captures ref for Yjs
                        options={{
                            minimap: { enabled: false },
                            fontSize: 14,
                            padding: { top: 20 },
                            automaticLayout: true,
                            wordWrap: "on"
                        }}
                    />
                </div>
            </main>
        </div>
    )
}

export default function RoomPage() {
    return (
        <Suspense fallback={
            <div className="h-screen w-full flex items-center justify-center bg-white font-mono text-xs uppercase tracking-widest text-black">
                Loading Workspace...
            </div>
        }>
            <RoomContent />
        </Suspense>
    )
}