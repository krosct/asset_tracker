import { mysqlPool } from '../config/mysql';
import logger from '../core/logger';

require('dotenv').config();
const BRAPI_TOKEN = process.env.BRAPI_TOKEN;

export const startPriceUpdater = () => {
  // Executar a cada 30 minutos (1.800.000 ms)
  setInterval(updatePrices, 30 * 60 * 1000);
  
  // Executar imediatamente na inicialização
  updatePrices();
};

export const updatePrices = async (manual: boolean = false, specificSymbol?: string) => {
  try {
    const currentHour = new Date().getHours();
    
    // Atualização apenas durante o pregão e after-market (10h às 18h)
    if (!manual && (currentHour < 10 || currentHour > 18)) {
      logger.info('Mercado fechado ou fora do horário de atualização das cotações (10h às 18h).');
      return;
    }

    if (specificSymbol) {
      logger.info(`Iniciando atualização de cotações e proventos para o ativo específico: ${specificSymbol}...`);
    } else {
      logger.info(manual ? 'Iniciando atualização manual de cotações dos ativos pela BRAPI...' : 'Iniciando atualização de cotações dos ativos pela BRAPI...');
    }
    
    // Buscar todos os ativos únicos da tabela assets
    let query = 'SELECT id, symbol FROM assets';
    let params: any[] = [];
    
    if (specificSymbol) {
      query += ' WHERE symbol = ?';
      params.push(specificSymbol);
    }
    
    const [rows] = await mysqlPool.execute(query, params);
    const assets = rows as { id: number; symbol: string }[];
    
    if (!assets || assets.length === 0) {
      logger.info('Nenhum ativo encontrado para atualizar preços.');
      return;
    }

    const uniqueSymbols = [...new Set(assets.map(a => a.symbol))];
    
    for (const symbolParam of uniqueSymbols) {
      const response = await fetch(`https://brapi.dev/api/quote/${symbolParam}?token=${BRAPI_TOKEN}&dividends=true&fundamental=true`);
      
      if (!response.ok) {
        logger.error(`Erro na requisição da API BRAPI para o ativo ${symbolParam}: ${response.status} ${response.statusText}`);
        continue;
      }

      const data = await response.json();
      
      if (!data || !data.results) {
        logger.error(`Formato de resposta inesperado da API BRAPI para o ativo ${symbolParam}.`);
        continue;
      }

      const results = data.results as any[];
      
      // Obtendo a data e hora atual no formato YYYY-MM-DD HH:mm:ss
      const now = new Date();
      const currentDateTime = now.toISOString().slice(0, 19).replace('T', ' ');
      
      const formatToMySQLDate = (isoString: string | null | undefined) => {
        if (!isoString) return null;
        return isoString.slice(0, 19).replace('T', ' ');
      };
      
      for (const quote of results) {
        const { 
          symbol, 
          regularMarketPrice, 
          regularMarketOpen, 
          regularMarketDayHigh, 
          regularMarketDayLow,
          regularMarketPreviousClose,
          dividendsData
        } = quote;
        
        const current_price = regularMarketPrice || 0;
        const open_price = regularMarketOpen || current_price;
        const high_price = regularMarketDayHigh || current_price;
        const low_price = regularMarketDayLow || current_price;
        const close_price = regularMarketPreviousClose || current_price;

        // Encontrar todos os IDs de ativos que correspondem ao símbolo
        const matchingAssets = assets.filter(a => a.symbol === symbol);
        
        for (const asset of matchingAssets) {
          // Insere novo registro na tabela de histórico de preços
          await mysqlPool.execute(
            `INSERT INTO asset_daily_prices 
              (asset_id, price_date, open_price, high_price, low_price, close_price, current_price) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              asset.id, 
              currentDateTime, 
              open_price, 
              high_price, 
              low_price, 
              close_price, 
              current_price
            ]
          );
          
          // Processa e armazena os proventos (dividendos, JCP, rendimentos)
          const cashDividends = dividendsData?.cashDividends || [];
          for (const dividend of cashDividends) {
            const { paymentDate, rate, label, lastDatePrior } = dividend;
            
            if (!paymentDate || rate === undefined || rate === null) continue;
            
            const pDate = formatToMySQLDate(paymentDate);
            const cDate = formatToMySQLDate(lastDatePrior);
            
            // Cria um identificador único para evitar duplicidade de proventos
            const external_id = `${pDate}_${symbol}_${rate}`;
            
            await mysqlPool.execute(
              `INSERT IGNORE INTO asset_dividends 
                (asset_id, label, amount, date_com, payment_date, external_id) 
               VALUES (?, ?, ?, ?, ?, ?)`,
              [
                asset.id,
                label || null,
                rate,
                cDate,
                pDate,
                external_id
              ]
            );
          }
        }
      }
    }
    
    logger.info('Atualização de cotações e proventos dos ativos finalizada com sucesso.');

  } catch (error) {
    logger.error('Erro ao tentar atualizar as cotações e proventos dos ativos:', error);
  }
};
