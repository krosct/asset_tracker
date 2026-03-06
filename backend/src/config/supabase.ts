import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY;

// LOG DE VERIFICAÇÃO
console.log('--- DEBUG SUPABASE CONFIG ---');
console.log('URL definida:', !!supabaseUrl);
console.log('Service Role Key presente:', !!serviceKey);
console.log('Anon Key presente:', !!anonKey);

if (serviceKey) {
  console.log('Utilizando: SERVICE_ROLE_KEY (Final: ...' + serviceKey.slice(-4) + ')');
} else {
  console.log('Utilizando: ANON_KEY (Final: ...' + anonKey?.slice(-4) + ')');
}
console.log('-----------------------------');

const supabaseKey = serviceKey || anonKey;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Faltam variáveis de ambiente SUPABASE_URL ou SUPABASE_KEY');
}

// MUDANÇA: auth: { autoRefreshToken: false, persistSession: false }
// Isso é importante para backends, para não misturar sessões de usuários diferentes
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});