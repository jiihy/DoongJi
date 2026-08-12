import './style.css';
import { sb, inviteToken, publicSlug, recordToken } from './lib/supabase.js';
import { paint, el, card } from './ui/el.js';
import { ensureSitter, listInquiries } from './data/sitter.js';
import { listClients, listContracts } from './data/contracts.js';
import { loginScreen } from './ui/screens/login.js';
import { profileScreen } from './ui/screens/profile.js';
import { sitterHomeScreen } from './ui/screens/sitterHome.js';
import { loadContract } from './data/owner.js';
import { ownerWelcome, ownerInstall, ownerConfirm, ownerSchedule, ownerHome, ownerPetProfile, installSeen, markInstallSeen, freshProofs } from './ui/screens/owner.js';
import { sitterProfileScreen } from './ui/screens/sitterProfile.js';
import { bellButton, bellScreen } from './ui/screens/bell.js';
import { diaryWriteScreen, booksScreen } from './ui/screens/diary.js';
import { importedScreen } from './ui/screens/imported.js';
import { listImported } from './data/sitter.js';
import { listBooks, writtenPets } from './data/care.js';
import { listEvents, readEvents, markSeen } from './data/care.js';
import { sitterStats, publicProfile, sendInquiry, publicRecord } from './data/owner.js';
import { recordScreen } from './ui/screens/record.js';
import { newContractScreen } from './ui/screens/newContract.js';
import { loadCare, hydrate } from './data/care.js';
import { sitterCareScreen } from './ui/screens/sitterCare.js';
import { sitterContractScreen } from './ui/screens/sitterContract.js';

const ctx = { sitter: null, session: null, screen: 'home', clients: [], contracts: [] };
const uiState = {};
const rerender = () => render();
const go = async (screen, arg) => {
  // 종을 여는 것 자체가 읽음이다 — 화면을 그린 뒤 표시해서 NEW가 한 번은 보이게 한다
  const wasBell = ctx.screen === 'bell';
  ctx.screen = screen;
  if (screen === 'bell') {
    render();
    const unread = (ctx.events || []).filter(e => !e.read_at).map(e => e.id);
    if (unread.length) { await readEvents(unread); ctx.events = await listEvents('sitter'); }
    return;
  }
  if (wasBell) ctx.events = await listEvents('sitter');
  if (screen === 'diaryWrite') {
    uiState.written = await writtenPets(ctx.sitter.id, ctx.careId);
    uiState.writeFor = null;
  }
  if (screen === 'books') ctx.books = await listBooks(ctx.sitter.id);
  if (screen === 'imported') ctx.imported = await listImported(ctx.sitter.id);
  if (screen === 'care' || screen === 'contract') {
    ctx.careId = arg || ctx.careId; ctx.care = null; render();
    ctx.care = await loadCare(ctx.careId);
    if (screen === 'care') watchCare(); else unwatch();
  } else { unwatch(); await refresh(); }
  render();
};

async function refresh() {
  if (!ctx.sitter) return;
  try {
    [ctx.clients, ctx.contracts, ctx.inquiries, ctx.events] = await Promise.all([
      listClients(ctx.sitter.id), listContracts(ctx.sitter.id), listInquiries(), listEvents('sitter'),
    ]);
  } catch (e) { console.error(e); }
}

/* ── 공개 프로필 (SNS 링크) — 계정도 토큰도 없다 ── */
const pubState = { p: null, err: null, ui: {} };
const renderPublic = () => {
  if (pubState.err) return paint({ title: '펫시터 프로필', body: [card([
    el('div', { class: 'h', text: '프로필을 찾을 수 없어요' }),
    el('div', { class: 'sub', text: '링크를 다시 확인해주세요.' }),
  ])] });
  if (!pubState.p) return paint({ title: '둥지', body: [card([el('div', { class: 'sub', text: '불러오는 중…' })])] });
  return paint(sitterProfileScreen(pubState.p, pubState.p.stats, null, {
    ui: pubState.ui,
    rerender: renderPublic,
    send: (contact, when, msg) => sendInquiry(publicSlug, contact, when, msg),
  }));
};

const recState = { r: null, loaded: false };
const renderRecord = () => recState.loaded
  ? paint(recordScreen(recState.r))
  : paint({ title: '돌봄 기록', body: [card([el('div', { class: 'sub', text: '불러오는 중…' })])] });

function render() {
  if (recordToken) return renderRecord();
  if (publicSlug) return renderPublic();
  if (inviteToken) return renderOwner();
  if (!ctx.session) return paint(loginScreen(uiState, rerender));
  if (!ctx.sitter) return paint({ title: '둥지', body: [card([el('div', { class: 'sub', text: '불러오는 중…' })])] });

  if (ctx.screen === 'bell') {
    const byId = Object.fromEntries((ctx.contracts || []).map(c => [c.id,
      `${c.owners?.nickname || '보호자'} · ${(c.contract_pets || []).map(cp => cp.pets?.name).filter(Boolean).join('·')}`]));
    return paint(bellScreen(ctx.events || [], () => go('home'), '보호자 알림',
      '보호자가 확인·전달·리액션을 하면 여기에 쌓입니다.', {
        label: e => byId[e.contract_id] || null,
        onPick: e => {
          const c = (ctx.contracts || []).find(x => x.id === e.contract_id);
          if (!c) return;
          go(c.sent_at ? 'care' : 'contract', c.id);
        },
      }));
  }
  if (ctx.screen === 'profile') return paint(profileScreen(ctx, rerender, go));
  if (ctx.screen === 'newContract') return paint(newContractScreen(ctx, go, rerender));
  if (ctx.screen === 'care') {
    if (!ctx.care) return paint({ title: '오늘의 돌봄', body: [card([el('div', { class: 'sub', text: '불러오는 중…' })])] });
    return paint(sitterCareScreen(ctx.care, uiState, go,
      async () => { ctx.care = await loadCare(ctx.careId); render(); }, rerender));
  }
  if (ctx.screen === 'contract') {
    if (!ctx.care) return paint({ title: '돌봄 정보', body: [card([el('div', { class: 'sub', text: '불러오는 중…' })])] });
    return paint(sitterContractScreen(ctx.care, uiState, go,
      async () => { ctx.care = await loadCare(ctx.careId); render(); }, rerender));
  }
  if (ctx.screen === 'diaryWrite') {
    if (!ctx.care) return paint({ title: '후기 작성', body: [card([el('div', { class: 'sub', text: '불러오는 중…' })])] });
    return paint(diaryWriteScreen(ctx.care, uiState, ctx.sitter.id, go,
      async () => { ctx.care = await loadCare(ctx.careId); ctx.books = await listBooks(ctx.sitter.id); }, rerender));
  }
  if (ctx.screen === 'books') return paint(booksScreen(ctx.books || [], go));
  if (ctx.screen === 'imported') return paint(importedScreen(ctx, go, rerender,
    async () => { ctx.imported = await listImported(ctx.sitter.id); }));
  const unread = (ctx.events || []).filter(e => !e.read_at).length;
  return paint(sitterHomeScreen(ctx, go, rerender, bellButton(unread, () => go('bell'))));
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
    .on('postgres_changes', { event: '*', schema: 'public', table: 'extras', filter: `contract_id=eq.${ctx.careId}` },
      async () => { if (ctx.screen === 'care') { ctx.care = await loadCare(ctx.careId); render(); } })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'events' },
      async () => { ctx.events = await listEvents('sitter'); if (ctx.screen !== 'bell') render(); })
    .subscribe();
}

/* ── 보호자(무계정) 경로 ── */
const owner = { c: null, screen: null, ui: {}, err: null, events: [] };
const ownerGo = async s => {
  if (s === 'live') {
    owner.screen = s; renderOwner();
    // 이 화면을 연 것이 곧 열람 — 인증에 seen을 남기고 알림도 읽음 처리한다
    const ids = freshProofs(owner.c);
    const evIds = owner.events.filter(e => !e.read_at).map(e => e.id);
    if (ids.length) await markSeen(ids);
    if (evIds.length) await readEvents(evIds);
    if (ids.length || evIds.length) { await ownerReload(); renderOwner(); }
    return;
  }
  if (s === 'sitterProfile' && !owner.pub && owner.c?.sitters?.invite_slug) {
    try { owner.pub = await publicProfile(owner.c.sitters.invite_slug); } catch (e) { owner.pub = null; }
  }
  if (s === 'home') markInstallSeen();   // 설치 안내를 지나쳤으면 다시 막지 않는다
  if (s === 'install') owner.ui.step = 1;
  owner.screen = s; renderOwner();
};
const ownerReload = async () => {
  try {
    owner.c = await loadContract();
    owner.events = await listEvents('owner', owner.c.id);
  } catch (e) { owner.err = e.message; }
};

let ownerChannel = null;
function watchOwner() {
  if (ownerChannel || !owner.c) return;
  ownerChannel = sb.channel(`owner:${owner.c.id}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'proofs' },
      async () => { await ownerReload(); renderOwner(); })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'extras', filter: `contract_id=eq.${owner.c.id}` },
      async () => { await ownerReload(); renderOwner(); })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `contract_id=eq.${owner.c.id}` },
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
  if (screen === 'petProfile') return paint(ownerPetProfile(c, owner.ui, go, async () => { await reload(); rr(); }, rr));
  if (screen === 'sitterProfile') {
    const sp = owner.pub || c.sitters || {};
    return paint(sitterProfileScreen(sp, sp.stats, () => go('home')));
  }
  if (screen === 'live') return paint(bellScreen(owner.events, () => go('home'), '지금 오는 인증',
    '시터가 인증을 보내면 여기에 먼저 뜹니다.', {
      label: () => `${(c.sitters || {}).name} 시터 · ${c.pets.map(p => p.name).join('·')}`,
      onPick: () => go('home'),
    }));
  const unseen = freshProofs(c);
  const unreadEv = owner.events.filter(e => !e.read_at).length;
  return paint(ownerHome(c, go, owner.ui, rr, bellButton(Math.max(unseen.length, unreadEv), () => go('live'))));
}

/* 새 배포 감지 — 홈 화면에 추가한 앱은 index.html을 오래 물고 있는다.
   화면으로 돌아올 때 버전만 확인하고 다르면 한 번 새로고침한다. */
const BUILD = typeof __BUILD__ === 'string' ? __BUILD__ : '';
let checking = false;
async function checkBuild() {
  if (checking || document.visibilityState !== 'visible') return;
  checking = true;
  try {
    const r = await fetch('/version.json', { cache: 'no-store' });
    if (r.ok) {
      const { build } = await r.json();
      if (build && BUILD && build !== BUILD) location.reload();
    }
  } catch (e) {} finally { checking = false; }
}
document.addEventListener('visibilitychange', checkBuild);
window.addEventListener('focus', checkBuild);
setInterval(checkBuild, 5 * 60 * 1000);

(async () => {
  if (recordToken) {
    try { recState.r = await publicRecord(recordToken); } catch (e) { recState.r = null; }
    recState.loaded = true; renderRecord();
    return;
  }
  if (publicSlug) {
    try { pubState.p = await publicProfile(publicSlug); if (!pubState.p) pubState.err = 'notfound'; }
    catch (e) { pubState.err = e.message; }
    renderPublic();
    return;
  }
  if (inviteToken) { await ownerReload(); renderOwner(); watchOwner(); return; }
  const { data: { session } } = await sb.auth.getSession();
  ctx.session = session;
  if (session) { ctx.sitter = await ensureSitter(); await refresh(); }
  render();
})();
