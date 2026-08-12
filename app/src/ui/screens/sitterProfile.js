import { el, card, field, flash, openLightbox } from '../el.js';

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
  const offsite = Number(s.offsite_done || 0);
  const doneAll = n('submitted') + offsite;
  const totalAll = n('total') + offsite;

  const inqSheet = () => {
    const d = ui.inq = ui.inq || { contact: '', pet: '', when: '', msg: '', busy: false };
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
        f('아이 이름', 'pet', '예) 초코'),
        f('원하는 시기 (선택)', 'when', '예) 8월 마지막 주 2박 3일'),
        f('한 줄 소개 (선택)', 'msg', '예) 말티즈 4살, 낯가림 있어요'),
        el('button', { class: 'cta', disabled: d.busy, text: d.busy ? '보내는 중…' : '보내기',
          onclick: async () => {
            if (!d.contact.trim()) { flash('연락받을 방법을 적어주세요'); return; }
            d.busy = true; pub.rerender();
            try {
              await pub.send(d.contact.trim(), d.when.trim(), d.msg.trim(), d.pet.trim());
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

      // ── 숫자가 주인공. 앱 밖(당근)에서 마친 건수를 함께 센다
      hero('약속 이행', pct(doneAll, totalAll), `${doneAll} / ${totalAll}건`,
        offsite ? `당근 알바에서 마친 ${offsite}건을 포함합니다.`
                : '보호자가 정한 항목 중 인증을 올린 비율입니다.'),

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

      // 일기는 「시터 본인이 씀」 — 확인된 것과 섞지 않는다 (§2-3)
      (s.diary || []).length ? card([
        el('div', { class: 'h', text: `돌봄 일기 · ${s.diary.length}권` }),
        el('div', { class: 'sub', text: '돌본 아이마다 한 권씩입니다. 어떤 마음으로 돌보는 사람인지 여기서 보입니다.' }),
        ...s.diary.slice(0, 2).map(bk => el('div', { class: 'imp' }, [
          el('div', { class: 'top' }, [
            el('span', { class: 'src', text: `${bk.pet}의 돌봄 일기` }),
            el('span', { class: 'date', text: `후기 ${bk.entries}편` }),
          ]),
          bk.first ? el('div', { class: 'q',
            text: '“' + String(bk.first).slice(0, 80) + (String(bk.first).length > 80 ? '…' : '') + '”' }) : null,
          bk.record_token ? el('a', { class: 'proofline', href: `/r/${bk.record_token}`,
            text: '🔗 돌봄 기록 읽어보기 · 검증됨' }) : null,
        ])),
        s.diary.length > 2 ? el('div', { class: 'sub', text: `외 ${s.diary.length - 2}권` }) : null,
      ]) : null,

      // 「본인이 올림 · 이 서비스가 확인하지 않음」 — 확인된 것과 섞지 않는다 (§2-3)
      (s.imported || []).length ? card([
        el('div', { class: 'h', text: '다른 곳에서 받은 후기' }),
        ...s.imported.map(v => el('div', { class: 'imp' }, [
          el('div', { class: 'top' }, [
            el('span', { class: 'src', text: v.source || '출처 미기재' }),
            v.review_date ? el('span', { class: 'date', text: v.review_date }) : null,
          ]),
          v.text ? el('div', { class: 'q', text: '“' + v.text + '”' }) : null,
          // 리뷰에 붙어 있던 사진은 그대로 보이고, 원본 캡처는 눌러서 따로 본다
          v.attach_url ? el('img', { class: 'capture', src: v.attach_url, alt: '첨부 사진',
            onclick: () => openLightbox(v.attach_url) }) : null,
          v.capture_url ? el('button', { class: 'seecap', text: '첨부 인증 보기',
            onclick: () => openLightbox(v.capture_url) }) : null,
        ])),
      ]) : null,
    ],
    hint: '숫자는 이 시터의 모든 돌봄을 합친 것입니다.',
  };
}
