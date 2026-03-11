import { Request, Response } from 'express'
import { z } from 'zod'
import logger from '../../core/logger'
import { mysqlPool } from '../../config/mysql'
import { updatePrices } from '../../workers/priceUpdater'

// Schemas
const assetSchema = z.object({
  ticker: z.string().min(1),
  name: z.string().optional(),
  type: z.string().default('Ação'),
  sector: z.string().optional(),
  currency: z.string().default('BRL'),
  quantity: z.number().default(0),
  avg_price: z.number().default(0),
  current_price: z.number().optional(), // ✅ ADICIONADO
})

const bulkAssetsSchema = z.array(assetSchema)

export class AssetsController {
  
  // POST /assets/update-prices
  static async updatePricesManual(req: Request, res: Response) {
    try {
      // Executa de forma assíncrona para não travar a requisição se demorar muito,
      // ou podemos aguardar. Como a instrução é colocar um botão de atualizar,
      // aguardar garante que o frontend possa dar o refresh na sequência.
      await updatePrices(true);
      return res.json({ message: 'Cotações e proventos atualizados com sucesso.' });
    } catch (error: any) {
      logger.error('Erro ao atualizar preços manualmente:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // GET /assets
  static async list(req: Request, res: Response) {
    try {
      // Por enquanto usamos um usuário fixo 1 para ler os dados mockados no MySQL
      const userId = 1

      const [rows] = await mysqlPool.query(
        `
        SELECT 
          a.id,
          a.symbol AS ticker,
          a.name,
          at.name AS type,
          a.quantity,
          a.avg_price,
          COALESCE((
            SELECT current_price 
            FROM asset_daily_prices 
            WHERE asset_id = a.id 
            ORDER BY price_date DESC 
            LIMIT 1
          ), a.current_price) AS current_price,
          a.currency,
          a.first_purchase_date
        FROM assets a
        JOIN asset_types at ON at.id = a.asset_type_id
        WHERE a.user_id = ?
        `,
        [userId],
      )

      // const assets = rows as any[]

      const assets = (rows as any[]).map(row => {
        let typeStr = row.type;
        if (typeof typeStr === 'string') {
          const converted = Buffer.from(typeStr, 'latin1').toString('utf8');
          if (!converted.includes('')) {
            typeStr = converted;
          }
        }
        return {
          ...row,
          type: typeStr
        };
      });

      const totalValue = assets.reduce((acc, curr) => {
        const price =
          curr.current_price != null && curr.current_price > 0
            ? Number(curr.current_price)
            : Number(curr.avg_price || 0)
        return acc + Number(curr.quantity || 0) * price
      }, 0)

      return res.json({
        total_consolidated: totalValue,
        count: assets.length,
        assets,
      })
    } catch (error: any) {
      return res.status(500).json({ error: error.message })
    }
  }

  // POST /assets (Individual)
  static async create(req: Request, res: Response) {
    try {
      const data = assetSchema.parse(req.body)

      const userId = 1

      // Garante que o tipo de ativo exista em asset_types
      const assetTypeName = data.type || 'Ação'
      const [typeRows] = await mysqlPool.query(
        'SELECT id FROM asset_types WHERE name = ? LIMIT 1',
        [assetTypeName],
      )
      let assetTypeId: number

      if ((typeRows as any[]).length === 0) {
        const [insertTypeResult] = await mysqlPool.execute(
          'INSERT INTO asset_types (name) VALUES (?)',
          [assetTypeName],
        )
        assetTypeId = (insertTypeResult as any).insertId
      } else {
        assetTypeId = (typeRows as any)[0].id
      }

      const currentPrice = data.current_price ?? data.avg_price

      const [insertResult] = await mysqlPool.execute(
        `
        INSERT INTO assets (
          user_id,
          asset_type_id,
          symbol,
          name,
          first_purchase_date,
          quantity,
          avg_price,
          current_price,
          currency
        )
        VALUES (?, ?, ?, ?, CURDATE(), ?, ?, ?, ?)
        `,
        [
          userId,
          assetTypeId,
          data.ticker,
          data.name || data.ticker,
          data.quantity,
          data.avg_price,
          currentPrice,
          data.currency,
        ],
      )

      const assetId = (insertResult as any).insertId

      // Atualiza na hora as informações (cotação, proventos etc) do novo ativo pela BRAPI
      try {
        await updatePrices(true, data.ticker);
      } catch (err) {
        logger.error(`Erro ao atualizar cotações e proventos na criação do ativo ${data.ticker}`, err);
      }

      const [rows] = await mysqlPool.query(
        `
        SELECT 
          a.id,
          a.symbol AS ticker,
          a.name,
          at.name AS type,
          a.quantity,
          a.avg_price,
          COALESCE((
            SELECT current_price 
            FROM asset_daily_prices 
            WHERE asset_id = a.id 
            ORDER BY price_date DESC 
            LIMIT 1
          ), a.current_price) AS current_price,
          a.currency,
          a.first_purchase_date
        FROM assets a
        JOIN asset_types at ON at.id = a.asset_type_id
        WHERE a.id = ?
        `,
        [assetId],
      )

      const asset = (rows as any[])[0];
      if (asset && typeof asset.type === 'string') {
        const converted = Buffer.from(asset.type, 'latin1').toString('utf8');
        if (!converted.includes('')) {
          asset.type = converted;
        }
      }
      return res.status(201).json(asset)
    } catch (error: any) {
      return res.status(400).json({ error: error.errors || error.message })
    }
  }

  // DELETE /assets/:id
  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params

      await mysqlPool.execute('DELETE FROM transactions WHERE asset_id = ?', [id])
      
      try {
        await mysqlPool.execute('DELETE FROM asset_daily_prices WHERE asset_id = ?', [id])
      } catch (e) {
        // Ignora se a tabela ou registro não existir
      }

      await mysqlPool.execute('DELETE FROM assets WHERE id = ?', [id])

      return res.status(204).send()
    } catch (error: any) {
      return res.status(400).json({ error: error.message })
    }
  }

  // POST /assets/bulk
  static async bulkCreate(req: Request, res: Response) {
    try {
      const assets = bulkAssetsSchema.parse(req.body)

      const userId = 1
      let insertedCount = 0

      for (const asset of assets) {
        const assetTypeName = asset.type || 'Ação'
        const [typeRows] = await mysqlPool.query(
          'SELECT id FROM asset_types WHERE name = ? LIMIT 1',
          [assetTypeName],
        )
        let assetTypeId: number

        if ((typeRows as any[]).length === 0) {
          const [insertTypeResult] = await mysqlPool.execute(
            'INSERT INTO asset_types (name) VALUES (?)',
            [assetTypeName],
          )
          assetTypeId = (insertTypeResult as any).insertId
        } else {
          assetTypeId = (typeRows as any)[0].id
        }

        const currentPrice = asset.current_price ?? asset.avg_price

        await mysqlPool.execute(
          `
          INSERT INTO assets (
            user_id,
            asset_type_id,
            symbol,
            name,
            first_purchase_date,
            quantity,
            avg_price,
            current_price,
            currency
          )
          VALUES (?, ?, ?, ?, CURDATE(), ?, ?, ?, ?)
          `,
          [
            userId,
            assetTypeId,
            asset.ticker,
            asset.name || asset.ticker,
            asset.quantity,
            asset.avg_price,
            currentPrice,
            asset.currency,
          ],
        )

        insertedCount++
      }

      logger.info(`${insertedCount} ativos importados.`)
      
      // Atualiza cotações e proventos de todos os ativos novos em background
      updatePrices(true).catch(err => logger.error('Erro na atualização após importação em massa:', err));

      return res
        .status(201)
        .json({ message: 'Importação concluída', count: insertedCount })
    } catch (error: any) {
      return res.status(400).json({ error: error.errors || error.message })
    }
  }

  // PUT /assets/:id
  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params
      const { ticker, type, sector } = req.body
      const userId = 1

      let assetTypeId: number | undefined

      if (type) {
        const [typeRows] = await mysqlPool.query(
          'SELECT id FROM asset_types WHERE name = ? LIMIT 1',
          [type],
        )

        if ((typeRows as any[]).length === 0) {
          const [insertTypeResult] = await mysqlPool.execute(
            'INSERT INTO asset_types (name) VALUES (?)',
            [type],
          )
          assetTypeId = (insertTypeResult as any).insertId
        } else {
          assetTypeId = (typeRows as any)[0].id
        }
      }

      const fields: string[] = []
      const values: any[] = []

      if (ticker) {
        fields.push('symbol = ?')
        values.push(ticker)
      }

      if (assetTypeId) {
        fields.push('asset_type_id = ?')
        values.push(assetTypeId)
      }

      // sector não existe na tabela MySQL mockada; ignoramos este campo aqui

      fields.push('updated_at = NOW()')

      values.push(id)
      values.push(userId)

      await mysqlPool.execute(
        `UPDATE assets SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
        values,
      )

      const [rows] = await mysqlPool.query(
        `
        SELECT 
          a.id,
          a.symbol AS ticker,
          a.name,
          at.name AS type,
          a.quantity,
          a.avg_price,
          a.current_price,
          a.currency,
          a.first_purchase_date
        FROM assets a
        JOIN asset_types at ON at.id = a.asset_type_id
        WHERE a.id = ?
        `,
        [id],
      )

      const asset = (rows as any[])[0];
      if (asset && typeof asset.type === 'string') {
        const converted = Buffer.from(asset.type, 'latin1').toString('utf8');
        if (!converted.includes('')) {
          asset.type = converted;
        }
      }

      return res.json(asset)
    } catch (error: any) {
      return res.status(400).json({ error: error.message })
    }
  }


  // GET /assets/dividends
  static async dividends(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id || 1;
      const { assetId, assetTypeId, startDate, endDate } = req.query;

      let whereClauses = 'a.user_id = ? AND ad.payment_date IS NOT NULL';
      const params: any[] = [userId];

      if (assetId) {
        whereClauses += ' AND a.id = ?';
        params.push(assetId);
      }
      if (assetTypeId) {
        // Se receber string que não é número (ex: 'Ação'), filtra por at.name. Se for ID, filtra por a.asset_type_id.
        if (isNaN(Number(assetTypeId))) {
          whereClauses += ' AND at.name = ?';
          params.push(assetTypeId);
        } else {
          whereClauses += ' AND a.asset_type_id = ?';
          params.push(assetTypeId);
        }
      }
      if (startDate) {
        whereClauses += ' AND ad.payment_date >= ?';
        params.push(new Date(String(startDate)));
      }
      if (endDate) {
        const end = new Date(String(endDate));
        end.setHours(23, 59, 59, 999);
        whereClauses += ' AND ad.payment_date <= ?';
        params.push(end);
      }

      // Calcula dividendos multiplicando o valor da cota pela quantidade possuída na data com (ou data de pagamento se nula)
      const query = `
        SELECT 
          DATE_FORMAT(ad.payment_date, '%Y-%m') AS month,
          SUM(ad.amount * (
            SELECT COALESCE(SUM(CASE WHEN type = 'BUY' THEN quantity ELSE -quantity END), 0)
            FROM transactions t
            WHERE t.asset_id = ad.asset_id 
              AND t.user_id = ?
              AND t.transaction_date <= COALESCE(ad.date_com, ad.payment_date)
          )) AS total_dividend
        FROM asset_dividends ad
        JOIN assets a ON a.id = ad.asset_id
        JOIN asset_types at ON at.id = a.asset_type_id
        WHERE ${whereClauses}
        GROUP BY month
        ORDER BY month ASC
      `;

      // Primeiro param é pro sub-select e o resto pra query principal
      const [rows] = await mysqlPool.query(query, [userId, ...params]);

      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      
      const result = (rows as any[])
        .filter(r => r.total_dividend > 0) // Remove meses sem dividendos caso ocorram zerados
        .map(row => {
          const [year, m] = row.month.split('-');
          return {
            name: `${monthNames[parseInt(m) - 1]}/${year.substring(2)}`,
            value: Number(Number(row.total_dividend).toFixed(2))
          };
        });

      return res.json(result);

    } catch (error: any) {
       logger.error('Error fetching assets dividends:', error);
       return res.status(500).json({ error: error.message });
    }
  }

  // GET /assets/profitability
  static async profitability(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id || 1; // Assuming auth middleware sets req.user
      const { assetId, assetTypeId, startDate, endDate } = req.query;

      let whereClauses = 't.user_id = ?';
      const params: any[] = [userId];

      if (assetId) {
        whereClauses += ' AND t.asset_id = ?';
        params.push(assetId);
      }
      if (assetTypeId) {
        // Se receber string que não é número (ex: 'Ação'), filtra por at.name. Se for ID, filtra por a.asset_type_id.
        if (isNaN(Number(assetTypeId))) {
          whereClauses += ' AND at.name = ?';
          params.push(assetTypeId);
        } else {
          whereClauses += ' AND a.asset_type_id = ?';
          params.push(assetTypeId);
        }
      }

      const [transactionsRows] = await mysqlPool.query(
        `
        SELECT 
          t.asset_id,
          t.type,
          t.quantity,
          t.price,
          t.transaction_date
        FROM transactions t
        JOIN assets a ON a.id = t.asset_id
        JOIN asset_types at ON at.id = a.asset_type_id
        WHERE ${whereClauses}
        ORDER BY t.transaction_date ASC
        `,
        params
      );

      const transactions = transactionsRows as any[];

      // Build monthly quantities
      const monthlyQuantityMap = new Map<string, Map<number, number>>();
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthlyQuantityMap.set(monthKey, new Map<number, number>());
      }

      let currentQuantities = new Map<number, number>();
      for (const t of transactions) {
        const date = new Date(t.transaction_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        let qty = currentQuantities.get(t.asset_id) || 0;
        if (t.type === 'BUY') {
          qty += Number(t.quantity);
        } else if (t.type === 'SELL') {
          qty -= Number(t.quantity);
        }
        currentQuantities.set(t.asset_id, qty);
        
        if (monthlyQuantityMap.has(monthKey)) {
          monthlyQuantityMap.get(monthKey)!.set(t.asset_id, qty);
        } else {
           const mapForMonth = new Map<number, number>();
           mapForMonth.set(t.asset_id, qty);
           monthlyQuantityMap.set(monthKey, mapForMonth);
        }
      }

      const sortedMonths = Array.from(monthlyQuantityMap.keys()).sort();
      let lastMonthQuantities = new Map<number, number>();
      
      for (const month of sortedMonths) {
        const monthQuantities = monthlyQuantityMap.get(month)!;
        for (const [assetId, qty] of Array.from(lastMonthQuantities.entries())) {
          if (!monthQuantities.has(assetId)) {
            monthQuantities.set(assetId, qty);
          }
        }
        lastMonthQuantities = new Map(monthQuantities);
      }

      // Fetch prices
      const assetIds = Array.from(currentQuantities.keys());
      let pricesByMonthAndAsset = new Map<string, Map<number, number>>();
      
      if (assetIds.length > 0) {
        const [pricesRows] = await mysqlPool.query(
          `
          SELECT asset_id, DATE_FORMAT(price_date, '%Y-%m') as month, close_price 
          FROM asset_daily_prices 
          WHERE asset_id IN (?)
          AND (asset_id, price_date) IN (
              SELECT asset_id, MAX(price_date) 
              FROM asset_daily_prices 
              GROUP BY asset_id, DATE_FORMAT(price_date, '%Y-%m')
          )
          `,
          [assetIds]
        );
        
        for (const row of pricesRows as any[]) {
          const { asset_id, month, close_price } = row;
          if (!pricesByMonthAndAsset.has(month)) {
            pricesByMonthAndAsset.set(month, new Map<number, number>());
          }
          pricesByMonthAndAsset.get(month)!.set(asset_id, Number(close_price));
        }
      }

      // We need default current prices if no daily price for a month
      const [assetsRows] = await mysqlPool.query(
        `SELECT id, 
                COALESCE((SELECT current_price FROM asset_daily_prices WHERE asset_id = assets.id ORDER BY price_date DESC LIMIT 1), current_price) as current_price, 
                avg_price 
         FROM assets WHERE user_id = ?`,
        [userId]
      );
      const defaultPricesMap = new Map();
      (assetsRows as any[]).forEach(row => {
        defaultPricesMap.set(row.id, row.current_price > 0 ? row.current_price : row.avg_price);
      });

      // Calculate value per month
      let previousValue = 0;
      const result = [];

      for (const month of sortedMonths) {
        const monthQuantities = monthlyQuantityMap.get(month)!;
        let monthTotal = 0;
        
        for (const [assetId, qty] of Array.from(monthQuantities.entries())) {
           let price = 0;
           if (pricesByMonthAndAsset.has(month) && pricesByMonthAndAsset.get(month)!.has(assetId)) {
             price = pricesByMonthAndAsset.get(month)!.get(assetId)!;
           } else {
             price = defaultPricesMap.get(assetId) || 0;
           }
           monthTotal += qty * price;
        }
        
        // Simple profitability calculation: (Current Value - Previous Value) / Previous Value (Not accounting for cash flows precisely for simplicity, but better than nothing)
        let profitability = 0;
        if (previousValue > 0) {
           profitability = ((monthTotal - previousValue) / previousValue) * 100;
        } else if (previousValue === 0 && monthTotal > 0) {
           // First month with money, can't really calculate % return
           profitability = 0; 
        }

        previousValue = monthTotal;

        const [year, m] = month.split('-');
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        
        // Aplica filtro de datas no resultado, se houver
        const monthDate = new Date(parseInt(year), parseInt(m) - 1, 1);
        if (startDate && monthDate < new Date(String(startDate))) continue;
        if (endDate) {
          const eDate = new Date(String(endDate));
          eDate.setHours(23, 59, 59, 999);
          if (monthDate > eDate) continue;
        }

        result.push({
          name: `${monthNames[parseInt(m) - 1]}`,
          value: Number(profitability.toFixed(2))
        });
      }

      // Retorna até 12 meses ou todos filtrados, originalmente era slice(-6)
      return res.json(startDate || endDate ? result : result.slice(-6));

    } catch (error: any) {
       logger.error('Error fetching assets profitability:', error);
       return res.status(500).json({ error: error.message });
    }
  }

  // GET /assets/history
  static async history(req: Request, res: Response) {
    try {
      const userId = 1;
      const { assetId, assetTypeId, startDate, endDate } = req.query;

      let whereClauses = 't.user_id = ?';
      const params: any[] = [userId];

      if (assetId) {
        whereClauses += ' AND t.asset_id = ?';
        params.push(assetId);
      }
      if (assetTypeId) {
        // Se receber string que não é número (ex: 'Ação'), filtra por at.name. Se for ID, filtra por a.asset_type_id.
        if (isNaN(Number(assetTypeId))) {
          whereClauses += ' AND at.name = ?';
          params.push(assetTypeId);
        } else {
          whereClauses += ' AND a.asset_type_id = ?';
          params.push(assetTypeId);
        }
      }

      // Obtém as transações do usuário
      const [transactionsRows] = await mysqlPool.query(
        `
        SELECT 
          t.asset_id,
          t.type,
          t.quantity,
          t.price,
          t.transaction_date,
          a.symbol as ticker
        FROM transactions t
        JOIN assets a ON a.id = t.asset_id
        JOIN asset_types at ON at.id = a.asset_type_id
        WHERE ${whereClauses}
        ORDER BY t.transaction_date ASC
        `,
        params
      );

      const transactions = transactionsRows as any[];

      // Agrupa as transações por mês/ano e calcula o patrimônio
      // Simplificado: somando (quantidade acumulada) * preço_da_ultima_transacao_no_mes ou current_price atual
      
      const historyMap = new Map<string, number>();
      
      // Agrupar e calcular saldo mensal
      // Isso seria mais preciso usando asset_daily_prices, mas vamos fazer um mock/calculo simples baseado nas transacoes ou precos atuais
      
      // Busca preços atuais
      const [assetsRows] = await mysqlPool.query(
        `SELECT id, 
                COALESCE((SELECT current_price FROM asset_daily_prices WHERE asset_id = assets.id ORDER BY price_date DESC LIMIT 1), current_price) as current_price, 
                avg_price 
         FROM assets WHERE user_id = ?`,
        [userId]
      );
      
      const pricesMap = new Map();
      (assetsRows as any[]).forEach(row => {
        pricesMap.set(row.id, row.current_price > 0 ? row.current_price : row.avg_price);
      });

      // Calcular a quantidade acumulada por mês
      const monthlyQuantityMap = new Map<string, Map<number, number>>();
      
      // Inicializar alguns meses para ter um gráfico bonito se não houver muitas transações
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthlyQuantityMap.set(monthKey, new Map<number, number>());
      }
      
      let currentQuantities = new Map<number, number>();
      
      for (const t of transactions) {
        const date = new Date(t.transaction_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        let qty = currentQuantities.get(t.asset_id) || 0;
        if (t.type === 'BUY') {
          qty += Number(t.quantity);
        } else if (t.type === 'SELL') {
          qty -= Number(t.quantity);
        }
        currentQuantities.set(t.asset_id, qty);
        
        // Atualiza para o mes atual da iteracao
        if (monthlyQuantityMap.has(monthKey)) {
          const mapForMonth = monthlyQuantityMap.get(monthKey)!;
          mapForMonth.set(t.asset_id, qty);
        } else {
           // Se for um mês muito antigo
           const mapForMonth = new Map<number, number>();
           mapForMonth.set(t.asset_id, qty);
           monthlyQuantityMap.set(monthKey, mapForMonth);
        }
      }
      
      // Preenche buracos de meses vazios com saldo do mês anterior
      const sortedMonths = Array.from(monthlyQuantityMap.keys()).sort();
      let lastMonthQuantities = new Map<number, number>();
      
      for (const month of sortedMonths) {
        const monthQuantities = monthlyQuantityMap.get(month)!;
        
        // Mesclar com o anterior (o que não mudou continua igual)
        for (const [assetId, qty] of Array.from(lastMonthQuantities.entries())) {
          if (!monthQuantities.has(assetId)) {
            monthQuantities.set(assetId, qty);
          }
        }
        
        lastMonthQuantities = new Map(monthQuantities);
        
        // Calcula valor total do mês
        let monthTotal = 0;
        for (const [assetId, qty] of Array.from(monthQuantities.entries())) {
           const price = pricesMap.get(assetId) || 0;
           monthTotal += qty * price;
        }
        
        historyMap.set(month, monthTotal);
      }

      const result = sortedMonths.map(month => {
        const [year, m] = month.split('-');
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        return {
          monthDate: new Date(parseInt(year), parseInt(m) - 1, 1),
          name: `${monthNames[parseInt(m) - 1]}/${year.substring(2)}`,
          value: historyMap.get(month) || 0
        };
      });

      // Aplica filtro de datas no resultado, se houver
      let filteredResult = result;
      if (startDate) {
        filteredResult = filteredResult.filter(r => r.monthDate >= new Date(String(startDate)));
      }
      if (endDate) {
        const eDate = new Date(String(endDate));
        eDate.setHours(23, 59, 59, 999);
        filteredResult = filteredResult.filter(r => r.monthDate <= eDate);
      }
      
      const finalResult = filteredResult.map(r => ({ name: r.name, value: r.value }));

      // Retorna até 12 meses ou todos filtrados, originalmente era slice(-6)
      return res.json(startDate || endDate ? finalResult : finalResult.slice(-6));

    } catch (error: any) {
       logger.error('Error fetching assets history:', error);
       return res.status(500).json({ error: error.message });
    }
  }
}
