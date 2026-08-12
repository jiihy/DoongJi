import { el, card } from '../el.js';

// 프로토타입의 「펫시터 프로필」을 그대로 옮긴다 — 숫자 3종이 주인공, 보조 지표는 그 다음
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0) + '%';

const hero = (label, big, sub, desc) => card([
  el('div', { class: 'herolab', text: label }),
  el('div', { class: 'herobig', text: big }),
  el('div', { class: 'herosub', text: sub }),
  el('div', { class: 'sub', text: desc }),
]);

const minor = (k, v) => el('div', { class: 'minorrow' }, [
  el('span', { class: 'sub', text: k }),
  el('span', { class: 'minorv', text: v }),
]);

export function sitterProfileScreen(s, stats, back) {
  const c = stats || {};
  const n = k => Number(c[k] || 0);

  return {
    title: '펫시터 프로필',
    back,
    body: [
      card([
        el('div', { class: 'profhead' }, [
          el('div', { class: 'avatar' + (s.photo_url ? ' hasimg' : ''),
            style: s.photo_url ? `background-image:url(${s.photo_url})` : null }),
          el('div', { class: 'pcol' }, [
            el('div', { class: 'h', text: `${s.name} 펫시터` }),
            el('div', { class: 'sub', text: [s.type, s.region].filter(Boolean).join(' · ') || '정보 없음' }),
          ]),
        ]),
        s.bio ? el('div', { class: 'lead', text: s.bio }) : null,
      ]),

      hero('약속 이행', pct(n('submitted'), n('total')), `${n('submitted')} / ${n('total')}건`,
        '보호자가 정한 항목 중 인증을 올린 비율입니다.'),
      hero('보호자 확인', pct(n('checked'), n('submitted')), `${n('checked')} / ${n('submitted')}건`,
        '보낸 것을 보호자가 직접 보고 확인한 비율입니다. 보낸 것과 확인된 것은 다릅니다.'),

      card([
        el('div', { class: 'h', text: '이 두 숫자만 보셔도 됩니다' }),
        el('div', { class: 'sub', text: '약속한 것을 얼마나 했고, 그중 얼마가 보호자에게 확인됐는지. 실시간 영상은 그 순간만 보여주고 사라지지만 이 숫자는 남습니다.' }),
      ]),

      card([
        el('span', { class: 'veri', text: '✓ 이 서비스에서 확인됨' }),
        el('div', { class: 'minor' }, [
          minor('앱 촬영 인증', '앱 카메라 · 시각 새김'),
          minor('사진 인증', `${n('photos')}건`),
          minor('설명 인증', `${n('notes')}건`),
          minor('다시 제출', `${n('resub')}건`),
          minor('도착 직후 열람', `${n('seen')} / ${n('submitted')}건`),
          minor('가짜 인증 신고', `${n('disputes')}건 중 ${n('resolved')}건 해소`
            + (n('noreply') ? ` · 무응답 ${n('noreply')}` : '')),
          minor('받은 리액션', `${n('reactions')}개 (😍 😌 💙)`),
          minor('먼저 챙긴 순간', `${n('extras')}건 · 보호자 고마워요 ${n('thanks')}`),
        ]),
        el('div', { class: 'sub', text: '사진과 설명의 비율을 그대로 공개합니다. 사진이 많은 시터인지는 숫자로 바로 보입니다.' }),
      ]),

      card([
        el('div', { class: 'h', text: '왜 「사고 0건」이 아닌가' }),
        el('div', { class: 'sub', text: '무사고를 자랑 지표로 쓰면 이상을 알린 시터가 손해를 봅니다. 여기서는 신고된 건과 해소된 건을 함께 셉니다. 소명하지 않은 것도 숨기지 않습니다.' }),
      ]),
    ],
    hint: '숫자는 이 시터의 모든 돌봄을 합친 것입니다.',
  };
}
