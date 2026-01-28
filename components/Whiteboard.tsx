"use client"

import { Tldraw } from "tldraw"
import "tldraw/tldraw.css"

export default function Whiteboard() {
    return (
        <div className="w-full h-full relative">
            <Tldraw persistenceKey="tldraw-persistence" />
        </div>
    )
}
