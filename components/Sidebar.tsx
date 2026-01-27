"use client"

import { Code2, PenTool, Hash, User, Share2, LogOut, Users } from "lucide-react"
import { toast } from "sonner"

interface SidebarProps {
    roomId: string
    username: string
    users: any[] // Array of connected users
}

export default function Sidebar({ roomId, username, users }: SidebarProps) {
    return (
        <aside className="w-64 h-full bg-white border-r border-gray-400 flex flex-col pt-6 pb-4 px-4 gap-6 z-50 shadow-sm">
            {/* Logo */}
            <div className="flex items-center gap-3 px-2">
                <div className="w-8 h-8 bg-black rounded flex items-center justify-center shadow-lg group">
                    <span className="text-white font-black text-xs italic group-hover:scale-110 transition-transform">CS</span>
                </div>
                <span className="font-bold text-lg tracking-tight">Collab Space</span>
            </div>

            <div className="w-full h-px bg-gray-100" />

            {/* Online Users List */}
            <div className="flex-grow flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-2 mb-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active Users</p>
                    <span className="bg-green-100 text-green-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                        {users.length}
                    </span>
                </div>

                <div className="flex-col gap-2 overflow-y-auto px-1 pr-2 hidden md:flex">
                    {users.map((user) => (
                        <div key={user.clientId} className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 transition-colors">
                            <div
                                className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm ring-2 ring-white"
                                style={{ backgroundColor: user.color }}
                            >
                                {user.name?.slice(0, 2).toUpperCase() || 'AN'}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-gray-700 leading-tight flex items-center gap-1">
                                    {user.name || 'Anonymous'}
                                    {user.name === username && <span className="text-[8px] bg-gray-200 text-gray-600 px-1 rounded">YOU</span>}
                                </span>
                                <span className="text-[9px] text-gray-400 font-mono">ID: {user.clientId.toString().slice(0, 4)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 border rounded-lg border-gray-500">
                <button
                    onClick={() => {
                        const url = window.location.origin + window.location.pathname
                        navigator.clipboard.writeText(url)
                        toast.success("Room link copied to clipboard!")
                    }}
                    className="w-full flex items-center justify-center gap-2 p-2 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold text-xs rounded-lg transition-colors border border-gray-200"
                >
                    <Share2 className="w-3.5 h-3.5" />
                    Share Room Link
                </button>
            </div>
        </aside>
    )
}
