"use client"

import { useParams, useSearchParams } from "next/navigation"
import { useState, Suspense } from "react"
import Navbar from "@/components/Navbar"
import dynamic from "next/dynamic"
import { toast } from "sonner"

// Import only the Yjs Sync Hook
import { useRealtimeSync } from "@/hooks/useRealtimeSync"

const Editor = dynamic(() => import("@monaco-editor/react"), {
    ssr: false,
    loading: () => <div className="h-full w-full bg-white animate-pulse" />
})

const Whiteboard = dynamic(() => import("@/components/Whiteboard"), {
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
    const [activeView, setActiveView] = useState<"editor" | "whiteboard">("editor")

    // Reference for the Monaco Editor instance
    const [editorRef, setEditorRef] = useState<any>(null)

    // Activate Real-time Sync via Yjs
    const {
        users
        // We can ignore file props if we are removing the UI for it
    } = useRealtimeSync(editorRef, roomId, username)

    const handleJoin = (name: string) => {
        const trimmedName = name.trim()

        // Validation with toasts
        if (trimmedName.length === 0) {
            toast.error("Enter your username")
            return
        }
        if (trimmedName.length < 3) {
            toast.error("Username must be at least 3 characters long")
            return
        }

        const params = new URLSearchParams(searchParams.toString())
        params.set("username", trimmedName)
        window.history.replaceState(null, "", `?${params.toString()}`)
        setUsername(trimmedName)
        setIsNameDialogOpen(false)
        toast.success(`Welcome, ${trimmedName}!`)
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
        <div className="h-screen flex flex-col bg-zinc-900 overflow-hidden text-black">
            <Navbar
                roomId={roomId}
                username={username}
                users={users}
                activeView={activeView}
                onViewChange={setActiveView}
            />

            <main className="flex-grow relative w-full h-full bg-white overflow-hidden flex">
                {activeView === "editor" ? (
                    <div className="h-full w-full">
                        <Editor
                            height="100%"
                            defaultLanguage="javascript"
                            // Remove defaultValue to let Yjs handle init
                            theme="light"
                            onMount={(editor) => setEditorRef(editor)}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                padding: { top: 20 },
                                automaticLayout: true,
                                wordWrap: "on"
                            }}
                        />
                    </div>
                ) : (
                    <div className="h-full w-full">
                        <Whiteboard />
                    </div>
                )}
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