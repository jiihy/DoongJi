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

// 프로필 사진 — avatars 버킷의 {auth_uid}/ 폴더에만 쓸 수 있다 (Storage RLS)
export async function uploadAvatar(file) {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error('로그인이 필요해요');
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${user.id}/avatar.${ext}`;
  const { error } = await sb.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  const { data } = sb.storage.from('avatars').getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;   // 같은 경로 덮어쓰기 — 캐시 무력화
}

// 받은 의뢰 (공개 프로필 → send_inquiry). 내 것만 읽힌다 (RLS inq_read)
export async function listInquiries() {
  const { data, error } = await sb.from('inquiries').select('*').order('at', { ascending: false });
  if (error) throw error;
  return data || [];
}
export const markInquiry = async (id, handled) => {
  await sb.from('inquiries').update({ handled }).eq('id', id).throwOnError();
};

// 가져온 후기 — 캡처가 있어야 등록된다 (F20). 「확인하지 않음」 라벨은 화면이 붙인다
export async function listImported(sitterId) {
  const { data, error } = await sb.from('imported_reviews')
    .select('*').eq('sitter_id', sitterId).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}
export async function uploadCapture(sitterId, file) {
  const { prepare } = await import('../lib/photo.js');
  const { blob } = await prepare(file, { burn: false });
  const path = `${sitterId}/${Date.now()}.jpg`;
  const { error } = await sb.storage.from('imports').upload(path, blob, { contentType: 'image/jpeg' });
  if (error) throw error;
  return sb.storage.from('imports').getPublicUrl(path).data.publicUrl;
}
export async function addImported(sitterId, row) {
  const { error } = await sb.from('imported_reviews').insert({ sitter_id: sitterId, ...row });
  if (error) throw error;
}
export const delImported = async id => {
  await sb.from('imported_reviews').delete().eq('id', id).throwOnError();
};
