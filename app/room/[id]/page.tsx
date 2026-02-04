"use client"

import { Suspense } from "react"
import dynamic from "next/dynamic"

// Dynamic import with SSR disabled to prevent Libp2p/Yjs from loading on the server
// and causing "RangeError: Array buffer allocation failed" during compilation/prerender
const RoomContent = dynamic(() => import("@/components/RoomContent"), {
    ssr: false,
    loading: () => (
        <div className="h-screen w-full flex items-center justify-center bg-white font-mono text-xs uppercase tracking-widest text-black">
            Initializing Environment...
        </div>
    )
})

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
