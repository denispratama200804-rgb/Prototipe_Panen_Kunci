import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envStr = fs.readFileSync('.env', 'utf8');
const env = {};
envStr.split(/\r?\n/).forEach(line => {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, '');
});

const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await sb.from('api_keys').select('*').limit(1);
  if (data && data[0]) {
    console.log('API_KEYS COLUMNS:', Object.keys(data[0]));
    console.log('SAMPLE ROW:', data[0]);
  }
}
check();
