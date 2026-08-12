import { sb } from '../lib/supabase.js';

// 로그인한 시터의 프로필 행을 보장한다 (없으면 생성)
export async function ensureSitter() {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;

  const { data: found, error } = await sb.from('sitters').select('*').eq('auth_uid', user.id).maybeSingle();
  if (error) throw error;
  if (found) return found;

  const guessName = (user.email || '시터').split('@')[0];
  const { data: made, error: e2 } = await sb.from('sitters')
    .insert({ auth_uid: user.id, name: guessName }).select().single();
  if (e2) throw e2;
  return made;
}

export async function saveSitter(id, patch) {
  const { data, error } = await sb.from('sitters').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}
