#!/usr/bin/env node

const { spawn } = require('child_process');

console.log('🚀 Starting BattleChess2000 fresh...');

// Simply start the server without trying to kill existing processes
const server = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, PORT: 3001 }  // Use port 3001 to avoid conflicts
});

server.on('close', (code) => {
    console.log(`📦 Server exited with code ${code}`);
});