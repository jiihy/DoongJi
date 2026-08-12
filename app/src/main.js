import './style.css';
import { sb, inviteToken } from './lib/supabase.js';
import { paint, el, card } from './ui/el.js';
import { ensureSitter } from './data/sitter.js';
import { listClients, listContracts } from './data/contracts.js';
import { loginScreen } from './ui/screens/login.js';
import { profileScreen } from './ui/screens/profile.js';
import { sitterHomeScreen } from './ui/screens/sitterHome.js';
import { newContractScreen } from './ui/screens/newContract.js';

const ctx = { sitter: null, session: null, screen: 'home', clients: [], contracts: [] };
const uiState = {};
const rerender = () => render();
const go = async (screen) => { ctx.screen = screen; await refresh(); render(); };

async function refresh() {
  if (!ctx.sitter) return;
  try {
    [ctx.clients, ctx.contracts] = await Promise.all([
      listClients(ctx.sitter.id), listContracts(ctx.sitter.id),
    ]);
  } catch (e) { console.error(e); }
}

function render() {
  if (inviteToken) {
    paint({ title: '초대장', body: [card([
      el('div', { class: 'h', text: '보호자 초대 링크로 들어오셨어요' }),
      el('div', { class: 'sub', text: `토큰 ${inviteToken.slice(0, 8)}… 확인됨. 보호자 화면은 다음 단계(M3)에서 열립니다.` }),
    ])], hint: 'M3 — 보호자 무계정 진입' });
    return;
  }
  if (!ctx.session) return paint(loginScreen(uiState, rerender));
  if (!ctx.sitter) return paint({ title: '둥지', body: [card([el('div', { class: 'sub', text: '불러오는 중…' })])] });

  if (ctx.screen === 'profile') return paint(profileScreen(ctx, rerender, go));
  if (ctx.screen === 'newContract') return paint(newContractScreen(ctx, go, rerender));
  return paint(sitterHomeScreen(ctx, go));
}

// TOKEN_REFRESHED·탭 복귀까지 다시 그리면 입력 중 화면이 튕긴다 — 로그인/로그아웃만 반응한다
sb.auth.onAuthStateChange(async (event, session) => {
  const wasIn = !!ctx.session;
  ctx.session = session;
  if (!session) { ctx.sitter = null; ctx.screen = 'home'; render(); return; }
  if (wasIn && event !== 'SIGNED_IN') return;      // 조용히 갱신만
  ctx.sitter = await ensureSitter();
  await refresh();
  render();
});

(async () => {
  const { data: { session } } = await sb.auth.getSession();
  ctx.session = session;
  if (session) { ctx.sitter = await ensureSitter(); await refresh(); }
  render();
})();
