import { Request, Response } from 'express'
import { z } from 'zod'
import logger from '../../core/logger'
import { mysqlPool } from '../../config/mysql'

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
          a.current_price,
          a.currency,
          a.first_purchase_date
        FROM assets a
        JOIN asset_types at ON at.id = a.asset_type_id
        WHERE a.user_id = ?
        `,
        [userId],
      )

      // const assets = rows as any[]

      const assets = (rows as any[]).map(row => ({
        ...row,
        type: typeof row.type === 'string' ? Buffer.from(row.type, 'latin1').toString('utf8') : row.type
      }));

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
        [assetId],
      )

      return res.status(201).json((rows as any[])[0])
    } catch (error: any) {
      return res.status(400).json({ error: error.errors || error.message })
    }
  }

  // DELETE /assets/:id
  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params

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

      return res.json((rows as any[])[0])
    } catch (error: any) {
      return res.status(400).json({ error: error.message })
    }
  }

  // GET /assets/history
  static async history(req: Request, res: Response) {
    try {
      const userId = 1;

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
        WHERE t.user_id = ?
        ORDER BY t.transaction_date ASC
        `,
        [userId]
      );

      const transactions = transactionsRows as any[];

      // Agrupa as transações por mês/ano e calcula o patrimônio
      // Simplificado: somando (quantidade acumulada) * preço_da_ultima_transacao_no_mes ou current_price atual
      
      const historyMap = new Map<string, number>();
      
      // Agrupar e calcular saldo mensal
      // Isso seria mais preciso usando asset_daily_prices, mas vamos fazer um mock/calculo simples baseado nas transacoes ou precos atuais
      
      // Busca preços atuais
      const [assetsRows] = await mysqlPool.query(
        'SELECT id, current_price, avg_price FROM assets WHERE user_id = ?',
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
          name: `${monthNames[parseInt(m) - 1]}/${year.substring(2)}`,
          value: historyMap.get(month) || 0
        };
      });

      // Retorna os últimos 6 meses
      return res.json(result.slice(-6));

    } catch (error: any) {
       logger.error('Error fetching assets history:', error);
       return res.status(500).json({ error: error.message });
    }
  }
}
