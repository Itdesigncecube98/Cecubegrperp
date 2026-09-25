const { spawn } = require('child_process');
const path = require('path');

const nextCli = path.join(__dirname, '..', 'node_modules', 'next', 'dist', 'bin', 'next');
const child = spawn(process.execPath, [nextCli, 'start', '-H', '0.0.0.0'], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
  env: process.env
});

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
