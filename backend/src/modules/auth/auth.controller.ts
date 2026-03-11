import { Request, Response } from 'express';
import { supabase } from '../../config/supabase';
import { mysqlPool } from '../../config/mysql';
import { registerSchema, loginSchema, refreshTokenSchema } from './auth.schema';
import logger from '../../core/logger';
import { z } from 'zod';

export class AuthController {
  
  // POST /auth/register
  static async register(req: Request, res: Response) {
    try {
      // 1. Validação de Input
      const data = registerSchema.parse(req.body);
      
      // 2. Criar Usuário no Auth do Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: { full_name: data.fullName }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Erro ao criar usuário no Auth");

      const myReferralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      let initialStatus = process.env.ENABLE_PAYMENTS === 'true' ? 'inactive' : 'active';

      // 3. Atualizar a tabela Profiles (FIX DO ERRO 500)
      // Passamos a string diretamente (YYYY-MM-DD) para evitar erros de timezone do JS
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authData.user.id,
          full_name: data.fullName,
          phone: data.phone,
          birth_date: data.birthDate || null, // data.birthDate já é string "1999-10-20"
          referral_code: myReferralCode,
          subscription_status: initialStatus,
        });

      if (profileError) {
        logger.error(`Erro no banco: ${profileError.message}`);
        return res.status(500).json({ error: profileError.message });
      }

      // 4. RETORNO PARA O FRONTEND (FIX DO CRASH NO FRONT)
      // O seu use-auth.tsx faz: const { access_token } = response.data.session
      // Sem o campo 'session' aqui, o frontend sempre dirá "Registration failed"
      return res.status(201).json({
        message: "Usuário criado com sucesso.",
        session: authData.session, // OBRIGATÓRIO para o frontend
        user: { 
          id: authData.user.id, 
          email: data.email,
          status: initialStatus
        }
      });

    } catch (error: any) {
      logger.error(`Erro no Register: ${error.message}`);
      return res.status(400).json({ error: error.message });
    }
  }

  // POST /auth/login
  static async login(req: Request, res: Response) {
    try {
      const data = loginSchema.parse(req.body);

      // Nova lógica simples buscando no MySQL
      const [rows]: any = await mysqlPool.query(
        'SELECT id, email, password FROM users WHERE email = ?',
        [data.email]
      );

      if (rows.length === 0) {
        return res.status(401).json({ error: "Invalid credentials or user not found." });
      }

      const user = rows[0];

      if (user.password !== data.password) {
        return res.status(401).json({ error: "Invalid credentials or user not found." });
      }

      logger.info(`Login efetuado (MySQL mock): ${data.email}`);

      // Retornar um token "fake" para satisfazer o frontend
      return res.json({
        session: {
          access_token: `fake-token-${user.id}`,
          refresh_token: `fake-refresh-${user.id}`
        },
        subscriptionStatus: 'active'
      });

    } catch (error: any) {
      logger.error(`Erro no Login: ${error.message}`);
      return res.status(401).json({ error: "Invalid credentials or user not found." });
    }
  }

  // POST /auth/refresh
  static async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = refreshTokenSchema.parse(req.body);

      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });

      if (error) throw error;
      if (!data.session) throw new Error("Não foi possível renovar a sessão");

      return res.json({ session: data.session });

    } catch (error: any) {
      logger.error(`Erro no Refresh Token: ${error.message}`);
      return res.status(401).json({ error: "Token inválido ou expirado." });
    }
  }

  // GET /auth/profile - Obter dados cadastrais
  static async getProfile(req: Request, res: Response) {
    try {
      const userId = req.user.id; // O middleware sempre põe id: 1 na mock ou você usa o id real.
      
      const [rows]: any = await mysqlPool.query(
        'SELECT id, full_name as fullName, username, email, phone, birthday as birthDate, address, gender FROM users WHERE id = ?',
        [userId]
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      return res.json({ profile: rows[0] });

    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  // PUT /auth/profile - Atualizar dados cadastrais
  static async updateProfile(req: Request, res: Response) {
    try {
      // Schema simples para atualização na tabela users
      const updateSchema = z.object({
        fullName: z.string().min(3).optional(),
        username: z.string().min(3).optional(),
        phone: z.string().optional(),
        birthDate: z.string().optional(),
        address: z.string().optional(),
        gender: z.string().optional(),
        password: z.string().optional(),
      });

      const data = updateSchema.parse(req.body);
      const userId = req.user.id;

      // Monta as queries de update baseadas no que foi enviado
      const updates: string[] = [];
      const values: any[] = [];

      if (data.fullName) {
        updates.push('full_name = ?');
        values.push(data.fullName);
      }
      if (data.username) {
        updates.push('username = ?');
        values.push(data.username);
      }
      if (data.phone !== undefined) {
        updates.push('phone = ?');
        values.push(data.phone || null);
      }
      if (data.birthDate !== undefined) {
        updates.push('birthday = ?');
        values.push(data.birthDate === "" ? null : data.birthDate);
      }
      if (data.address !== undefined) {
        updates.push('address = ?');
        values.push(data.address || null);
      }
      if (data.gender !== undefined) {
        updates.push('gender = ?');
        values.push(data.gender || null);
      }
      if (data.password) {
        updates.push('password = ?');
        values.push(data.password);
      }

      if (updates.length > 0) {
        values.push(userId);
        await mysqlPool.query(
          `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
          values
        );
      }

      return res.json({ message: 'Perfil atualizado' });

    } catch (error: any) {
      logger.error('Erro no updateProfile:', error);
      
      let errorMessage = error.message;
      if (error instanceof z.ZodError) {
        errorMessage = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      }
      
      return res.status(400).json({ error: errorMessage || 'Erro ao atualizar perfil' });
    }
  }

  static async forgotPassword(req: Request, res: Response) {
    try {
      // 1. Limpeza e Normalização
      const email = String(req.body.email).trim().toLowerCase();
      
      if (!email || email === "undefined") {
        return res.status(400).json({ error: "E-mail inválido ou não fornecido." });
      }

      // 2. Chamada ao Supabase com Redirect URL configurada
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'http://localhost:3001/reset-password',
      });

      if (error) {
        logger.error(`Erro Supabase ForgotPassword: ${error.message}`);
        // Se o erro for "Email address invalid", avise sobre a confirmação
        if (error.message.includes("invalid")) {
          return res.status(400).json({ error: "Este e-mail ainda não foi confirmado ou é inválido no sistema." });
        }
        throw error;
      }

      return res.status(200).json({ message: "Link de recuperação enviado para o seu e-mail." });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  static async resetPassword(req: Request, res: Response) {
    try {
      const { password } = req.body;
      // O Supabase lida com o token automaticamente se o usuário clicar no link do e-mail
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;
      return res.status(200).json({ message: "Senha alterada com sucesso." });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
}