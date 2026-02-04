import * as Y from 'yjs'
import { Libp2p } from 'libp2p'
import { fromString, toString } from 'uint8arrays'
import { encodeAwarenessUpdate, applyAwarenessUpdate, Awareness } from 'y-protocols/awareness'
import { INTERVALS, DEBUG } from './constants'

export interface ProviderOptions {
  awareness?: Awareness
}

export class Libp2pProvider {
  public topic: string
  public doc: Y.Doc
  public libp2p: Libp2p
  public awareness: Awareness
  private _syncInterval: any
  private _isDestroyed: boolean = false

  constructor(topic: string, doc: Y.Doc, libp2p: Libp2p, options: ProviderOptions = {}) {
    this.topic = topic
    this.doc = doc
    this.libp2p = libp2p
    this.awareness = options.awareness || new Awareness(doc)

    // Bind event handlers
    this._onMessage = this._onMessage.bind(this)
    
    // Subscribe to PubSub
    const pubsub = this.libp2p.services.pubsub as any
    pubsub.addEventListener('message', this._onMessage)
    pubsub.subscribe(this.topic)

    // Sync Doc Updates
    this.doc.on('update', (update, origin) => {
      if (origin !== this) {
        this._publish({
          type: 'syncUpdate',
          topic: this.topic,
          update: toString(update, 'base64')
        })
      }
    })

    // Sync Awareness Updates
    this.awareness.on('update', ({ added, updated, removed }) => {
      const changedClients = added.concat(updated).concat(removed)
      this._publish({
        type: 'awareness',
        topic: this.topic,
        update: toString(encodeAwarenessUpdate(this.awareness, changedClients), 'base64')
      })
    })

    // Request initial state
    this._requestInitialState()

    if (DEBUG) console.log(`📡 Provider initialized on topic: ${this.topic}`)
  }

  private _requestInitialState() {
    const request = {
      type: 'syncRequest',
      topic: this.topic
    }
    this._publish(request)

    // Retry initial sync request if document is still empty
    this._syncInterval = setInterval(() => {
      if (this._isDestroyed) return
      
      const monacoText = this.doc.getText('monaco')
      if (monacoText.length === 0) {
        if (DEBUG) console.log(`🔄 Retrying initial sync for ${this.topic}...`)
        this._publish(request)
      } else {
        clearInterval(this._syncInterval)
      }
    }, INTERVALS.INITIAL_SYNC_REQUEST)
  }

  private async _publish(message: any) {
    if (this._isDestroyed) return
    try {
      const data = fromString(JSON.stringify(message), 'utf8')
      const pubsub = this.libp2p.services.pubsub as any
      await pubsub.publish(this.topic, data)
    } catch (err: any) {
      if (DEBUG) console.error('❌ Failed to publish message:', err.message)
    }
  }

  private _onMessage(evt: any) {
    if (this._isDestroyed) return
    const { topic, data } = evt.detail
    if (topic !== this.topic) return

    try {
      const message = JSON.parse(toString(data, 'utf8'))
      if (message.topic !== this.topic) return

      switch (message.type) {
        case 'syncRequest':
          if (DEBUG) console.log(`📥 Received syncRequest on ${this.topic}`)
          this._publish({
            type: 'syncUpdate',
            topic: this.topic,
            update: toString(Y.encodeStateAsUpdate(this.doc), 'base64')
          })
          break
        case 'syncUpdate':
          if (DEBUG) console.log(`📥 Received syncUpdate on ${this.topic}`)
          Y.applyUpdate(this.doc, fromString(message.update, 'base64'), this)
          break
        case 'awareness':
          if (DEBUG) console.log(`📥 Received awareness on ${this.topic}`)
          applyAwarenessUpdate(this.awareness, fromString(message.update, 'base64'), this)
          break
        default:
          if (DEBUG) console.warn('❓ Unknown message type:', message.type)
      }
    } catch (err) {
      if (DEBUG) console.error('❌ Error parsing message:', err)
    }
  }

  destroy() {
    this._isDestroyed = true
    if (this._syncInterval) clearInterval(this._syncInterval)
    
    const pubsub = this.libp2p.services.pubsub as any
    if (pubsub) {
        pubsub.removeEventListener('message', this._onMessage)
        pubsub.unsubscribe(this.topic)
    }
    if (DEBUG) console.log(`🛑 Provider destroyed for topic: ${this.topic}`)
  }
}
