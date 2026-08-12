import { el, card, field, flash } from '../el.js';
import { sb } from '../../lib/supabase.js';
import { saveSitter } from '../../data/sitter.js';

export function profileScreen(ctx, rerender, go) {
  const s = ctx.sitter;
  const patch = {};
  const f = (label, key, ph) => field(label, {
    type: 'text', placeholder: ph, value: s[key] || '',
    oninput: e => { patch[key] = e.target.value; },
  });
  const inviteUrl = `${location.origin}/?t=`;   // M2에서 계약 토큰이 붙는다

  return {
    title: '내 프로필',
    back: go ? () => go('home') : null,
    right: { label: '로그아웃', on: async () => { await sb.auth.signOut(); location.reload(); } },
    body: [
      card([
        el('div', { class: 'h', text: s.name }),
        el('div', { class: 'sub', text: [s.type, s.region].filter(Boolean).join(' · ') || '정보를 채워주세요' }),
      ]),
      card([
        el('div', { class: 'h', text: '보호자에게 보이는 정보' }),
        f('이름', 'name', '예) 박서준'),
        f('서비스 유형', 'type', '예) 방문 돌봄'),
        f('활동 지역', 'region', '예) 서울 마포구'),
        f('기본 약속 장소', 'addr', '예) 서울 마포구 월드컵북로 12'),
        f('장소 상세', 'addr_detail', '예) 1층 카페 앞'),
        f('한 줄 소개', 'bio', '예) 기록으로 신뢰를 쌓습니다'),
      ]),
      card([
        el('div', { class: 'h', text: '초대 링크' }),
        el('div', { class: 'sub', text: '다음 단계(M2)에서 계약을 만들면 이 주소에 토큰이 붙습니다.' }),
        el('div', { class: 'mono', text: inviteUrl + '…' }),
      ]),
    ],
    foot: [el('button', {
      class: 'cta', text: '저장',
      onclick: async () => {
        if (!Object.keys(patch).length) { flash('바뀐 내용이 없어요'); return; }
        try {
          ctx.sitter = await saveSitter(s.id, patch);
          flash('저장했어요', '새로고침해도 유지됩니다.');
          rerender();
        } catch (e) { flash('저장 실패', e.message); }
      },
    })],
    hint: 'M1 — 로그인·프로필이 서버에 저장됩니다.',
  };
}
