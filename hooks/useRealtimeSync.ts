"use client"

import * as Y from 'yjs'
import { useEffect, useState, useRef, useMemo } from 'react'
import { toast } from 'sonner'
import { createNode } from '@/lib/p2p/node'
import { Libp2pProvider } from '@/lib/p2p/provider'
import { Libp2p } from 'libp2p'

export function useRealtimeSync(editor: any, roomId: string, username: string) {
  // Use Refs to track instances across async gaps
  const providerRef = useRef<Libp2pProvider | null>(null)
  const bindingRef = useRef<any>(null)
  const nodeRef = useRef<Libp2p | null>(null)
  
  // Stable Y.Doc for the lifetime of this hook attachment
  const doc = useMemo(() => new Y.Doc(), [])

  // State for UI
  const [users, setUsers] = useState<any[]>([])
  const [stats, setStats] = useState({ peers: 0, latency: 0, relay: false, address: '' })

    useEffect(() => {
      if (!roomId || typeof window === "undefined") return

      let isMounted = true
      const runId = Math.random().toString(36).substring(7)
      
      const init = async () => {
        try {
          // 1. Cleanup check
          if (nodeRef.current && nodeRef.current.status === 'started') {
             await nodeRef.current.stop()
          }

          // 2. Initialize Node
          const node = await createNode()
          if (!isMounted || !node) {
            if (node) await node.stop()
            return
          }
          
          await node.start()
          nodeRef.current = node
          
          // 3. Initialize Awareness & Provider
          const { Awareness } = await import('y-protocols/awareness')
          if (!isMounted) return

          const awareness = new Awareness(doc)
          const topic = `collab-space-v1-${roomId}`
          const provider = new Libp2pProvider(topic, doc, node, { awareness })
          providerRef.current = provider

          // Set Local State
          const userColor = '#' + Math.floor(Math.random()*16777215).toString(16)
          awareness.setLocalStateField('user', {
              name: username || 'Anonymous',
              color: userColor
          })

          // Awareness & Stats Listeners
          const updateUsers = () => {
              if (!provider.awareness || !isMounted) return
              const states = provider.awareness.getStates()
              const activeUsers: any[] = []
              states.forEach((state: any, clientId: any) => {
                  if (state.user) activeUsers.push({ clientId, ...state.user })
              })
              setUsers(activeUsers)
          }

          provider.awareness.on('change', updateUsers)
          updateUsers()

          // 4. Bind Editor
          if (editor) {
              const { MonacoBinding } = await import('y-monaco')
              if (!isMounted) return

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
          
          // 5. Stats Interval
          const statsInterval = setInterval(() => {
              if (nodeRef.current && isMounted) {
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
          
          return () => clearInterval(statsInterval)

        } catch (err) {
          console.error(`[${runId}] ❌ Sync Error:`, err)
        }
      }

      init()

      return () => {
          isMounted = false
          if (bindingRef.current) {
              bindingRef.current.destroy()
              bindingRef.current = null
          }
          if (providerRef.current) {
               providerRef.current.destroy()
               providerRef.current = null
          }
          if (nodeRef.current) {
               const n = nodeRef.current
               const stopResult = n.stop()
               if (stopResult instanceof Promise) {
                   stopResult.catch((err: Error) => console.error("Error stopping node:", err))
               }
               nodeRef.current = null
          }
      }
    }, [editor, roomId, doc, username])

  return { users, stats }
}
