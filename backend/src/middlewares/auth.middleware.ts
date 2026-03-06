import { Request, Response, NextFunction } from 'express';
import logger from '../core/logger';

// Extende a tipagem do Express para incluir o user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const ensureAuthenticated = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  try {
    // MODO DEV: não valida mais no Supabase.
    // Apenas garante que existe um header Authorization e associa tudo ao usuário 1 do MySQL.
    req.user = { id: 1 };
    next();
  } catch (err) {
    logger.error('Erro no middleware de auth', err);
    return res.status(500).json({ error: 'Erro interno de autenticação' });
  }
};