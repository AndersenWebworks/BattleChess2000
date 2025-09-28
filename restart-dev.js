#!/usr/bin/env node

const { exec, spawn } = require('child_process');
const os = require('os');

// Kill any existing processes on port 3000
function killPort3000() {
    return new Promise((resolve) => {
        const command = os.platform() === 'win32'
            ? 'netstat -ano | findstr :3000'
            : 'lsof -ti:3000';

        exec(command, (error, stdout, stderr) => {
            if (stdout) {
                const lines = stdout.split('\n').filter(line => line.includes(':3000'));
                const pids = lines.map(line => {
                    const parts = line.trim().split(/\s+/);
                    return parts[parts.length - 1]; // PID is last column
                }).filter(pid => pid && !isNaN(pid));

                if (pids.length > 0) {
                    console.log('🔄 Killing processes on port 3000:', pids);
                    const killCmd = os.platform() === 'win32'
                        ? `taskkill /F /PID ${pids.join(' /PID ')}`
                        : `kill -9 ${pids.join(' ')}`;

                    exec(killCmd, () => {
                        setTimeout(resolve, 1000); // Wait 1 second
                    });
                } else {
                    resolve();
                }
            } else {
                resolve();
            }
        });
    });
}

// Start nodemon
async function startDev() {
    console.log('🔄 Starting BattleChess2000 with Auto-Reload...');

    await killPort3000();

    console.log('🚀 Starting nodemon on port 3000...');
    const nodemon = spawn('npm', ['run', 'dev'], {
        stdio: 'inherit',
        shell: true
    });

    nodemon.on('close', (code) => {
        console.log(`📦 Nodemon exited with code ${code}`);
    });
}

startDev();