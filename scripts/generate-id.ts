import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import fs from 'node:fs/promises'

async function main() {
  console.log('Generating new Peer ID...')
  const peerId = await createEd25519PeerId()
  
  // Manually construct the JSON object that createFromJSON expects
  // We need to convert Uint8Arrays to Base64 strings
  const json = {
      id: peerId.toString(),
      privKey: Buffer.from(peerId.privateKey).toString('base64'),
      pubKey: Buffer.from(peerId.publicKey).toString('base64')
  }
  
  await fs.writeFile('peer-id.json', JSON.stringify(json, null, 2))
  console.log('✅ Generated peer-id.json with private key')
  console.log('Peer ID:', peerId.toString())
}

main().catch(console.error)
