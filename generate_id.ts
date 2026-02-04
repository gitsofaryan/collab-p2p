import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { toString } from 'uint8arrays'
import fs from 'fs'

async function generate() {
  const peerId = await createEd25519PeerId()
  
  // Create object explicitly for createFromJSON
  const exported = {
      id: peerId.toString(),
      privKey: toString(peerId.privateKey!, 'base64'),
      pubKey: toString(peerId.publicKey!, 'base64')
  }
  
  const json = JSON.stringify(exported, null, 2)
  fs.writeFileSync('peer-id.json', json)
  console.log('Generated Peer ID:', peerId.toString())
}

generate()
