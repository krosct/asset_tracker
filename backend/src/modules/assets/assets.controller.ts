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

function getPeriodKey(date: Date, periodicity: string): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  
  if (periodicity === 'Diário') return `${y}-${m}-${d}`;
  if (periodicity === 'Semanal') {
    const firstDayOfYear = new Date(y, 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    return `${y}-W${String(weekNum).padStart(2, '0')}`;
  }
  if (periodicity === 'Trimestral') {
    const q = Math.ceil((date.getMonth() + 1) / 3);
    return `${y}-Q${q}`;
  }
  if (periodicity === 'Anual') return `${y}`;
  
  return `${y}-${m}`;
}

function formatPeriodName(key: string, periodicity: string): string {
  const parts = key.split('-');
  const y = parts[0].substring(2);
  
  if (periodicity === 'Diário') {
    return `${parts[2]}/${parts[1]}/${y}`;
  }
  if (periodicity === 'Semanal') {
    return `${parts[1]}/${y}`;
  }
  if (periodicity === 'Trimestral') {
    return `${parts[1]}/${y}`;
  }
  if (periodicity === 'Anual') {
    return `${parts[0]}`;
  }
  
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const m = parseInt(parts[1], 10);
  return `${monthNames[m - 1]}/${y}`;
}

function parsePeriodDate(key: string, periodicity: string): Date {
  const parts = key.split('-');
  const y = parseInt(parts[0], 10);
  
  if (periodicity === 'Diário') {
    return new Date(y, parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }
  if (periodicity === 'Semanal') {
    const w = parseInt(parts[1].substring(1), 10);
    return new Date(y, 0, 1 + (w - 1) * 7);
  }
  if (periodicity === 'Trimestral') {
    const q = parseInt(parts[1].substring(1), 10);
    return new Date(y, (q - 1) * 3, 1);
  }
  if (periodicity === 'Anual') {
    return new Date(y, 0, 1);
  }
  
  return new Date(y, parseInt(parts[1], 10) - 1, 1);
}

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
      const { assetId, assetTypeId, startDate, endDate, periodicity = 'Mensal' } = req.query;

      let whereClauses = 'a.user_id = ? AND ad.payment_date IS NOT NULL';
      const params: any[] = [userId];

      if (assetId) {
        const ids = String(assetId).split(',').map(id => Number(id.trim())).filter(id => !isNaN(id));
        if (ids.length > 0) {
          whereClauses += ` AND a.id IN (${ids.map(() => '?').join(',')})`;
          params.push(...ids);
        }
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
      let dateGroupExpr = `DATE_FORMAT(ad.payment_date, '%Y-%m')`;
      if (periodicity === 'Diário') dateGroupExpr = `DATE_FORMAT(ad.payment_date, '%Y-%m-%d')`;
      else if (periodicity === 'Semanal') dateGroupExpr = `CONCAT(YEAR(ad.payment_date), '-W', LPAD(WEEK(ad.payment_date, 1), 2, '0'))`;
      else if (periodicity === 'Trimestral') dateGroupExpr = `CONCAT(YEAR(ad.payment_date), '-Q', QUARTER(ad.payment_date))`;
      else if (periodicity === 'Anual') dateGroupExpr = `DATE_FORMAT(ad.payment_date, '%Y')`;

      const query = `
        SELECT 
          ${dateGroupExpr} AS month,
          a.id AS asset_id,
          a.symbol AS ticker,
          at.name AS asset_type,
          SUM(ad.amount * (
            SELECT COALESCE(SUM(CASE WHEN type = 'BUY' THEN quantity ELSE -quantity END), 0)
            FROM transactions t
            WHERE t.asset_id = ad.asset_id 
              AND t.user_id = ?
              AND t.transaction_date <= COALESCE(ad.date_com, ad.payment_date)
          )) AS asset_dividend
        FROM asset_dividends ad
        JOIN assets a ON a.id = ad.asset_id
        JOIN asset_types at ON at.id = a.asset_type_id
        WHERE ${whereClauses}
        GROUP BY month, asset_id, ticker, asset_type
        ORDER BY month ASC
      `;

      // Primeiro param é pro sub-select e o resto pra query principal
      const [rows] = await mysqlPool.query(query, [userId, ...params]);

      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      
      const monthlyData = new Map<string, {
        total: number,
        categories: Record<string, number>,
        assets: { ticker: string, type: string, value: number, quantity: number }[]
      }>();

      for (const row of rows as any[]) {
        if (row.asset_dividend <= 0) continue;

        let assetType = row.asset_type;
        if (typeof assetType === 'string') {
          const converted = Buffer.from(assetType, 'latin1').toString('utf8');
          if (!converted.includes('')) {
            assetType = converted;
          }
        }

        if (!monthlyData.has(row.month)) {
          monthlyData.set(row.month, { total: 0, categories: {}, assets: [] });
        }

        const data = monthlyData.get(row.month)!;
        const val = Number(row.asset_dividend);
        
        data.total += val;
        
        if (!data.categories[assetType]) data.categories[assetType] = 0;
        data.categories[assetType] += val;

        data.assets.push({
          ticker: row.ticker,
          type: assetType,
          value: val,
          quantity: 0 // Quantidade não é tão relevante em dividendos diretamente, mas mantemos por compatibilidade estrutural
        });
      }

      const result = Array.from(monthlyData.entries()).map(([month, data]) => {
        data.assets.sort((a, b) => b.value - a.value);

        return {
          name: formatPeriodName(month, String(periodicity)),
          value: Number(data.total.toFixed(2)),
          details: {
            categories: data.categories,
            assets: data.assets
          }
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
      const { assetId, assetTypeId, startDate, endDate, periodicity = 'Mensal' } = req.query;

      let whereClauses = 't.user_id = ?';
      const params: any[] = [userId];

      if (assetId) {
        const ids = String(assetId).split(',').map(id => Number(id.trim())).filter(id => !isNaN(id));
        if (ids.length > 0) {
          whereClauses += ` AND t.asset_id IN (${ids.map(() => '?').join(',')})`;
          params.push(...ids);
        }
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
      if (periodicity === 'Mensal') {
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthKey = getPeriodKey(d, String(periodicity));
          monthlyQuantityMap.set(monthKey, new Map<number, number>());
        }
      }

      let currentQuantities = new Map<number, number>();
      for (const t of transactions) {
        const date = new Date(t.transaction_date);
        const monthKey = getPeriodKey(date, String(periodicity));
        
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
      
      let priceGroupExpr = `DATE_FORMAT(price_date, '%Y-%m')`;
      if (periodicity === 'Diário') priceGroupExpr = `DATE_FORMAT(price_date, '%Y-%m-%d')`;
      else if (periodicity === 'Semanal') priceGroupExpr = `CONCAT(YEAR(price_date), '-W', LPAD(WEEK(price_date, 1), 2, '0'))`;
      else if (periodicity === 'Trimestral') priceGroupExpr = `CONCAT(YEAR(price_date), '-Q', QUARTER(price_date))`;
      else if (periodicity === 'Anual') priceGroupExpr = `DATE_FORMAT(price_date, '%Y')`;
      
      if (assetIds.length > 0) {
        const [pricesRows] = await mysqlPool.query(
          `
          SELECT asset_id, ${priceGroupExpr} as month, close_price 
          FROM asset_daily_prices 
          WHERE asset_id IN (?)
          AND (asset_id, price_date) IN (
              SELECT asset_id, MAX(price_date) 
              FROM asset_daily_prices 
              GROUP BY asset_id, ${priceGroupExpr}
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
        `SELECT a.id, 
                a.symbol as ticker,
                at.name as asset_type,
                COALESCE((SELECT current_price FROM asset_daily_prices WHERE asset_id = a.id ORDER BY price_date DESC LIMIT 1), a.current_price) as current_price, 
                a.avg_price 
         FROM assets a
         LEFT JOIN asset_types at ON a.asset_type_id = at.id
         WHERE a.user_id = ?`,
        [userId]
      );
      const defaultPricesMap = new Map();
      (assetsRows as any[]).forEach(row => {
        defaultPricesMap.set(row.id, row.current_price > 0 ? row.current_price : row.avg_price);
      });

      // Calculate value per month
      let previousValue = 0;
      let previousPricesMap = new Map<number, number>();
      let previousAssetsValue = new Map<number, number>();
      const result = [];

      for (const month of sortedMonths) {
        const monthQuantities = monthlyQuantityMap.get(month)!;
        let monthTotal = 0;
        
        const details = {
          categories: {} as Record<string, number>,
          assets: [] as { ticker: string, type: string, value: number, quantity: number }[]
        };
        
        let categoriesWeightedReturn = {} as Record<string, number>;
        let categoriesPrevValue = {} as Record<string, number>;

        for (const [assetId, qty] of Array.from(monthQuantities.entries())) {
           let price = 0;
           if (pricesByMonthAndAsset.has(month) && pricesByMonthAndAsset.get(month)!.has(assetId)) {
             price = pricesByMonthAndAsset.get(month)!.get(assetId)!;
           } else {
             price = defaultPricesMap.get(assetId) || 0;
           }
           
           const val = qty * price;
           monthTotal += val;
           
           if (qty > 0 || (previousAssetsValue.has(assetId) && previousAssetsValue.get(assetId)! > 0)) {
             const prevPrice = previousPricesMap.get(assetId) || price;
             const prevVal = previousAssetsValue.get(assetId) || 0;
             
             let assetProf = 0;
             if (prevPrice > 0 && previousPricesMap.has(assetId)) {
               assetProf = ((price - prevPrice) / prevPrice) * 100;
             }
             
             const info = (assetsRows as any[]).find((a: any) => a.id === assetId) || { ticker: 'Desconhecido', asset_type: 'Outros' };
             let assetType = info.asset_type;
             if (typeof assetType === 'string') {
               const converted = Buffer.from(assetType, 'latin1').toString('utf8');
               if (!converted.includes('')) assetType = converted;
             }
             
             if (!categoriesWeightedReturn[assetType]) categoriesWeightedReturn[assetType] = 0;
             if (!categoriesPrevValue[assetType]) categoriesPrevValue[assetType] = 0;
             
             // O retorno da categoria deve ponderar pelo valor que o ativo tinha no mês anterior
             // Se não tinha valor no mês anterior, não influencia a rentabilidade % do mês da categoria
             categoriesWeightedReturn[assetType] += prevVal * assetProf;
             categoriesPrevValue[assetType] += prevVal;
             
             if (prevVal > 0 || val > 0) {
               details.assets.push({
                 ticker: info.ticker,
                 type: assetType,
                 value: assetProf,
                 quantity: qty
               });
             }
           }
           
           previousPricesMap.set(assetId, price);
           previousAssetsValue.set(assetId, val);
        }
        
        for (const [cat, prevCatVal] of Object.entries(categoriesPrevValue)) {
           let catProf = 0;
           if (prevCatVal > 0) {
             catProf = categoriesWeightedReturn[cat] / prevCatVal;
           }
           details.categories[cat] = catProf;
        }
        
        details.assets.sort((a, b) => b.value - a.value);
        
        // Simple profitability calculation: (Current Value - Previous Value) / Previous Value (Not accounting for cash flows precisely for simplicity, but better than nothing)
        let profitability = 0;
        if (previousValue > 0) {
           profitability = ((monthTotal - previousValue) / previousValue) * 100;
        } else if (previousValue === 0 && monthTotal > 0) {
           profitability = 0; 
        }

        previousValue = monthTotal;

        const monthDate = parsePeriodDate(month, String(periodicity));
        if (startDate && monthDate < new Date(String(startDate))) continue;
        if (endDate) {
          const eDate = new Date(String(endDate));
          eDate.setHours(23, 59, 59, 999);
          if (monthDate > eDate) continue;
        }

        result.push({
          name: formatPeriodName(month, String(periodicity)),
          value: Number(profitability.toFixed(2)),
          details
        });
      }

      // Retorna até 12 meses ou todos filtrados
      return res.json(startDate || endDate ? result : result.slice(periodicity === 'Mensal' ? -6 : -12));

    } catch (error: any) {
       logger.error('Error fetching assets profitability:', error);
       return res.status(500).json({ error: error.message });
    }
  }

  // GET /assets/history
  static async history(req: Request, res: Response) {
    try {
      const userId = 1;
      const { assetId, assetTypeId, startDate, endDate, periodicity = 'Mensal' } = req.query;

      let whereClauses = 't.user_id = ?';
      const params: any[] = [userId];

      if (assetId) {
        const ids = String(assetId).split(',').map(id => Number(id.trim())).filter(id => !isNaN(id));
        if (ids.length > 0) {
          whereClauses += ` AND t.asset_id IN (${ids.map(() => '?').join(',')})`;
          params.push(...ids);
        }
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
      
      // Busca preços atuais e informações dos ativos
      const [assetsRows] = await mysqlPool.query(
        `SELECT a.id, 
                a.symbol as ticker,
                at.name as asset_type,
                COALESCE((SELECT current_price FROM asset_daily_prices WHERE asset_id = a.id ORDER BY price_date DESC LIMIT 1), a.current_price) as current_price, 
                a.avg_price 
         FROM assets a
         LEFT JOIN asset_types at ON a.asset_type_id = at.id
         WHERE a.user_id = ?`,
        [userId]
      );
      
      const pricesMap = new Map();
      const assetsInfoMap = new Map();
      (assetsRows as any[]).forEach(row => {
        let assetType = row.asset_type;
        if (typeof assetType === 'string') {
          const converted = Buffer.from(assetType, 'latin1').toString('utf8');
          if (!converted.includes('')) {
            assetType = converted;
          }
        }
        
        pricesMap.set(row.id, row.current_price > 0 ? row.current_price : row.avg_price);
        assetsInfoMap.set(row.id, { ticker: row.ticker, type: assetType || 'Outros' });
      });

      // Calcular a quantidade acumulada por período
      const monthlyQuantityMap = new Map<string, Map<number, number>>();
      
      // Inicializar alguns meses para ter um gráfico bonito se não houver muitas transações
      const now = new Date();
      if (periodicity === 'Mensal') {
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthKey = getPeriodKey(d, String(periodicity));
          monthlyQuantityMap.set(monthKey, new Map<number, number>());
        }
      }
      
      let currentQuantities = new Map<number, number>();
      
      for (const t of transactions) {
        const date = new Date(t.transaction_date);
        const monthKey = getPeriodKey(date, String(periodicity));
        
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
      
      const historyDetailsMap = new Map<string, any>();
      
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
        let details = {
          categories: {} as Record<string, number>,
          assets: [] as { ticker: string, type: string, value: number, quantity: number }[]
        };

        for (const [assetId, qty] of Array.from(monthQuantities.entries())) {
           if (qty <= 0) continue;
           const price = pricesMap.get(assetId) || 0;
           const val = qty * price;
           
           if (val > 0) {
             monthTotal += val;
             const info = assetsInfoMap.get(assetId) || { ticker: 'Desconhecido', type: 'Outros' };
             
             if (!details.categories[info.type]) details.categories[info.type] = 0;
             details.categories[info.type] += val;

             details.assets.push({ ticker: info.ticker, type: info.type, value: val, quantity: qty });
           }
        }
        
        details.assets.sort((a, b) => b.value - a.value);
        
        historyMap.set(month, monthTotal);
        historyDetailsMap.set(month, details);
      }

      const result = sortedMonths.map(month => {
        return {
          monthDate: parsePeriodDate(month, String(periodicity)),
          name: formatPeriodName(month, String(periodicity)),
          value: historyMap.get(month) || 0,
          details: historyDetailsMap.get(month)
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
      
      const finalResult = filteredResult.map(r => ({ name: r.name, value: r.value, details: r.details }));

      // Retorna até 12 meses ou todos filtrados, originalmente era slice(-6)
      return res.json(startDate || endDate ? finalResult : finalResult.slice(periodicity === 'Mensal' ? -6 : -12));

    } catch (error: any) {
       logger.error('Error fetching assets history:', error);
       return res.status(500).json({ error: error.message });
    }
  }
}
