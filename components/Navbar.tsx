"use client"

import { Code2, PenTool, Share2, Users, ChevronDown } from "lucide-react"
import { toast } from "sonner"
import { useState } from "react"

interface NavbarProps {
    roomId: string
    username: string
    users: any[]
    activeView: "editor" | "whiteboard"
    onViewChange: (view: "editor" | "whiteboard") => void
}

export default function Navbar({ roomId, username, users, activeView, onViewChange }: NavbarProps) {
    const [isUsersOpen, setIsUsersOpen] = useState(false)

    return (
        <nav className="w-full h-16 bg-white border-b border-gray-400 flex items-center justify-between px-4 z-50 shadow-sm">
            {/* Logo and Room ID */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-black rounded flex items-center justify-center shadow-lg group">
                        <span className="text-white font-black text-xs italic group-hover:scale-110 transition-transform">CS</span>
                    </div>
                    <span className="font-bold text-lg tracking-tight hidden md:block">Collab Space</span>
                </div>

                <div className="h-6 w-px bg-gray-200 hidden md:block" />

                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                        Room
                    </span>
                    <span className="text-sm font-mono font-bold text-gray-700 leading-tight">
                        {roomId}
                    </span>
                </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-3">
                {/* Users Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setIsUsersOpen(!isUsersOpen)}
                        className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-md border border-gray-100 transition-colors"
                    >
                        <div className="flex -space-x-2">
                            {users.slice(0, 3).map((user, i) => (
                                <div
                                    key={user.clientId || i}
                                    className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold text-white ring-2 ring-white"
                                    style={{ backgroundColor: user.color || '#000' }}
                                    title={user.name}
                                >
                                    {user.name?.slice(0, 2).toUpperCase() || 'AN'}
                                </div>
                            ))}
                        </div>
                        <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${users.length > 0 ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                            {users.length}
                        </span>
                        <ChevronDown className="w-3 h-3 text-gray-400" />
                    </button>

                    {/* Dropdown Menu */}
                    {isUsersOpen && (
                        <>
                            <div
                                className="fixed inset-0 z-40"
                                onClick={() => setIsUsersOpen(false)}
                            />
                            <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden">
                                <div className="p-3 bg-gray-50 border-b border-gray-100">
                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Online Users ({users.length})</h3>
                                </div>
                                <div className="max-h-64 overflow-y-auto p-2 flex flex-col gap-1">
                                    {users.map((user) => (
                                        <div key={user.clientId} className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 transition-colors">
                                            <div
                                                className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm ring-2 ring-white shrink-0"
                                                style={{ backgroundColor: user.color }}
                                            >
                                                {user.name?.slice(0, 2).toUpperCase() || 'AN'}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-sm font-bold text-gray-700 truncate">
                                                    {user.name || 'Anonymous'}
                                                    {user.name === username && <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">YOU</span>}
                                                </span>
                                                <span className="text-[10px] text-gray-400 font-mono truncate">ID: {user.clientId}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="h-6 w-px bg-gray-200 mx-1 hidden sm:block" />

                {/* View Switcher */}
                <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg border border-gray-200">
                    <button
                        onClick={() => onViewChange("editor")}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeView === "editor"
                                ? "bg-white text-black shadow-sm ring-1 ring-black/5"
                                : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                            }`}
                        title="Switch to Code Editor"
                    >
                        <Code2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Editor</span>
                    </button>
                    <button
                        onClick={() => onViewChange("whiteboard")}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeView === "whiteboard"
                                ? "bg-white text-black shadow-sm ring-1 ring-black/5"
                                : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                            }`}
                        title="Switch to Whiteboard"
                    >
                        <PenTool className="w-4 h-4" />
                        <span className="hidden sm:inline">Canvas</span>
                    </button>
                </div>

                <button
                    onClick={() => {
                        const url = window.location.origin + window.location.pathname
                        navigator.clipboard.writeText(url)
                        toast.success("Room link copied to clipboard!")
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-black text-white hover:bg-zinc-800 text-xs font-bold rounded-lg transition-colors shadow-sm ml-2"
                >
                    <Share2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Share</span>
                </button>
            </div>
        </nav>
    )
}
