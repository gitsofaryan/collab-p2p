import { useEffect, useState, useRef } from 'react'
import * as Y from 'yjs'
import { createNode } from '@/lib/p2p/node'
import { Libp2pProvider } from '@/lib/p2p/provider'
import { Libp2p } from 'libp2p'

export function useP2P(topic: string = 'editor-demo-v1') {
  const [doc] = useState(() => new Y.Doc())
  const [provider, setProvider] = useState<Libp2pProvider | null>(null)
  const [node, setNode] = useState<Libp2p | null>(null)
  const [status, setStatus] = useState<string>('Initializing...')
  const [peers, setPeers] = useState<string[]>([])
  const [isConnected, setIsConnected] = useState(false)

  // Use a ref to prevent double initialization in Strict Mode
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const init = async () => {
      try {
        setStatus('Starting Libp2p node...')
        const libp2pNode = await createNode()
        
        if (!libp2pNode) {
          setStatus('Failed to create node (SSR?)')
          return
        }

        setNode(libp2pNode)
        setStatus('Node started. Connecting to Relay...')

        await libp2pNode.start()
        const peerIdShort = libp2pNode.peerId.toString().slice(-4)
        console.log(`Node started with ID: ...${peerIdShort}`)

        // Create Provider
        setStatus(`Joining topic: ${topic}...`)
        const newProvider = new Libp2pProvider(topic, doc, libp2pNode)
        
        setProvider(newProvider)
        setIsConnected(true)
        setStatus('Ready')

        // Listen for peer changes to update UI
        libp2pNode.addEventListener('peer:connect', () => {
           updatePeerList(libp2pNode, topic)
        })
        libp2pNode.addEventListener('peer:disconnect', () => {
           updatePeerList(libp2pNode, topic)
        })
        
        // Also listen to PubSub subscriptions for more accurate "same room" presence
        if (libp2pNode.services.pubsub) {
            libp2pNode.services.pubsub.addEventListener('subscription-change', () => {
                updatePeerList(libp2pNode, topic)
            })
        }
        
        updatePeerList(libp2pNode, topic)

      } catch (err: any) {
        console.error('P2P Init Error:', err)
        setStatus(`Error: ${err.message}`)
      }
    }

    init()

    return () => {
      // Cleanup handled in window 'beforeunload' or manual destroy if needed
      // For hot reload, we might want to destroy, but usually better to keep node alive
      if (provider) {
          // provider.destroy() 
      }
    }
  }, [topic, doc]) // Dependencies should be stable

  const updatePeerList = (node: Libp2p, topic: string) => {
    // Strategy 1: All connected peers (broad)
    // const allPeers = node.getPeers().map(p => p.toString())
    
    // Strategy 2: Peers in the same PubSub topic (more accurate for "in this room")
    let topicPeers: string[] = []
    if (node.services.pubsub) {
        topicPeers = node.services.pubsub.getSubscribers(topic).map((p: any) => p.toString())
    }
    setPeers(topicPeers)
  }

  return {
    doc,
    provider,
    node,
    status,
    peers,
    isConnected
  }
}
