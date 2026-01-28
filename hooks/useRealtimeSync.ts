"use client"

import * as Y from 'yjs'
import { useEffect, useState, useRef } from 'react'
import { WebrtcProvider } from 'y-webrtc'
import { toast } from 'sonner'

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
       
       // Detect user changes and show toasts
       setUsers((prevUsers) => {
           // Find new users (joined)
           const newUsers = activeUsers.filter(
               (user) => !prevUsers.some((prev) => prev.clientId === user.clientId)
           )
           
           // Find removed users (left)
           const leftUsers = prevUsers.filter(
               (prev) => !activeUsers.some((user) => user.clientId === prev.clientId)
           )
           
           // Show toast for joined users (but not on initial load)
           if (prevUsers.length > 0) {
               newUsers.forEach((user) => {
                   if (user.name !== username) {
                       toast.success(`${user.name} joined the room`, {
                           duration: 3000,
                       })
                   }
               })
               
               leftUsers.forEach((user) => {
                   if (user.name !== username) {
                       toast.error(`${user.name} left the room`, {
                           duration: 3000,
                       })
                   }
               })
           }
           
           return activeUsers
       })
    }
    
    yProvider.awareness.on('change', updateUsers)
    updateUsers()

    setProvider(yProvider)

    return () => {
      // Cleanup Binding if exists
      if (bindingRef.current) {
         try { 
           bindingRef.current.destroy()
         } catch (e) {
           // Silently suppress Yjs cleanup errors
         } 
         bindingRef.current = null
      }
      yProvider.destroy()
    }
  }, [roomId, doc, username])


  // 2. Handle Editor Binding
  useEffect(() => {
     if (!editor || !provider) return

     let isMounted = true

     const bindEditor = async () => {
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
        
        // Cleanup binding when editor changes or unmounts
        if (bindingRef.current) {
          try {
            bindingRef.current.destroy()
          } catch (e) {
            // Silently suppress Yjs cleanup errors
          }
          bindingRef.current = null
        }
     }
  }, [editor, provider, doc])

  return { 
      doc, 
      provider, 
      users
  }
}