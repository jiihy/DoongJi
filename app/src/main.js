import './style.css';
import { sb, inviteToken } from './lib/supabase.js';
import { paint, el, card } from './ui/el.js';
import { ensureSitter } from './data/sitter.js';
import { listClients, listContracts } from './data/contracts.js';
import { loginScreen } from './ui/screens/login.js';
import { profileScreen } from './ui/screens/profile.js';
import { sitterHomeScreen } from './ui/screens/sitterHome.js';
import { loadContract } from './data/owner.js';
import { ownerWelcome, ownerInstall, ownerConfirm, ownerSchedule, ownerHome, installSeen, markInstallSeen } from './ui/screens/owner.js';
import { newContractScreen } from './ui/screens/newContract.js';
import { loadCare, hydrate } from './data/care.js';
import { sitterCareScreen } from './ui/screens/sitterCare.js';

const ctx = { sitter: null, session: null, screen: 'home', clients: [], contracts: [] };
const uiState = {};
const rerender = () => render();
const go = async (screen, arg) => {
  ctx.screen = screen;
  if (screen === 'care') { ctx.careId = arg || ctx.careId; ctx.care = null; render(); ctx.care = await loadCare(ctx.careId); watchCare(); }
  else { unwatch(); await refresh(); }
  render();
};

async function refresh() {
  if (!ctx.sitter) return;
  try {
    [ctx.clients, ctx.contracts] = await Promise.all([
      listClients(ctx.sitter.id), listContracts(ctx.sitter.id),
    ]);
  } catch (e) { console.error(e); }
}

function render() {
  if (inviteToken) return renderOwner();
  if (!ctx.session) return paint(loginScreen(uiState, rerender));
  if (!ctx.sitter) return paint({ title: '둥지', body: [card([el('div', { class: 'sub', text: '불러오는 중…' })])] });

  if (ctx.screen === 'profile') return paint(profileScreen(ctx, rerender, go));
  if (ctx.screen === 'newContract') return paint(newContractScreen(ctx, go, rerender));
  if (ctx.screen === 'care') {
    if (!ctx.care) return paint({ title: '오늘의 돌봄', body: [card([el('div', { class: 'sub', text: '불러오는 중…' })])] });
    return paint(sitterCareScreen(ctx.care, uiState, go,
      async () => { ctx.care = await loadCare(ctx.careId); render(); }, rerender));
  }
  return paint(sitterHomeScreen(ctx, go, rerender));
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

/* ── 실시간 — 상대가 올린 것이 30초 안에 이 화면에 뜨게 한다 ── */
let channel = null;
function unwatch() { if (channel) { sb.removeChannel(channel); channel = null; } }
function watchCare() {
  unwatch();
  if (!ctx.careId) return;
  channel = sb.channel(`care:${ctx.careId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'proofs' },
      async () => { if (ctx.screen === 'care') { ctx.care = await loadCare(ctx.careId); render(); } })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'schedule_items', filter: `contract_id=eq.${ctx.careId}` },
      async () => { if (ctx.screen === 'care') { ctx.care = await loadCare(ctx.careId); render(); } })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'care_notes' },
      async () => { if (ctx.screen === 'care') { ctx.care = await loadCare(ctx.careId); render(); } })
    .subscribe();
}

/* ── 보호자(무계정) 경로 ── */
const owner = { c: null, screen: null, ui: {}, err: null };
const ownerGo = s => {
  if (s === 'home') markInstallSeen();   // 설치 안내를 지나쳤으면 다시 막지 않는다
  if (s === 'install') owner.ui.step = 1;
  owner.screen = s; renderOwner();
};
const ownerReload = async () => { try { owner.c = await loadContract(); } catch (e) { owner.err = e.message; } };

let ownerChannel = null;
function watchOwner() {
  if (ownerChannel || !owner.c) return;
  ownerChannel = sb.channel(`owner:${owner.c.id}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'proofs' },
      async () => { await ownerReload(); renderOwner(); })
    .subscribe();
}

function ownerDefault(c) {
  if (!c.confirmed_at) return 'welcome';
  if (!c.sent_at) return 'schedule';
  if (!installSeen()) return 'install';
  return 'home';
}

function renderOwner() {
  if (owner.err) return paint({ title: '열 수 없어요', body: [card([
    el('div', { class: 'h', text: '초대 링크를 확인해주세요' }),
    el('div', { class: 'sub', text: owner.err }),
  ])] });
  if (!owner.c) return paint({ title: '둥지', body: [card([el('div', { class: 'sub', text: '불러오는 중…' })])] });

  const c = owner.c;
  const screen = owner.screen || ownerDefault(c);
  const go = ownerGo;
  const reload = async () => { await ownerReload(); };
  const rr = () => renderOwner();

  if (screen === 'welcome')  return paint(ownerWelcome(c, go));
  if (screen === 'install')  return paint(ownerInstall(owner.ui, go, rr));
  if (screen === 'confirm')  return paint(ownerConfirm(c, owner.ui, go, async () => { await reload(); rr(); }, rr));
  if (screen === 'schedule') return paint(ownerSchedule(c, owner.ui, go, async () => { await reload(); rr(); }, rr));
  return paint(ownerHome(c, go, owner.ui, rr));
}

(async () => {
  if (inviteToken) { await ownerReload(); renderOwner(); watchOwner(); return; }
  const { data: { session } } = await sb.auth.getSession();
  ctx.session = session;
  if (session) { ctx.sitter = await ensureSitter(); await refresh(); }
  render();
})();
