"use client";

import { useP2P } from "@/hooks/useP2P";
import { RealtimeEditor } from "@/components/editor/RealtimeEditor";
import { Users, Radio, Loader2 } from "lucide-react";

export default function EditorPage() {
    const { doc, provider, status, peers, isConnected } = useP2P("code-editor-demo");

    return (
        <div className="flex flex-col h-screen bg-neutral-950 text-white font-sans">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-neutral-900">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-500/20">
                        <Radio className="w-5 h-5 text-white animate-pulse" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold tracking-tight text-neutral-100">
                            P2P Realtime Editor
                        </h1>
                        <p className="text-xs text-neutral-400">
                            Powered by Libp2p + Yjs
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {/* Connection Status */}
                    <div className="flex items-center gap-2 text-sm bg-neutral-800 px-3 py-1.5 rounded-full border border-neutral-700">
                        {isConnected ? (
                            <>
                                <span className="relative flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                </span>
                                <span className="text-emerald-400 font-medium">Online</span>
                            </>
                        ) : (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                                <span className="text-amber-500 font-medium">{status.split('...')[0]}</span>
                            </>
                        )}

                    </div>

                    {/* Peer Count */}
                    <div className="flex items-center gap-2 text-sm">
                        <Users className="w-4 h-4 text-cyan-400" />
                        <span className="font-mono text-cyan-400 font-bold">{peers.length}</span>
                        <span className="text-neutral-500 hidden sm:inline">peers active</span>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex overflow-hidden">
                {/* Sidebar (Optional - could list peers here) */}
                <aside className="hidden md:flex flex-col w-64 border-r border-gray-800 bg-neutral-900 p-4">
                    <h2 className="text-xs font-semibold uppercase text-neutral-500 mb-3 tracking-wider">Connected Peers</h2>
                    {peers.length === 0 ? (
                        <div className="text-sm text-neutral-600 italic">Waiting for peers to join...</div>
                    ) : (
                        <ul className="space-y-2">
                            {peers.map((peer) => (
                                <li key={peer} className="flex items-center gap-2 px-3 py-2 bg-neutral-800/50 rounded-md border border-neutral-800 text-xs font-mono text-neutral-300">
                                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-500"></div>
                                    {peer.slice(-8)}
                                </li>
                            ))}
                        </ul>
                    )}
                </aside>

                {/* Editor Area */}
                <div className="flex-1 relative">
                    <RealtimeEditor doc={doc} provider={provider} />

                    {/* Overlay Loading State (Initial) */}
                    {!isConnected && (
                        <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center z-50">
                            <div className="flex flex-col items-center gap-3">
                                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                <span className="text-neutral-300 text-sm font-medium">{status}</span>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
