import { el, card, field, flash } from '../el.js';
import { sb } from '../../lib/supabase.js';

export function loginScreen(state, rerender) {
  state.email = state.email || '';
  const send = async () => {
    const email = (state.email || '').trim();
    if (!email.includes('@')) { flash('이메일을 확인해주세요'); return; }
    const { error } = await sb.auth.signInWithOtp({
      email, options: { emailRedirectTo: location.origin },
    });
    if (error) { flash('전송 실패', error.message); return; }
    state.sent = true; rerender();
  };

  return {
    title: '둥지',
    body: [
      card([
        el('div', { class: 'h', text: '시터 로그인' }),
        el('div', { class: 'sub', text: '비밀번호 없이 이메일로 들어옵니다. 메일의 링크를 누르면 바로 로그인돼요.' }),
        state.sent
          ? el('div', { class: 'okbox' }, [
              el('div', { class: 'h', text: '메일을 보냈어요' }),
              el('div', { class: 'sub', text: `${state.email} 으로 로그인 링크를 보냈습니다. 같은 브라우저에서 열어주세요.` }),
              el('button', { class: 'ctasm', text: '다시 보내기', onclick: () => { state.sent = false; rerender(); } }),
            ])
          : field('이메일', {
              type: 'email', placeholder: 'you@example.com', value: state.email,
              oninput: e => { state.email = e.target.value; },
            }),
      ]),
      card([
        el('div', { class: 'h', text: '보호자세요?' }),
        el('div', { class: 'sub', text: '시터가 보낸 초대 링크를 열면 로그인 없이 바로 이용할 수 있어요.' }),
      ]),
    ],
    foot: state.sent ? [] : [el('button', { class: 'cta', text: '로그인 링크 받기', onclick: send })],
    hint: '이 화면은 시터용입니다.',
  };
}
