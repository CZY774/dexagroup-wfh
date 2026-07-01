const net = require('net');

const [, , host = '127.0.0.1', rawPort] = process.argv;
const port = Number(rawPort);

if (!Number.isInteger(port) || port <= 0) {
  process.exit(2);
}

const socket = net.createConnection({ host, port });
socket.setTimeout(3000);

socket.on('connect', () => {
  socket.end();
  process.exit(0);
});

socket.on('timeout', () => {
  socket.destroy();
  process.exit(1);
});

socket.on('error', () => {
  process.exit(1);
});
