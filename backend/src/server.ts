import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import logger from './core/logger';
import { startPriceUpdater } from './workers/priceUpdater';

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📚 Swagger docs available at http://localhost:${PORT}/api-docs`);
  
  // Iniciar worker de atualização de preços
  startPriceUpdater();
});