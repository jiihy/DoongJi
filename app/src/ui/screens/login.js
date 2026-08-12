import { el, card, field, flash } from '../el.js';
import { sb } from '../../lib/supabase.js';

// 매직링크는 네이버·아웃룩 메일이 링크를 미리 열어(prefetch) 토큰을 소모해 버린다.
// → 비밀번호 로그인이 기본. (가입 확인 메일은 프리페치돼도 '확인' 처리라 오히려 도움이 된다)
export function loginScreen(state, rerender) {
  state.email = state.email || '';
  state.pw = state.pw || '';
  state.mode = state.mode || 'in';        // 'in' | 'up'

  const busy = v => { state.busy = v; rerender(); };

  const signIn = async () => {
    const { email, pw } = state;
    if (!email.includes('@') || pw.length < 6) { flash('이메일과 비밀번호(6자 이상)를 확인해주세요'); return; }
    busy(true);
    const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password: pw });
    busy(false);
    if (error) {
      flash('로그인 실패', error.message.includes('Invalid login')
        ? '이메일 또는 비밀번호가 맞지 않아요. 처음이면 가입하기를 눌러주세요.' : error.message);
    }
  };

  const signUp = async () => {
    const { email, pw } = state;
    if (!email.includes('@') || pw.length < 6) { flash('이메일과 비밀번호(6자 이상)를 확인해주세요'); return; }
    busy(true);
    const { data, error } = await sb.auth.signUp({
      email: email.trim(), password: pw, options: { emailRedirectTo: location.origin },
    });
    busy(false);
    if (error) {
      flash('가입 실패', error.message.includes('already registered')
        ? '이미 가입된 이메일이에요. 로그인으로 시도해주세요.' : error.message);
      return;
    }
    if (data.session) return;                     // 확인 불필요 설정이면 바로 로그인
    state.needConfirm = true; rerender();
  };

  const body = [
    card([
      el('div', { class: 'h', text: state.mode === 'up' ? '시터 가입' : '시터 로그인' }),
      el('div', { class: 'sub', text: state.mode === 'up'
        ? '이메일과 비밀번호로 계정을 만듭니다. 확인 메일이 오면 링크를 눌러주세요.'
        : '이메일과 비밀번호로 들어옵니다.' }),
      field('이메일', {
        type: 'email', placeholder: 'you@example.com', value: state.email, autocomplete: 'email',
        oninput: e => { state.email = e.target.value; },
      }),
      field('비밀번호', {
        type: 'password', placeholder: '6자 이상', value: state.pw,
        autocomplete: state.mode === 'up' ? 'new-password' : 'current-password',
        oninput: e => { state.pw = e.target.value; },
        onkeydown: e => { if (e.key === 'Enter') (state.mode === 'up' ? signUp : signIn)(); },
      }),
      el('button', {
        class: 'linkbtn',
        text: state.mode === 'up' ? '이미 계정이 있어요 · 로그인' : '처음이신가요? 가입하기',
        onclick: () => { state.mode = state.mode === 'up' ? 'in' : 'up'; state.needConfirm = false; rerender(); },
      }),
    ]),
  ];

  if (state.needConfirm) body.push(card([
    el('div', { class: 'h', text: '확인 메일을 보냈어요' }),
    el('div', { class: 'sub', text: `${state.email} 으로 계정 확인 메일을 보냈습니다. 링크를 누른 뒤 아래 버튼으로 로그인하세요.` }),
    el('button', { class: 'ctasm', text: '확인했어요 · 로그인', onclick: signIn }),
  ]));

  body.push(card([
    el('div', { class: 'h', text: '보호자세요?' }),
    el('div', { class: 'sub', text: '시터가 보낸 초대 링크를 열면 로그인 없이 바로 이용할 수 있어요.' }),
  ]));

  return {
    title: '둥지',
    body,
    foot: [el('button', {
      class: 'cta', disabled: !!state.busy,
      text: state.busy ? '처리 중…' : (state.mode === 'up' ? '가입하기' : '로그인'),
      onclick: state.mode === 'up' ? signUp : signIn,
    })],
    hint: '이 화면은 시터용입니다.',
  };
}
