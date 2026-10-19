const path = require('path');
const { loadEnv } = require('@/config/env');

async function bootstrap() {
  loadEnv(path.resolve(process.cwd(), '.env'));
  const { startServer } = await import('@/server');
  await startServer();
}

bootstrap();
