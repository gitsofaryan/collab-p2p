/* eslint-disable no-console */
import fs from 'node:fs'
import http from 'node:http'
import { createLibp2p } from 'libp2p'
import { webSockets } from '@libp2p/websockets'
import { webRTC, webRTCDirect } from '@libp2p/webrtc'
import { tcp } from '@libp2p/tcp'
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { circuitRelayServer, circuitRelayTransport } from '@libp2p/circuit-relay-v2'
import { identify, identifyPush } from '@libp2p/identify'
import { autoNAT } from '@libp2p/autonat'
import { dcutr } from '@libp2p/dcutr'
import { ping } from '@libp2p/ping'
import { gossipsub } from '@chainsafe/libp2p-gossipsub'
import { pubsubPeerDiscovery } from '@libp2p/pubsub-peer-discovery'
import { createFromJSON, createEd25519PeerId } from '@libp2p/peer-id-factory'
import { privateKeyFromProtobuf } from '@libp2p/crypto/keys'

import { RELAY_CONFIG, TIMEOUTS, INTERVALS, DEBUG } from '../lib/p2p/constants'

const PEER_ID_FILE = 'peer-id.json'

async function main() {
  // 1. Load or Generate PeerID
  let peerId
  try {
    if (fs.existsSync(PEER_ID_FILE)) {
      const peerIdJson = JSON.parse(fs.readFileSync(PEER_ID_FILE, 'utf-8'))
      peerId = await createFromJSON(peerIdJson)
      console.log(`🔑 Loaded persistent Peer ID: ${peerId.toString()}`)
    } else {
      console.log('⚠️ peer-id.json not found, generating new one...')
      peerId = await createEd25519PeerId()
      const data = {
        id: peerId.toString(),
        privKey: Buffer.from(peerId.privateKey!).toString('base64'),
        pubKey: Buffer.from(peerId.publicKey).toString('base64')
      }
      fs.writeFileSync(PEER_ID_FILE, JSON.stringify(data, null, 2))
      console.log(`✅ Generated and saved new Peer ID: ${peerId.toString()}`)
    }
  } catch (err) {
    console.error(`❌ Error managing peer-id.json:`, err)
    process.exit(1)
  }

  // 2. Create Libp2p Node
  const server = await createLibp2p({
    privateKey: peerId.privateKey ? privateKeyFromProtobuf(peerId.privateKey) : undefined,
    addresses: {
      listen: [
        `/ip4/0.0.0.0/tcp/${RELAY_CONFIG.RELAY_PORT}`,
        `/ip4/0.0.0.0/tcp/${RELAY_CONFIG.RELAY_PORT+1}/ws`,
        `/ip4/0.0.0.0/udp/${RELAY_CONFIG.RELAY_PORT+2}/webrtc-direct`
      ]
    },
    transports: [
      tcp(),
      webSockets(),
      webRTC(),
      webRTCDirect(),
      circuitRelayTransport()
    ],
    connectionEncrypters: [noise()],
    streamMuxers: [yamux()],
    peerDiscovery: [
      pubsubPeerDiscovery({
        interval: INTERVALS.PUBSUB_PEER_DISCOVERY,
        listenOnly: false
      }) as any
    ],
    connectionManager: {
      inboundStreamProtocolNegotiationTimeout: TIMEOUTS.PROTOCOL_NEGOTIATION_INBOUND,
      inboundUpgradeTimeout: TIMEOUTS.UPGRADE_INBOUND,
      outboundStreamProtocolNegotiationTimeout: TIMEOUTS.PROTOCOL_NEGOTIATION_OUTBOUND,
      maxConnections: RELAY_CONFIG.MAX_CONNECTIONS,
      maxIncomingPendingConnections: RELAY_CONFIG.MAX_INCOMING_PENDING,
      maxPeerAddrsToDial: RELAY_CONFIG.MAX_PEER_ADDRS_TO_DIAL,
      dialTimeout: TIMEOUTS.DIAL_TIMEOUT
    },
    connectionGater: {
      denyDialMultiaddr: () => false
    },
    services: {
      identify: identify(),
      identifyPush: identifyPush(),
      autoNAT: autoNAT(),
      dcutr: dcutr(),
      ping: ping(),
      pubsub: gossipsub({ 
        emitSelf: false, 
        allowPublishToZeroTopicPeers: true 
      }) as any,
      relay: circuitRelayServer({
        hopTimeout: TIMEOUTS.HOP_TIMEOUT,
        reservations: {
          maxReservations: RELAY_CONFIG.MAX_RESERVATIONS,
          reservationTtl: RELAY_CONFIG.RESERVATION_TTL,
          defaultDataLimit: RELAY_CONFIG.DEFAULT_DATA_LIMIT,
          defaultDurationLimit: RELAY_CONFIG.DEFAULT_DURATION_LIMIT
        }
      })
    }
  })

  // 3. Discovery Topics
  const DISCOVERY_TOPIC = '_peer-discovery._p2p._pubsub'
  const subscribedTopics = new Set([DISCOVERY_TOPIC])
  
  const pubsub = server.services.pubsub as any
  await pubsub.subscribe(DISCOVERY_TOPIC)
  console.log(`🔗 Relay subscribed to discovery topic: ${DISCOVERY_TOPIC}`)

  // 4. Auto-subscribe to peer topics
  pubsub.addEventListener('subscription-change', (evt: any) => {
    for (const sub of evt.detail.subscriptions) {
      if (sub.subscribe && !subscribedTopics.has(sub.topic)) {
        if (DEBUG) console.log(`Async subscribing to topic: ${sub.topic}`)
        try {
          pubsub.subscribe(sub.topic)
          subscribedTopics.add(sub.topic)
        } catch (err: any) {
          if (DEBUG) console.log(`Failed to auto-subscribe to ${sub.topic}: ${err.message}`)
        }
      }
    }
  })

  if (DEBUG) {
    server.addEventListener('peer:connect', (evt) => {
      console.log(`🤝 Peer connected: ${evt.detail.toString().slice(-8)}`)
    })
    
    setInterval(() => {
      const topics = pubsub.getTopics()
      if (topics.length > 0) {
        console.log('\n📡 Active topics:', topics)
        for (const topic of topics) {
          const subscribers = pubsub.getSubscribers(topic)
          if (subscribers.length > 0) {
            console.log(`  ${topic}: ${subscribers.length} subscribers`)
          }
        }
      }
    }, INTERVALS.MONITORING)
  }

  console.log(`\n🚀 Local Relay Server running!`)
  server.getMultiaddrs().forEach((addr) => {
    console.log(`   ${addr.toString()}`)
  })

  // 5. HTTP API for Dynamic Addresses
  const httpServer = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    
    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    if (req.url === '/api/addresses') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      const multiaddrs = server.getMultiaddrs().map(ma => ma.toString())
      const addresses = {
        websocket: multiaddrs.filter(ma => ma.includes('/ws')),
        webrtcDirect: multiaddrs.filter(ma => ma.includes('/webrtc-direct')),
        tcp: multiaddrs.filter(ma => ma.includes('/tcp/') && !ma.includes('/ws')),
        all: multiaddrs
      }
      res.end(JSON.stringify(addresses, null, 2))
    } else {
      res.writeHead(404)
      res.end('Not found')
    }
  })

  httpServer.listen(RELAY_CONFIG.HTTP_PORT, '0.0.0.0', () => {
    console.log(`\n🌍 HTTP API listening on port ${RELAY_CONFIG.HTTP_PORT}`)
    console.log(`👉 Get addresses: http://localhost:${RELAY_CONFIG.HTTP_PORT}/api/addresses`)
  })

  process.on('SIGINT', async () => {
    console.log('Stopping relay...')
    await server.stop()
    httpServer.close()
    process.exit(0)
  })
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
