import { Request, Response } from 'express';
import { z } from 'zod';
import logger from '../../core/logger';
import { mysqlPool } from '../../config/mysql';
import { updatePrices } from '../../workers/priceUpdater';

// Schemas
const transactionSchema = z.object({
  ticker: z.string(),
  type: z.enum(['BUY', 'SELL']),
  value: z.number().positive(),
  quantity: z.number().positive(),
  date: z.string().datetime().optional(),
  assetType: z.string().optional(),
  sector: z.string().optional()
});

const bulkTransactionsSchema = z.array(transactionSchema);

export class TransactionsController {

  // GET /transactions (Com filtro de data e limite)
  static async list(req: Request, res: Response) {
    try {
      const { startDate, endDate, limit } = req.query; // <--- ADICIONADO LIMIT

      const userId = 1;

      const params: any[] = [userId];
      const whereClauses: string[] = ['t.user_id = ?'];

      if (startDate) {
        whereClauses.push('t.transaction_date >= ?');
        params.push(new Date(String(startDate)));
      }

      if (endDate) {
        const end = new Date(String(endDate));
        end.setHours(23, 59, 59, 999);
        whereClauses.push('t.transaction_date <= ?');
        params.push(end);
      }

      let limitClause = '';
      if (limit) {
        limitClause = 'LIMIT ?';
        params.push(Number(limit));
      }

      const [rows] = await mysqlPool.query(
        `
        SELECT 
          t.id,
          t.type,
          t.quantity,
          t.price AS value,
          t.transaction_date,
          a.symbol AS ticker,
          a.currency,
          at.name AS asset_type
        FROM transactions t
        JOIN assets a ON a.id = t.asset_id
        JOIN asset_types at ON at.id = a.asset_type_id
        WHERE ${whereClauses.join(' AND ')}
        ORDER BY t.transaction_date DESC
        ${limitClause}
        `,
        params,
      );

      // Mantém shape esperado pelo frontend (asset aninhado com ticker)
      const formatted = (rows as any[]).map((row) => ({
        id: row.id,
        type: row.type,
        value: row.value,
        quantity: row.quantity,
        transaction_date: row.transaction_date,
        asset: {
          ticker: row.ticker,
          type: row.asset_type,
          currency: row.currency,
        },
      }));

      return res.json(formatted);

    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  // POST /transactions (Individual)
  static async create(req: Request, res: Response) {
    try {
      const txData = transactionSchema.parse(req.body);
      const userId = req.user.id;

      const result = await TransactionsController.processTransaction(userId, txData);

      if (result.status === 'error') {
        return res.status(400).json({ error: result.msg });
      }

      return res.status(201).json({ 
        message: 'Transação registrada com sucesso',
        asset: result.ticker,
        new_avg_price: result.new_avg
      });

    } catch (error: any) {
      return res.status(400).json({ error: error.errors || error.message });
    }
  }

  // POST /transactions/bulk (Lote)
  static async bulkCreate(req: Request, res: Response) {
    try {
      const transactions = bulkTransactionsSchema.parse(req.body);
      const userId = req.user.id;
      const results = [];

      for (const tx of transactions) {
        const res = await TransactionsController.processTransaction(userId, tx);
        results.push(res);
      }

      return res.status(201).json({ 
        message: 'Processamento em lote concluído', 
        details: results 
      });

    } catch (error: any) {
      logger.error('Erro bulk transactions', error);
      return res.status(400).json({ error: error.errors || error.message });
    }
  }

  // DELETE /transactions/:id
  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await mysqlPool.execute('DELETE FROM transactions WHERE id = ?', [id]);
      return res.status(204).send();
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  // --- Lógica de Negócio Centralizada ---
  private static async processTransaction(userId: string, tx: any) {
    try {
      const numericUserId = 1;

      const [assetRows] = await mysqlPool.query(
        'SELECT * FROM assets WHERE user_id = ? AND symbol = ? LIMIT 1',
        [numericUserId, tx.ticker],
      );

      let asset: any = (assetRows as any[])[0];

      if (!asset) {
        if (tx.type === 'BUY') {
          const assetTypeName = tx.assetType || 'Ação';
          const [typeRows] = await mysqlPool.query(
            'SELECT id FROM asset_types WHERE name = ? LIMIT 1',
            [assetTypeName],
          );

          let assetTypeId: number;

          if ((typeRows as any[]).length === 0) {
            const [insertTypeResult] = await mysqlPool.execute(
              'INSERT INTO asset_types (name) VALUES (?)',
              [assetTypeName],
            );
            assetTypeId = (insertTypeResult as any).insertId;
          } else {
            assetTypeId = (typeRows as any)[0].id;
          }

          const [insertAssetResult] = await mysqlPool.execute(
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
            VALUES (?, ?, ?, ?, CURDATE(), 0, 0, 0, 'BRL')
            `,
            [numericUserId, assetTypeId, tx.ticker, tx.ticker],
          );

          const newAssetId = (insertAssetResult as any).insertId;

          // Atualiza dados na BRAPI (cotação, proventos etc.) assim que cria um novo ativo
          try {
            await updatePrices(true, tx.ticker);
          } catch (err) {
            logger.error(`Erro ao atualizar cotações e proventos na criação do ativo ${tx.ticker} via transação`, err);
          }

          const [newAssetRows] = await mysqlPool.query(
            'SELECT * FROM assets WHERE id = ?',
            [newAssetId],
          );

          asset = (newAssetRows as any[])[0];
        } else {
          return { ticker: tx.ticker, status: 'error', msg: 'Venda de ativo inexistente' };
        }
      }

      let currentQty = Number(asset.quantity);
      let currentAvg = Number(asset.avg_price);
      const txQty = Number(tx.quantity);
      const txValue = Number(tx.value);

      if (tx.type === 'BUY') {
        const totalOld = currentQty * currentAvg;
        const totalNew = txQty * txValue;
        currentQty += txQty;
        currentAvg = (totalOld + totalNew) / currentQty;
      } else if (tx.type === 'SELL') {
        if (currentQty < txQty) {
          return { ticker: tx.ticker, status: 'error', msg: 'Saldo insuficiente para venda' };
        }
        currentQty -= txQty;
      }

      await mysqlPool.execute(
        `
        UPDATE assets
        SET quantity = ?, avg_price = ?, updated_at = NOW()
        WHERE id = ?
        `,
        [currentQty, currentAvg, asset.id],
      );

      await mysqlPool.execute(
        `
        INSERT INTO transactions (
          user_id,
          asset_id,
          type,
          quantity,
          price,
          transaction_date
        )
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          numericUserId,
          asset.id,
          tx.type,
          txQty,
          txValue,
          tx.date ? new Date(tx.date) : new Date(),
        ],
      );

      return { ticker: tx.ticker, status: 'success', new_avg: currentAvg };

    } catch (err: any) {
      return { ticker: tx.ticker, status: 'error', msg: err.message };
    }
  }
}