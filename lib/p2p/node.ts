import { Libp2p, createLibp2p } from 'libp2p'
import { webSockets } from '@libp2p/websockets'
import { webRTC, webRTCDirect } from '@libp2p/webrtc'
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { gossipsub } from '@chainsafe/libp2p-gossipsub'
import { circuitRelayTransport } from '@libp2p/circuit-relay-v2'
import { dcutr } from '@libp2p/dcutr'
import { pubsubPeerDiscovery } from '@libp2p/pubsub-peer-discovery'
import { identify, identifyPush } from '@libp2p/identify'
import { bootstrap } from '@libp2p/bootstrap'
import { autoNAT } from '@libp2p/autonat'
import { ping } from '@libp2p/ping'
import { multiaddr } from '@multiformats/multiaddr'
import { RELAY_CONFIG, INTERVALS, TIMEOUTS, DEBUG } from './constants'

async function fetchRelayAddresses(): Promise<string[]> {
  try {
    const res = await fetch(`http://localhost:${RELAY_CONFIG.HTTP_PORT}/api/addresses`)
    if (!res.ok) throw new Error('Failed to fetch relay addresses')
    const data = await res.json()
    return [...(data.websocket || [])]
  } catch (err) {
    if (DEBUG) console.warn('⚠️ Failed to fetch relay addresses:', err)
    return []
  }
}

export async function createNode(): Promise<Libp2p | null> {
  if (typeof window === 'undefined') return null

  const bootstrapList = await fetchRelayAddresses()
  
  if (DEBUG) console.log('🔗 Bootstrapping with:', bootstrapList)

  const node = await createLibp2p({
    addresses: {
      listen: [
        '/p2p-circuit', 
        '/webrtc'
      ]
    },
    transports: [
      webSockets(),
      webRTCDirect(),
      webRTC(),
      circuitRelayTransport({
        reservationCompletionTimeout: TIMEOUTS.RELAY_CONNECTION
      })
    ],
    connectionEncrypters: [noise()],
    streamMuxers: [yamux()],
    connectionManager: {
        inboundUpgradeTimeout: TIMEOUTS.UPGRADE_INBOUND,
        dialTimeout: TIMEOUTS.DIAL_TIMEOUT
    },
    connectionGater: {
      denyDialMultiaddr: () => false
    },
    peerDiscovery: [
      bootstrap({ list: bootstrapList }),
      pubsubPeerDiscovery({
        interval: INTERVALS.PUBSUB_PEER_DISCOVERY
      }) as any
    ],
    services: {
      identify: identify(),
      identifyPush: identifyPush(),
      autoNAT: autoNAT(),
      dcutr: dcutr(),
      ping: ping(),
      pubsub: gossipsub({
        emitSelf: false,
        allowPublishToZeroTopicPeers: true
      }) as any
    }
  })

  // Connect to relay in background
  bootstrapList.forEach(async (addr) => {
    try {
      if (DEBUG) console.log(`Dialing relay: ${addr}`)
      await node.dial(multiaddr(addr))
    } catch (err: any) {
      if (DEBUG) console.error(`❌ Relay dial failed: ${addr}`, err.message)
    }
  })

  return node
}
