"use client"

import * as Y from 'yjs'
import { useEffect, useState, useRef } from 'react'
import { WebrtcProvider } from 'y-webrtc'

export function useRealtimeSync(editor: any, roomId: string, username: string) {
  const [doc] = useState(() => new Y.Doc())
  const [provider, setProvider] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  
  // Refs to manage binding lifecycle without re-triggering main useEffect
  const bindingRef = useRef<any>(null)
  
  // 1. Setup Provider & Awareness (One-time setup per room)
  useEffect(() => {
    if (!roomId || typeof window === "undefined") return

    const userColor = '#' + Math.floor(Math.random()*16777215).toString(16)
    
    const yProvider = new WebrtcProvider(roomId, doc, {
      signaling: [
        'wss://y-webrtc-signaling-ws.onrender.com',
        'wss://y-webrtc-signaling-eu.herokuapp.com'
      ]
    })
    
    // Awareness
    yProvider.awareness.setLocalStateField('user', {
      name: username,
      color: userColor
    })

    const updateUsers = () => {
       const states = yProvider.awareness.getStates()
       const activeUsers: any[] = []
       states.forEach((state: any, clientId: any) => {
           if (state.user) {
               activeUsers.push({ clientId, ...state.user })
           }
       })
       setUsers(activeUsers)
    }
    
    yProvider.awareness.on('change', updateUsers)
    updateUsers()

    setProvider(yProvider)

    return () => {
      // Cleanup Binding if exists
      if (bindingRef.current) {
         try { bindingRef.current.destroy() } catch (e) {} 
      }
      yProvider.destroy()
    }
  }, [roomId, doc, username])


  // 2. Handle Editor Binding
  useEffect(() => {
     if (!editor || !provider) return

     let isMounted = true

     const bindEditor = async () => {
         // Cleanup previous binding
         if (bindingRef.current) {
             try {
                bindingRef.current.destroy() 
             } catch (err: any) {
                 // specific yjs error invalid state
                 const msg = err?.message || String(err)
                 if (msg.includes("event handler that doesn't exist")) {
                    // benign
                 } else {
                     console.warn("Binding cleanup warning:", err)
                 }
             }
             bindingRef.current = null
         }

         const { MonacoBinding } = await import('y-monaco')
         if (!isMounted) return

         const yText = doc.getText('monaco') 
         
         const model = editor.getModel()
         
         // Create new binding
         const binding = new MonacoBinding(
            yText,
            model,
            new Set([editor]),
            provider.awareness
         )
         
         bindingRef.current = binding
     }

     bindEditor()

     return () => {
        isMounted = false
     }
  }, [editor, provider, doc])

  return { 
      doc, 
      provider, 
      users
  }
}