import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres"),
  fullName: z.string().min(3, "Nome muito curto"),
  phone: z.string().optional(),
  // Torna a data opcional, mas valida formato se for enviada
  birthDate: z.string()
    .refine((date) => !isNaN(Date.parse(date)), {
      message: "Invalid date format!",
    })
    .refine((date) => {
      const parsedDate = new Date(date);
      const minAgeLimit = new Date();
      minAgeLimit.setFullYear(minAgeLimit.getFullYear() - 18);
      return parsedDate <= minAgeLimit;
    }, {
      message: "Birth Date can't be in the future.",
    })
    .refine((date) => {
      const parsedDate = new Date(date);
      const minDate = new Date();
      minDate.setFullYear(minDate.getFullYear() - 120); // Limite de 120 anos
      return parsedDate >= minDate;
    }, {
      message: "If you really are too old like that, go enjoy your days, man!",
    })
    .optional(),
  referralCode: z.string().length(6).optional(),
});

export const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh Token é obrigatório"),
});