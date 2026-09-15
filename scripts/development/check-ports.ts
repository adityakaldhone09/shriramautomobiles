import net from 'net';

function checkPort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(true);
      }
    });
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port);
  });
}

async function main() {
  const apiPort = parseInt(process.env.PORT || '5001', 10);
  const webPort = 5173;

  const apiAvailable = await checkPort(apiPort);
  if (!apiAvailable) {
    console.error(`\x1b[31m[ERROR] Port ${apiPort} is already in use. Please terminate the conflicting process or set PORT=<other>.\x1b[0m`);
  } else {
    console.log(`\x1b[32m[OK] API port ${apiPort} is available.\x1b[0m`);
  }

  const webAvailable = await checkPort(webPort);
  if (!webAvailable) {
    console.warn(`\x1b[33m[WARN] Web dev port ${webPort} is currently in use. Vite will automatically choose the next free port.\x1b[0m`);
  } else {
    console.log(`\x1b[32m[OK] Web port ${webPort} is available.\x1b[0m`);
  }
}

main();
