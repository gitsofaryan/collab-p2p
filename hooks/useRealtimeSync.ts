"use client"

import * as Y from 'yjs'
import { useEffect, useState, useRef } from 'react'
import { toast } from 'sonner'
import { createNode } from '@/lib/p2p/node'
import { Libp2pProvider } from '@/lib/p2p/provider'
import { Libp2p } from 'libp2p'

export function useRealtimeSync(editor: any, roomId: string, username: string) {
  // Use Refs to track instances across async gaps (Ref Tracking Pattern)
  const providerRef = useRef<Libp2pProvider | null>(null)
  const bindingRef = useRef<any>(null)
  const nodeRef = useRef<Libp2p | null>(null)
  
  // State for UI
  const [doc] = useState(() => new Y.Doc())
  const [users, setUsers] = useState<any[]>([])
  const [stats, setStats] = useState({ peers: 0, latency: 0, relay: false, address: '' })

  useEffect(() => {
    if (!roomId || typeof window === "undefined") return

    let isMounted = true

    const init = async () => {
      try {
        // 1. Cleanup any existing instances (Safety Check)
        if (bindingRef.current) {
             bindingRef.current.destroy()
             bindingRef.current = null
        }
        if (providerRef.current) {
             providerRef.current.destroy()
             providerRef.current = null
        }
        if (nodeRef.current) {
             await nodeRef.current.stop()
             nodeRef.current = null
        }

        // 2. Initialize Node
        console.log("Starting Libp2p Node...")
        const node = await createNode()
        if (!isMounted || !node) return
        
        await node.start()
        nodeRef.current = node

        // Debug Events
        node.addEventListener('peer:discovery', (evt) => {
            console.log('Discovered:', evt.detail.id.toString())
        })
        node.addEventListener('peer:connect', (evt) => {
            console.log('Connected to:', evt.detail.toString())
        })
        node.addEventListener('peer:disconnect', (evt) => {
            console.log('Disconnected from:', evt.detail.toString())
        })

        console.log("Libp2p Node Started with ID:", node.peerId.toString())

        // 3. Initialize Provider
        const provider = new Libp2pProvider(node, doc, roomId)
        providerRef.current = provider

        // Initialize Awareness
        const userColor = '#' + Math.floor(Math.random()*16777215).toString(16)
        provider.awareness.setLocalStateField('user', {
            name: username,
            color: userColor
        })

        // Awareness & Stats Listeners
        if (isMounted) {
            // Awareness Listener
            const updateUsers = () => {
                const states = provider.awareness.getStates()
                const activeUsers: any[] = []
                states.forEach((state: any, clientId: any) => {
                    if (state.user) {
                        activeUsers.push({ clientId, ...state.user })
                    }
                })

                setUsers(prevUsers => {
                    const newUsers = activeUsers.filter(u => !prevUsers.some(p => p.clientId === u.clientId))
                    const leftUsers = prevUsers.filter(p => !activeUsers.some(u => u.clientId === p.clientId))

                    if (prevUsers.length > 0) {
                        newUsers.forEach(u => {
                            if (u.name !== username) toast.success(`${u.name} joined`)
                        })
                        leftUsers.forEach(u => {
                            if (u.name !== username) toast.error(`${u.name} left`)
                        })
                    }
                    return activeUsers
                })
            }
            provider.awareness.on('change', updateUsers)
            updateUsers()
        }

        // 4. Bind Editor (if ready)
        if (editor) {
            const { MonacoBinding } = await import('y-monaco')
            if (!isMounted) return

            // CRITICAL: Check if model is still valid before binding
            const model = editor.getModel()
            if (model) {
                const yText = doc.getText('monaco')
                bindingRef.current = new MonacoBinding(
                    yText,
                    model,
                    new Set([editor]),
                    provider.awareness
                )
            }
        }
        
        // Periodic Stats Check
        const interval = setInterval(() => {
            if (nodeRef.current) {
                const peers = nodeRef.current.getPeers()
                const addrs = nodeRef.current.getMultiaddrs()
                const hasRelay = addrs.some(a => a.toString().includes('p2p-circuit'))
                
                setStats({
                    peers: peers.length,
                    latency: 0,
                    relay: hasRelay,
                    address: nodeRef.current.peerId.toString()
                })
            }
        }, 3000)
        
        // Store interval for cleanup
        // Note: Ideally we track this ref too, but for now we clear it in return
        return () => clearInterval(interval)

      } catch (err) {
        console.error("Failed to setup Libp2p:", err)
        if (isMounted) toast.error("Failed to connect to P2P network")
      }
    }

    const cleanupPromise = init()

    // 5. Robust Cleanup Function
    return () => {
        isMounted = false
        
        // Destroy in reverse order of creation
        if (bindingRef.current) {
            try {
                bindingRef.current.destroy()
            } catch (e) { /* suppress */ }
            bindingRef.current = null
        }

        if (providerRef.current) {
             providerRef.current.destroy()
             providerRef.current = null
        }

        if (nodeRef.current) {
             void nodeRef.current.stop()
             nodeRef.current = null
        }
    }
  }, [editor, roomId, doc, username])

  return { 
      doc, 
      provider: providerRef.current,
      node: nodeRef.current,
      users,
      stats
  }
}