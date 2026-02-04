import { Libp2p } from 'libp2p'

export async function createNode(): Promise<Libp2p | null> {
  // 1. Force Client-Side Execution Check
  if (typeof window === 'undefined') {
    return null
  }

  // 2. Dynamic Imports (prevents SSR crash)
  const { createLibp2p } = await import('libp2p')
  const { webSockets } = await import('@libp2p/websockets')
  const { webRTC } = await import('@libp2p/webrtc')
  const { noise } = await import('@chainsafe/libp2p-noise')
  const { yamux } = await import('@chainsafe/libp2p-yamux')
  const { gossipsub } = await import('@chainsafe/libp2p-gossipsub')
  const { circuitRelayTransport } = await import('@libp2p/circuit-relay-v2')
  const { dcutr } = await import('@libp2p/dcutr')
  const { identify } = await import('@libp2p/identify')
  const { bootstrap } = await import('@libp2p/bootstrap')

  // 3. Create the Node
  const node = await createLibp2p({
    addresses: {
      listen: ['/webrtc']
    },
    transports: [
      webSockets(), // v10 API - no filters needed
      webRTC(),
      circuitRelayTransport({ discoverRelays: 1 }),
    ],
    connectionEncryption: [noise()],
    streamMuxers: [yamux()],
    connectionGater: {
        denyDialMultiaddr: () => false,
    },
    peerDiscovery: [
      bootstrap({
        list: process.env.NODE_ENV === 'development' 
        ? [
            // LOCAL RELAY (Fast Dev Discovery)
            '/ip4/127.0.0.1/tcp/9090/ws/p2p/12D3KooWLAGWKzSA5cLYuGhkDkAvdCzw4iv6xXVsFEwLKzK7p1kb'
          ]
        : [
            // PUBLIC BOOTSTRAP (Production Redundancy)
            '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
            '/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa',
            '/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb',
            '/dnsaddr/bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt'
          ]
      })
    ],
    services: {
      identify: identify(),
      pubsub: gossipsub({ allowPublishToZeroPeers: true }),
      dcutr: dcutr()
    }
  })

  return node
}
