"use client"

import * as Y from 'yjs'
import { useEffect, useState } from 'react'
import { WebrtcProvider } from 'y-webrtc'

export function useRealtimeSync(editor: any, roomId: string, username: string) {
  const [doc] = useState(() => new Y.Doc())
  const [provider, setProvider] = useState<any>(null)
  const [binding, setBinding] = useState<any>(null)
  // Change userCount to users array
  const [users, setUsers] = useState<any[]>([])

  useEffect(() => {
    if (!editor || !roomId || typeof window === "undefined") return

    const userColor = '#' + Math.floor(Math.random()*16777215).toString(16)
    let yProvider: any
    let yBinding: any
    let isMounted = true

    const init = async () => {
      // 1. Setup WebRTC Provider
      yProvider = new WebrtcProvider(roomId, doc, {
        signaling: [
          'wss://y-webrtc-signaling-ws.onrender.com', // Public signaling server
          'wss://y-webrtc-signaling-eu.herokuapp.com'
        ]
      })
      
      // Awareness & User Count
      yProvider.awareness.setLocalStateField('user', {
        name: username,
        color: userColor
      })

      // Update users list on changes
      const updateUsers = () => {
         const states = yProvider.awareness.getStates()
         const activeUsers: any[] = []
         states.forEach((state: any, clientId: any) => {
             if (state.user) {
                 activeUsers.push({
                     clientId,
                     ...state.user
                 })
             }
         })
         setUsers(activeUsers)
      }
      
      yProvider.awareness.on('change', updateUsers)
      updateUsers() // Initial sync

      if (!isMounted) {
          yProvider.destroy()
          return
      }
      
      setProvider(yProvider)

      const { MonacoBinding } = await import('y-monaco')
      if (!isMounted) return // Double check before binding

      const yText = doc.getText('monaco') 

      // 2. Bind Editor
      yBinding = new MonacoBinding(
        yText, 
        editor.getModel(), 
        new Set([editor]),
        yProvider.awareness
      )
      
      setBinding(yBinding)
      console.log(`✅ Sync Active for Room: ${roomId} as ${username}`)
    }

    init()

    return () => {
      isMounted = false
      if (yBinding) {
        try {
            yBinding.destroy()
        } catch (err) {
            // Ignore error if binding is already destroyed or listener missing
            console.warn("Yjs Binding destroy warning:", err)
        }
      }
      if (yProvider) {
        try {
            yProvider.destroy()
        } catch (err) {
            console.warn("Yjs Provider destroy warning:", err)
        }
      }
    }
  }, [editor, roomId, doc, username])

  return { doc, provider, users }
}