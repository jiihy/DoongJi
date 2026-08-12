import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_KEY;
if (!url || !key) throw new Error('.env.local에 VITE_SUPABASE_URL / VITE_SUPABASE_KEY를 넣어주세요');

// 보호자는 무계정 — 초대 토큰을 헤더로 실어 보내면 RLS(request.invite_token)가 계약 범위를 연다
export const inviteToken = new URLSearchParams(location.search).get('t') || null;
// 공개 프로필 경로 — SNS에 뿌리는 주소는 /s/<slug>, ?s=<slug>도 받는다
// 남에게 보내는 링크는 반드시 공개 주소여야 한다.
// localhost·LAN에서 복사하면 받은 사람이 못 연다 — 그때는 배포 주소로 바꾼다.
export const SITE = 'https://doongji-kappa.vercel.app';
export const shareOrigin = () =>
  /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|.*\.local)$/.test(location.hostname)
    ? SITE : location.origin;

// 공개 돌봄 기록 — /r/<record_token>
export const recordToken = (() => {
  const m = location.pathname.match(/^\/r\/([A-Za-z0-9_-]+)\/?$/);
  return m ? m[1] : (new URLSearchParams(location.search).get('r') || null);
})();

export const publicSlug = (() => {
  const m = location.pathname.match(/^\/s\/([A-Za-z0-9_-]+)\/?$/);
  return m ? m[1] : (new URLSearchParams(location.search).get('s') || null);
})();

export const sb = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true },
  global: { headers: inviteToken ? { 'x-invite-token': inviteToken } : {} },
});

export async function health() {
  const { error } = await sb.from('sitters').select('id', { count: 'exact', head: true });
  return error ? { ok: false, msg: error.message } : { ok: true };
}
