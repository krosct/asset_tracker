import { Request, Response } from 'express';
import { supabase } from '../../config/supabase';
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

      const { data: sessionData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) throw error;

      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_status')
        .eq('id', sessionData.user.id)
        .single();

      logger.info(`Login efetuado: ${data.email}`);

      return res.json({
        session: sessionData.session,
        subscriptionStatus: profile?.subscription_status || 'inactive'
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

  // PUT /auth/profile - Atualizar dados cadastrais
  static async updateProfile(req: Request, res: Response) {
    try {
      // Schema simples para atualização
      const updateSchema = z.object({
        fullName: z.string().min(3).optional(),
        phone: z.string().optional(),
        birthDate: z.string().optional(),
      });

      const data = updateSchema.parse(req.body);
      const userId = req.user.id;

      // Atualiza no Supabase Auth (Opcional, se quiser manter sincronizado)
      if (data.fullName) {
        await supabase.auth.updateUser({
          data: { full_name: data.fullName }
        });
      }

      // Atualiza na tabela Profiles
      const { data: profile, error } = await supabase
        .from('profiles')
        .update({
          full_name: data.fullName,
          phone: data.phone,
          birth_date: data.birthDate || null,
          updated_at: new Date()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      return res.json({ message: 'Perfil atualizado', profile });

    } catch (error: any) {
      return res.status(400).json({ error: error.message });
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