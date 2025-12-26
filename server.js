#!/usr/bin/env node

// Root-level start script for Render
// This runs the backend server

require('dotenv').config({ path: './server/.env' });

const { spawn } = require('child_process');
const path = require('path');

const serverPath = path.join(__dirname, 'server', 'index.js');
const server = spawn('node', [serverPath], {
  stdio: 'inherit',
  cwd: __dirname
});

server.on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

server.on('exit', (code) => {
  process.exit(code);
});

process.on('SIGTERM', () => {
  server.kill('SIGTERM');
});
