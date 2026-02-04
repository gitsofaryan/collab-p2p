import { createEd25519PeerId } from '@libp2p/peer-id-factory'

async function main() {
  const peerId = await createEd25519PeerId()
  console.log('toString:', peerId.toString())
  console.log('toJSON:', JSON.stringify(peerId.toJSON(), null, 2))
  console.log('Keys:', Object.keys(peerId))
  // Check for privateKey
  // @ts-ignore
  if (peerId.privateKey) {
      console.log('Has privateKey property')
      // @ts-ignore
      console.log('privateKey:', peerId.privateKey)
  } else {
      console.log('No privateKey property found directly')
  }
}

main().catch(console.error)
