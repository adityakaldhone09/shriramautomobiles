import { execSync } from 'node:child_process';

const ports = [5001, 5173];

function getPidsForPort(port: number): string[] {
  try {
    const output = execSync(`lsof -ti tcp:${port} || true`, { encoding: 'utf8' });
    return output
      .split(/\s+/)
      .map((value) => value.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function killPid(pid: string, port: number) {
  try {
    process.kill(Number(pid), 'SIGTERM');
    console.log(`[cleanup] terminated process ${pid} on port ${port}`);
  } catch {
    try {
      process.kill(Number(pid), 'SIGKILL');
      console.log(`[cleanup] force-killed process ${pid} on port ${port}`);
    } catch {
      console.warn(`[cleanup] could not terminate process ${pid} on port ${port}`);
    }
  }
}

function main() {
  let found = false;

  for (const port of ports) {
    const pids = getPidsForPort(port);

    if (pids.length === 0) {
      continue;
    }

    found = true;
    for (const pid of pids) {
      killPid(pid, port);
    }
  }

  if (!found) {
    console.log('[cleanup] no stale app processes found on ports 5001 or 5173');
  }
}

main();
