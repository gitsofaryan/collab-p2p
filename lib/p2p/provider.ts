import * as Y from 'yjs'
import { Libp2p } from 'libp2p'
import { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate } from 'y-protocols/awareness'
import { toast } from 'sonner'

export class Libp2pProvider {
  public doc: Y.Doc
  public awareness: Awareness
  public node: Libp2p
  public topic: string
  private _connected: boolean = false

  constructor(node: Libp2p, doc: Y.Doc, roomId: string) {
    this.node = node
    this.doc = doc
    this.topic = `collab-space-v1-${roomId}`
    this.awareness = new Awareness(doc)

    // 1. Subscribe to Topic
    this.node.services.pubsub.subscribe(this.topic)

    // 2. Listen for Incoming Messages (GossipSub)
    this.node.services.pubsub.addEventListener('message', (evt: CustomEvent<any>) => {
      const { topic, data, from } = evt.detail
      if (topic !== this.topic) return
      if (from.toString() === this.node.peerId.toString()) return // Ignore self

      this.applyUpdate(data)
    })

    this.setupYjsBindings()
    this.setupAwareness()

    this._connected = true
    console.log(`[Libp2pProvider] Connected to topic: ${this.topic}`)
  }

  // --- Core Logic ---

  private setupYjsBindings() {
    this.doc.on('update', (update: Uint8Array, origin: any) => {
       if (origin !== this) {
         this.publish('doc-update', update)
       }
    })
  }

  private setupAwareness() {
      // Broadcast my state changes
      this.awareness.on('update', ({ added, updated, removed }: any) => {
          const changedClients = added.concat(updated).concat(removed)
          const update = encodeAwarenessUpdate(this.awareness, changedClients)
          this.publish('awareness-update', update)
      })
  }

  // --- PubSub Helper ---

  private async publish(type: 'doc-update' | 'awareness-update', payload: Uint8Array) {
      if (!this._connected) return

      const message = {
          type,
          payload: Array.from(payload) // Convert Uint8Array to array for JSON serialization
      }
      const encoded = new TextEncoder().encode(JSON.stringify(message))
      
      try {
        await this.node.services.pubsub.publish(this.topic, encoded)
      } catch (e) {
        // console.error('Failed to publish update', e) 
        // Silent fail is common in p2p when looking for peers
      }
  }

  private applyUpdate(data: Uint8Array) {
      try {
          const decodedString = new TextDecoder().decode(data)
          const message = JSON.parse(decodedString)
          
          const payload = new Uint8Array(message.payload)

          if (message.type === 'doc-update') {
              Y.applyUpdate(this.doc, payload, this) // Pass 'this' as origin
          } else if (message.type === 'awareness-update') {
               applyAwarenessUpdate(this.awareness, payload, 'remote')
          }
      } catch (e) {
          console.error('Failed to process incoming message', e)
      }
  }

  public destroy() {
     this._connected = false
     try {
        this.node.services.pubsub.unsubscribe(this.topic)
        this.awareness.destroy()
     } catch(e) {
         console.error("Error destroying provider", e)
     }
  }
}
