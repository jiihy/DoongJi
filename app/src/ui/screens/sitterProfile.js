import { el, card, field, flash } from '../el.js';

// 프로토타입의 「펫시터 프로필」을 그대로 옮긴다 — 숫자 3종이 주인공, 보조 지표는 그 다음
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

// 프로토타입 verify()의 hero — 숫자 · 분수 · 설명 · 게이지 순서까지 그대로
const hero = (label, pctv, sub, desc) => card([
  el('div', { class: 'hero' }, [
    el('span', { class: 'l', text: label }),
    el('div', { class: 'row' }, [
      el('span', { class: 'n', text: pctv + '%' }),
      el('span', { class: 'p', text: '(' + sub + ')' }),
    ]),
    el('span', { class: 'd', text: desc }),
    el('div', { class: 'pbar' }, el('i', { style: `width:${pctv}%` })),
  ]),
]);

const minor = (k, v) => el('div', { class: 'r' }, [
  el('span', { class: 'k', text: k }), el('span', { class: 'v', text: v }),
]);

// pub이 있으면 공개 경로(SNS)로 들어온 화면 — 의뢰 폼이 붙는다
export function sitterProfileScreen(s, stats, back, pub) {
  const c = stats || {};
  const n = k => Number(c[k] || 0);
  const ui = pub?.ui;

  const inqSheet = () => {
    const d = ui.inq = ui.inq || { contact: '', when: '', msg: '', busy: false };
    const close = () => { ui.inqOpen = false; pub.rerender(); };
    const f = (label, key, ph) => field(label, {
      name: `inq_${key}`, placeholder: ph, value: d[key],
      oninput: e => { d[key] = e.target.value; },
    });
    return el('div', { class: 'sheetback',
      onclick: e => { if (e.target.classList.contains('sheetback') && !d.busy) close(); } }, [
      el('div', { class: 'sheet' }, [
        el('div', { class: 'grip' }),
        el('div', { class: 'h', text: '돌봄 의뢰 보내기' }),
        el('div', { class: 'sub', text: '보내주시면 시터가 연락드려요. 계약 전에는 아무것도 결제되지 않습니다.' }),
        f('연락받을 방법', 'contact', '예) 전화번호, 이메일'),
        f('원하는 시기 (선택)', 'when', '예) 8월 마지막 주 2박 3일'),
        f('한 줄 소개 (선택)', 'msg', '예) 말티즈 4살, 낯가림 있어요'),
        el('button', { class: 'cta', disabled: d.busy, text: d.busy ? '보내는 중…' : '보내기',
          onclick: async () => {
            if (!d.contact.trim()) { flash('연락받을 방법을 적어주세요'); return; }
            d.busy = true; pub.rerender();
            try {
              await pub.send(d.contact.trim(), d.when.trim(), d.msg.trim());
              ui.inq = null; ui.inqOpen = false; ui.inqDone = true;
              flash('의뢰를 보냈어요', '시터가 확인하면 연락드립니다.');
            } catch (e) { flash('전송 실패', e.message); }
            d.busy = false; pub.rerender();
          } }),
        el('button', { class: 'linkbtn center', text: '닫기', onclick: () => { if (!d.busy) close(); } }),
      ]),
    ]);
  };

  return {
    title: '펫시터 프로필',
    back,
    overlay: pub && ui.inqOpen ? inqSheet() : null,
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

      // ── 숫자가 주인공
      hero('약속 이행', pct(n('submitted'), n('total')), `${n('submitted')} / ${n('total')}건`,
        '보호자가 정한 항목 중 인증을 올린 비율입니다.'),
      hero('보호자 확인', pct(n('checked'), n('submitted')), `${n('checked')} / ${n('submitted')}건`,
        '보낸 것을 보호자가 직접 보고 확인한 비율입니다. 보낸 것과 확인된 것은 다릅니다.'),

      pub ? card([
        el('div', { class: 'h', text: '이 시터에게 맡기고 싶다면' }),
        el('div', { class: 'sub', text: 'SNS에서 이 프로필을 보고 오셨나요? 의뢰를 남기면 시터가 직접 연락드립니다.' }),
        ui.inqDone
          ? el('div', { class: 'okbox' }, [
              el('div', { class: 'h', text: '의뢰를 보냈어요' }),
              el('div', { class: 'sub', text: '시터가 확인하면 남겨주신 연락처로 연락드립니다.' }),
            ])
          : el('button', { class: 'cta', text: '돌봄 의뢰 보내기',
              onclick: () => { ui.inqOpen = true; pub.rerender(); } }),
      ]) : null,

      card([
        el('div', { class: 'h', text: '이 세 숫자만 보셔도 됩니다' }),
        el('div', { class: 'sub', text: '약속한 것을 얼마나 했고, 그중 얼마가 보호자에게 확인됐고, 어긋난 것은 어떻게 됐는지. 실시간 영상은 그 순간만 보여주고 사라지지만 이 숫자는 남습니다.' }),
      ]),

      // ── 보조 지표
      card([
        el('span', { class: 'veri', text: '✓ 이 서비스에서 확인됨' }),
        el('div', { class: 'minor' }, [
          minor('앱 촬영 인증', '전 건 앱 카메라 · 시각 새김'),
          minor('가짜 인증 신고', `${n('disputes')}건 중 ${n('resolved')}건 해소`
            + (n('noreply') ? ` · 무응답 ${n('noreply')}` : '')),
          minor('사진 인증', `${n('photos')}건`),
          minor('설명 인증', `${n('notes')}건`),
          minor('다시 제출', `${n('resub')}건`),
          minor('도착 직후 열람', `${n('seen')} / ${n('submitted')}건`),
          minor('산책 왕복 인증', '나갈 때·들어올 때 두 컷 · 시각 차이 기록'),
          minor('받은 리액션', `${n('reactions')}개 (😍 😌 💙)`),
          minor('먼저 챙긴 순간', `${n('extras')}건 · 보호자 고마워요 ${n('thanks')}`),
        ]),
        el('div', { class: 'sub', text: '사진과 설명의 비율을 그대로 공개합니다. 사진이 많은 시터인지는 숫자로 바로 보입니다.' }),
      ]),

      // 일기는 「시터 본인이 씀」 — 확인된 것과 섞지 않는다 (§2-3)
      (s.diary || []).length ? card([
        el('span', { class: 'unver', text: 'ⓘ 시터 본인이 씀' }),
        el('div', { class: 'h', text: `돌봄 일기 · ${s.diary.length}권` }),
        el('div', { class: 'sub', text: '돌본 아이마다 한 권씩입니다. 어떤 마음으로 돌보는 사람인지 여기서 보입니다.' }),
        ...s.diary.slice(0, 2).map(bk => el('div', { class: 'imp' }, [
          el('div', { class: 'top' }, [
            el('span', { class: 'src', text: `${bk.pet}의 돌봄 일기` }),
            el('span', { class: 'date', text: `후기 ${bk.entries}편` }),
          ]),
          bk.first ? el('div', { class: 'q',
            text: '“' + String(bk.first).slice(0, 80) + (String(bk.first).length > 80 ? '…' : '') + '”' }) : null,
          bk.public_record ? el('div', { class: 'proofline', text: '🔗 돌봄 기록 읽어보기 · 검증됨' }) : null,
        ])),
        s.diary.length > 2 ? el('div', { class: 'sub', text: `외 ${s.diary.length - 2}권` }) : null,
      ]) : null,

      card([
        el('div', { class: 'h', text: '왜 「사고 0건」이 아닌가' }),
        el('div', { class: 'sub', text: '무사고를 자랑 지표로 쓰면 이상을 알린 시터가 손해를 봅니다. 여기서는 신고된 건과 해소된 건을 함께 셉니다. 소명하지 않은 것도 숨기지 않습니다.' }),
      ]),
    ],
    hint: '숫자는 이 시터의 모든 돌봄을 합친 것입니다.',
  };
}
