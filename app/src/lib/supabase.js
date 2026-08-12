import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_KEY;
if (!url || !key) throw new Error('.env.local에 VITE_SUPABASE_URL / VITE_SUPABASE_KEY를 넣어주세요');

// 보호자는 무계정 — 초대 토큰을 헤더로 실어 보내면 RLS(request.invite_token)가 계약 범위를 연다
export const inviteToken = new URLSearchParams(location.search).get('t') || null;

export const sb = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true },
  global: { headers: inviteToken ? { 'request.invite_token': inviteToken } : {} },
});

export async function health() {
  const { error } = await sb.from('sitters').select('id', { count: 'exact', head: true });
  return error ? { ok: false, msg: error.message } : { ok: true };
}
