import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bmuthjyibkrcqyygjcxe.supabase.co';
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';

const adminSupabase = SUPABASE_SECRET_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
  : null;

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { action, table, data, id } = body;

    if (action === 'generate_recovery_link' && data?.email) {
      if (!adminSupabase) {
        return res.status(500).json({ success: false, error: 'SUPABASE_SERVICE_ROLE_KEY belum diatur di environment.' });
      }

      const { data: linkData, error } = await adminSupabase.auth.admin.generateLink({
        type: 'recovery',
        email: data.email,
        options: {
          redirectTo: data.redirectTo || 'https://prototipe-panen-kunci.vercel.app/#/reset-password'
        }
      });

      if (error) {
        return res.status(400).json({ success: false, error: error.message });
      }

      return res.status(200).json({
        success: true,
        action_link: linkData?.properties?.action_link
      });
    }

    return res.status(400).json({ success: false, error: 'Aksi tidak didukung' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
