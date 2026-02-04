
const RELAY_PORT = 9091;
const HOSTS = ['127.0.0.1', 'localhost', '10.35.128.141'];

async function testConnection(host: string) {
  const url = `ws://${host}:${RELAY_PORT}`;
  console.log(`Testing connection to ${url}...`);

  return new Promise<void>((resolve, reject) => {
    const ws = new WebSocket(url);
    const timeout = setTimeout(() => {
        console.error(`❌ Connection timed out to ${url}`);
        ws.close();
        resolve(); // Resolve to verify other hosts
    }, 5000);

    ws.addEventListener('open', () => {
      console.log(`✅ Connected successfully to ${url}`);
      ws.close();
      clearTimeout(timeout);
      resolve();
    });

    ws.addEventListener('error', (err) => {
      console.error(`❌ Connection failed to ${url}:`, err);
      clearTimeout(timeout);
      resolve(); // Do not reject, just log fail
    });
  });
}

async function main() {
    console.log("Checking relay WebSocket availability...");
    for (const host of HOSTS) {
        await testConnection(host);
    }
}

main();
