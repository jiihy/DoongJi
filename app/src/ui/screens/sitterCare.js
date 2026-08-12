import { el, card, flash } from '../el.js';
import * as api from '../../data/care.js';

const KINDS = { meal: '밥', walk: '산책', poop: '배변', med: '약', play: '놀이', sleep: '취침' };
const hm = t => (t || '').slice(0, 5);
const dot = d => (d || '').replaceAll('-', '.');
const clock = ts => new Date(ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
const stampOf = at => `${dot(new Date(at).toISOString().slice(0, 10))} ${clock(at)}`;

export function sitterCareScreen(c, ui, go, reload, rerender) {
  const multi = c.pets.length > 1;
  const cur = ui.petTab && c.pets.some(p => p.id === ui.petTab) ? ui.petTab : c.pets[0]?.id;
  const items = c.items.filter(i => !multi || i.pet_id === cur);
  const done = c.items.filter(i => i.proof).length;

  const notesFor = kind => c.notes.filter(n =>
    (n.kind === 'all' || n.kind === kind) && (!multi || !n.pet_id || n.pet_id === cur));

  /* 기록 시트 */
  let overlay = null;
  const openItem = c.items.find(i => i.id === ui.proofFor);
  if (openItem) {
    const d = ui.proofDraft = ui.proofDraft || {
      photos: [], text: openItem.proof?.text || '', busy: false,
    };
    const refs = notesFor(openItem.kind);
    const shots = d.photos.length ? d.photos
      : (openItem.proof ? [openItem.proof.photo_url, openItem.proof.photo2_url].filter(Boolean).map(u => ({ url: u, at: openItem.proof.shot_at })) : []);

    const close = () => { ui.proofFor = null; ui.proofDraft = null; rerender(); };

    overlay = el('div', { class: 'sheetback', onclick: e => { if (e.target.classList.contains('sheetback') && !d.busy) close(); } }, [
      el('div', { class: 'sheet' }, [
        el('div', { class: 'grip' }),
        el('div', { class: 'h', text: `${KINDS[openItem.kind]} 기록하기` }),
        el('div', { class: 'sub', text: openItem.fuzz_min === -1 ? '아무때나' : `${hm(openItem.at_time)} ${FUZZTX(openItem.fuzz_min)}` }),

        refs.length ? el('div', { class: 'a2box' }, [
          el('div', { class: 'qh', text: '보호자가 남긴 참고 사항' }),
          ...refs.map(n => el('div', { class: 'btx', text: n.text })),
        ]) : null,

        shots.length ? el('div', { class: 'shots' }, shots.map(s =>
          el('div', { class: 'shot' }, [
            el('img', { src: s.url, alt: '' }),
            el('span', { class: 'shotstamp', text: s.at ? clock(s.at) : '' }),
          ]))) : null,

        shots.length < 2 ? el('label', { class: 'shotadd' }, [
          el('span', { text: shots.length ? '＋ 사진 한 장 더' : '＋ 사진 찍기 · 고르기' }),
          el('input', { type: 'file', accept: 'image/*', capture: 'environment',
            onchange: async e => {
              const file = e.target.files && e.target.files[0];
              if (!file) return;
              d.busy = true; rerender();
              try {
                const url = await api.uploadPhoto(c.id, openItem.id, d.photos.length + 1, file);
                d.photos = [...shots.map(s => ({ url: s.url, at: s.at })), { url, at: new Date().toISOString() }];
              } catch (err) { flash('사진 업로드 실패', err.message); }
              d.busy = false; rerender();
            } }),
        ]) : null,

        el('textarea', { name: 'proof_text', placeholder: '한 줄 남겨도 좋아요 (선택)',
          value: d.text, oninput: e => { d.text = e.target.value; } }),

        el('button', { class: 'cta', disabled: d.busy || !shots.length,
          text: d.busy ? '올리는 중…' : (openItem.proof ? '다시 제출' : '제출'),
          onclick: async () => {
            d.busy = true; rerender();
            try {
              const now = new Date().toISOString();
              await api.submitProof(openItem.id, {
                photo_url: shots[0]?.url || null, shot_at: shots[0]?.at || now,
                photo2_url: shots[1]?.url || null, shot2_at: shots[1]?.at || null,
                stamp_text: stampOf(shots[0]?.at || now),
                text: d.text.trim() || null,
                is_late: api.lateOf(openItem),
                submitted_at: now,
              });
              flash('보호자에게 전달됐어요');
              ui.proofFor = null; ui.proofDraft = null;
              await reload();
            } catch (err) { d.busy = false; flash('제출 실패', err.message); rerender(); }
          } }),
        el('button', { class: 'linkbtn center', text: '닫기', onclick: () => { if (!d.busy) close(); } }),
      ]),
    ]);
  }

  return {
    title: '오늘의 돌봄',
    back: () => go('home'),
    overlay,
    body: [
      card([
        el('div', { class: 'profhead' }, [
          el('div', { class: 'pcol' }, [
            el('div', { class: 'h', text: c.pets.map(p => p.name).join(' · ') }),
            el('div', { class: 'sub', text: `${(c.owners || {}).nickname} · ${dot(c.start_date)} ~ ${dot(c.end_date)}` }),
          ]),
          el('span', { class: 'badge', text: `${done}/${c.items.length}` }),
        ]),
      ]),

      multi ? el('div', { class: 'pettabs' }, c.pets.map(p =>
        el('button', { class: 'ptab', 'aria-pressed': cur === p.id, text: p.name,
          onclick: () => { ui.petTab = p.id; rerender(); } }))) : null,

      card([
        el('div', { class: 'h', text: '오늘 해야 할 것' }),
        el('div', { class: 'sub', text: '항목을 누르면 사진과 시각이 그대로 보호자에게 갑니다.' }),
        el('div', { class: 'rows' }, items.map(it => el('div', { class: 'listrow' }, [
          el('span', { class: 'tt', text: it.fuzz_min === -1 ? '아무때나' : hm(it.at_time) }),
          el('div', { class: 'lrmain' }, [
            el('div', { class: 'lrtitle' }, [
              el('span', { text: KINDS[it.kind] }),
              it.proof ? el('span', { class: 'badge', text: '제출됨' }) : null,
            ]),
            el('div', { class: 'sub', text: it.proof ? `${clock(it.proof.submitted_at)} 기록` : '아직 기록 없음' }),
          ]),
          el('button', { class: 'ctasm', text: it.proof ? '다시' : '기록하기',
            onclick: () => { ui.proofFor = it.id; ui.proofDraft = null; rerender(); } }),
        ]))),
        items.length ? null : el('div', { class: 'sub', text: '보호자가 아직 일정을 보내지 않았어요.' }),
      ]),
    ],
    hint: '사진을 올린 시각이 그대로 남습니다. 늦어도 벌점은 없어요.',
  };
}

const FUZZTX = f => ({ 0: '정각', 30: '~30분쯤', 60: '~1시간쯤', 120: '~2시간쯤' }[f] || '');
