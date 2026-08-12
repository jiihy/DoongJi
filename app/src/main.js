import './style.css';
import { sb, health, inviteToken } from './lib/supabase.js';

// Phase 1 스모크 화면 — 이식 진행에 따라 프로토타입 화면들로 교체된다
const app = document.getElementById('app');
const line = (k, v, ok) => `<div class="row"><span>${k}</span><b class="${ok === false ? 'no' : ok ? 'yes' : ''}">${v}</b></div>`;

async function boot() {
  const h = await health();
  const { data: { session } } = await sb.auth.getSession();
  app.innerHTML = `
    <main>
      <h1>둥지 · 연결 확인</h1>
      ${line('Supabase', h.ok ? '연결됨' : `실패 — ${h.msg}`, h.ok)}
      ${line('초대 토큰', inviteToken ? inviteToken.slice(0, 8) + '…' : '없음(시터 모드)')}
      ${line('세션', session ? session.user.email || '로그인됨' : '없음')}
      <p class="hint">다음 단계: 프로토타입 화면을 이 앱으로 이식합니다.</p>
    </main>`;
}
boot();
