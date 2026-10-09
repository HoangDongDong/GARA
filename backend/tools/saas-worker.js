require('../src/config');
const service = require('../src/services/saasWorker');
const command = process.argv[2] || 'once';
let stopping = false;
process.on('SIGINT', () => { stopping = true; });
process.on('SIGTERM', () => { stopping = true; });
async function main() {
  if (command === 'backup') return service.backupAll();
  if (command === 'once') return service.processOne();
  if (command !== 'run') throw Error('Dùng: saas-worker.js once | run | backup');
  while (!stopping) {
    try { if (await service.processOne()) continue; } catch (error) { console.error('Worker:', error.message); }
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
