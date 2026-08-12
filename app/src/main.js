import './style.css';
import { sb, inviteToken } from './lib/supabase.js';
import { paint, el, card } from './ui/el.js';
import { ensureSitter } from './data/sitter.js';
import { loginScreen } from './ui/screens/login.js';
import { profileScreen } from './ui/screens/profile.js';

const ctx = { sitter: null, session: null };
const uiState = {};
const rerender = () => render();

async function render() {
  if (inviteToken) {                       // 보호자 경로는 M3에서 구현
    paint({
      title: '초대장',
      body: [card([
        el('div', { class: 'h', text: '보호자 초대 링크로 들어오셨어요' }),
        el('div', { class: 'sub', text: `토큰 ${inviteToken.slice(0, 8)}… 확인됨. 보호자 화면은 다음 단계(M3)에서 열립니다.` }),
      ])],
      hint: 'M3 — 보호자 무계정 진입',
    });
    return;
  }
  if (!ctx.session) { paint(loginScreen(uiState, rerender)); return; }
  if (!ctx.sitter) {
    try { ctx.sitter = await ensureSitter(); }
    catch (e) {
      paint({ title: '오류', body: [card([el('div', { class: 'sub', text: e.message })])] });
      return;
    }
  }
  paint(profileScreen(ctx, rerender));
}

sb.auth.onAuthStateChange((_evt, session) => {
  ctx.session = session;
  if (!session) ctx.sitter = null;
  render();
});

(async () => {
  const { data: { session } } = await sb.auth.getSession();
  ctx.session = session;
  render();
})();
