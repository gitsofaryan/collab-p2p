import fs from 'node:fs'
import { createLibp2p } from 'libp2p'
import { webSockets } from '@libp2p/websockets'
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { circuitRelayServer } from '@libp2p/circuit-relay-v2'
import { identify } from '@libp2p/identify'
import { gossipsub } from '@chainsafe/libp2p-gossipsub'
import { createFromJSON } from '@libp2p/peer-id-factory'

const RELAY_PORT = 9090;

async function main() {
  // Load PeerID
  let peerId
  try {
    console.log(`📂 Current Working Directory: ${process.cwd()}`)
    const peerIdJson = JSON.parse(fs.readFileSync('peer-id.json', 'utf-8'))
    peerId = await createFromJSON(peerIdJson)
    console.log(`🔑 Loaded persistent Peer ID: ${peerId.toString()}`)
  } catch (err) {
    console.warn(`⚠️ Could not load peer-id.json:`, err)
    console.warn('⚠️ Generating new one...')
  }

  const server = await createLibp2p({
    peerId, // Use the proper key
    addresses: {
      listen: [`/ip4/0.0.0.0/tcp/${RELAY_PORT}/ws`]
    },
    transports: [
      webSockets()
    ],
    connectionEncrypters: [noise()],
    streamMuxers: [yamux()],
    services: {
      identify: identify(),
      pubsub: gossipsub(), // Enable GossipSub for message routing
      relay: circuitRelayServer({
        reservations: {
          maxReservations: Infinity, // For dev: allow unlimited
          applyDefaultLimit: false
        }
      })
    }
  })

  // Log the ready message
  console.log(`\n🚀 Local Relay Server running on port ${RELAY_PORT}`)
  console.log(`📡 Addresses:`)
  
  let addressWritten = false
  server.getMultiaddrs().forEach((addr) => {
    // Prefer the IP4 address
    if (addr.toString().includes('127.0.0.1')) {
         console.log(`RELAY_MULTIADDR: ${addr.toString()}`)
         if (!addressWritten) {
             fs.writeFileSync('relay_address.txt', addr.toString())
             addressWritten = true
         }
    } else if (addr.toString().includes('ip4') && !addr.toString().includes('127.0.0.1')) {
         // Fallback to other IPs but replace with localhost for dev ease
         const localAddr = addr.toString().replace(/\/ip4\/[\d\.]+\//, '/ip4/127.0.0.1/')
         console.log(`RELAY_MULTIADDR: ${localAddr}`)
         if (!addressWritten) {
             fs.writeFileSync('relay_address.txt', localAddr)
             addressWritten = true
         }
    }
    console.log(`   ${addr.toString()}`)
  })
  
  console.log('\nAddress written to relay_address.txt')
  
  // Handle shutdown
  process.on('SIGINT', async () => {
      console.log('Stopping relay...')
      await server.stop()
      process.exit(0)
  })
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
