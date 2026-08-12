import { el, card, flash, openLightbox } from '../el.js';
import * as api from '../../data/care.js';
import { finishCare, replyDispute, noReply } from '../../data/care.js';

import { KINDS, kindName, outMinutes } from '../../lib/kinds.js';
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
    n.kind === kind && (!multi || !n.pet_id || n.pet_id === cur));

  /* 시트 — 항목 기록 / 먼저 챙긴 순간 */
  let overlay = null;
  const openItem = c.items.find(i => i.id === ui.proofFor);
  if (openItem) {
    const d = ui.proofDraft = ui.proofDraft || {
      photos: [], text: openItem.proof?.text || '', busy: false,
    };
    const K = KINDS[openItem.kind] || {};
    const pair = !!K.pair;
    const refs = notesFor(openItem.kind);
    const shots = d.photos.length ? d.photos
      : (openItem.proof
          ? [[openItem.proof.photo_url, openItem.proof.shot_at], [openItem.proof.photo2_url, openItem.proof.shot2_at]]
              .filter(([u]) => u).map(([u, a]) => ({ url: u, at: a, stamp: openItem.proof.stamp_text }))
          : []);

    const close = () => { ui.proofFor = null; ui.proofDraft = null; rerender(); };

    overlay = el('div', { class: 'sheetback', onclick: e => { if (e.target.classList.contains('sheetback') && !d.busy) close(); } }, [
      el('div', { class: 'sheet' }, [
        el('div', { class: 'grip' }),
        el('div', { class: 'h', text: `${kindName(openItem.kind)} 기록하기` }),
        el('div', { class: 'sub', text: openItem.fuzz_min === -1 ? '아무때나' : `${hm(openItem.at_time)} ${FUZZTX(openItem.fuzz_min)}` }),
        el('div', { class: 'shoot', text: `📷 ${(KINDS[openItem.kind] || {}).shoot || '한 장 남겨주세요'}` }),

        refs.length ? el('div', { class: 'a2box' }, [
          el('div', { class: 'qh', text: '보호자가 남긴 참고 사항' }),
          ...refs.map(n => el('div', { class: 'btx', text: n.text })),
        ]) : null,

        shots.length ? el('div', { class: 'shots' }, shots.map((sh, i) =>
          el('button', { class: 'shot', onclick: () => openLightbox(sh.url) }, [
            el('img', { src: sh.url, alt: '' }),
            pair ? el('span', { class: 'tag', text: i === 0 ? K.cap1 : K.cap2 }) : null,
            el('span', { class: 'shotstamp', text: sh.at ? clock(sh.at) : '' }),
          ]))) : null,

        (pair && shots.length === 2) ? el('div', { class: 'outmin',
          text: `🚶 밖에 있던 시간 ${outMinutes({ shot_at: shots[0].at, shot2_at: shots[1].at }) ?? 0}분` }) : null,

        shots.length < (pair ? 2 : 2) ? el('label', { class: 'shotadd' }, [
          el('span', { text: pair ? `＋ ${shots.length ? K.cap2 : K.cap1}` : (shots.length ? '＋ 사진 한 장 더' : '＋ 사진 찍기') }),
          el('input', { type: 'file', accept: 'image/*', capture: 'environment',
            onchange: async e => {
              const file = e.target.files && e.target.files[0];
              if (!file) return;
              d.busy = true; rerender();
              try {
                const shot = await api.uploadPhoto(c.id, openItem.id, d.photos.length + 1, file);
                d.photos = [...shots.map(x => ({ url: x.url, at: x.at, stamp: x.stamp })), shot];
              } catch (err) { flash('사진 업로드 실패', err.message); }
              d.busy = false; rerender();
            } }),
        ]) : null,

        el('textarea', { name: 'proof_text', placeholder: '사진을 못 찍었다면 설명만 남겨도 됩니다',
          value: d.text, oninput: e => { d.text = e.target.value; rerender(); } }),
        shots.length ? null : el('div', { class: 'sub', text: '사진 없이 설명만 보내도 1건으로 셉니다. 벌점은 없어요.' }),

        el('button', { class: 'cta', disabled: d.busy || (!shots.length && !d.text.trim()),
          text: d.busy ? '올리는 중…' : (openItem.proof ? '다시 제출' : (shots.length ? '제출' : '설명만 제출')),
          onclick: async () => {
            d.busy = true; rerender();
            try {
              const now = new Date().toISOString();
              await api.submitProof(openItem.id, {
                photo_url: shots[0]?.url || null, shot_at: shots[0]?.at || null,
                photo2_url: shots[1]?.url || null, shot2_at: shots[1]?.at || null,
                stamp_text: shots[0]?.stamp || stampOf(now),
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

  /* 먼저 챙긴 순간 시트 */
  if (ui.extraOpen) {
    const d = ui.extraDraft = ui.extraDraft || { photos: [], text: '', busy: false };
    const closeX = () => { ui.extraOpen = false; ui.extraDraft = null; rerender(); };
    const pick = (album) => el('label', { class: 'shotadd' }, [
      el('span', { text: album ? '🖼 앨범에서 선택' : '📷 지금 촬영' }),
      el('input', { type: 'file', accept: 'image/*', multiple: album ? 'multiple' : null,
        capture: album ? null : 'environment',
        onchange: async e => {
          const files = [...(e.target.files || [])];
          if (!files.length) return;
          d.busy = true; rerender();
          try {
            for (const f of files) d.photos.push(await api.uploadExtraPhoto(c.id, f, album));
          } catch (err) { flash('사진 업로드 실패', err.message); }
          d.busy = false; rerender();
        } }),
    ]);

    overlay = el('div', { class: 'sheetback',
      onclick: e => { if (e.target.classList.contains('sheetback') && !d.busy) closeX(); } }, [
      el('div', { class: 'sheet' }, [
        el('div', { class: 'grip' }),
        el('div', { class: 'h', text: '먼저 챙긴 순간' }),
        el('div', { class: 'sub', text: '일정에 없어도 보여주고 싶은 순간을 남겨주세요. 약속 기록과는 따로 쌓입니다.' }),
        d.photos.length ? el('div', { class: 'shots' }, d.photos.map((ph, i) =>
          el('div', { class: 'shot' }, [
            el('img', { src: ph.url, alt: '' }),
            el('span', { class: 'tag', text: ph.album ? '앨범' : '앱 촬영' }),
            el('button', { class: 'rm', text: '✕', 'aria-label': '삭제',
              onclick: () => { d.photos.splice(i, 1); rerender(); } }),
          ]))) : null,
        el('div', { class: 'hgrid' }, [pick(false), pick(true)]),
        el('textarea', { name: 'extra_text', placeholder: '예) 낮잠을 아주 편하게 자네요. 배 보이고 잡니다.',
          value: d.text, oninput: e => { d.text = e.target.value; } }),
        el('button', { class: 'cta', disabled: d.busy || (!d.photos.length && !d.text.trim()),
          text: d.busy ? '올리는 중…' : '이 순간 보내기',
          onclick: async () => {
            d.busy = true; rerender();
            try {
              await api.addExtra(c.id, d.text.trim(), d.photos);
              flash('전달되었어요', '보호자 화면에 바로 보입니다.');
              ui.extraOpen = false; ui.extraDraft = null;
              await reload();
            } catch (err) { d.busy = false; flash('전달 실패', err.message); rerender(); }
          } }),
        el('button', { class: 'linkbtn center', text: '닫기', onclick: () => { if (!d.busy) closeX(); } }),
      ]),
    ]);
  }

  if (ui.replyFor) {
    const it = c.items.find(i => i.proof && i.proof.dispute && i.proof.dispute.id === ui.replyFor);
    if (it) {
      const d = ui.replyDraft = ui.replyDraft || { text: '', busy: false };
      const closeR = () => { ui.replyFor = null; ui.replyDraft = null; rerender(); };
      overlay = el('div', { class: 'sheetback',
        onclick: e => { if (e.target.classList.contains('sheetback') && !d.busy) closeR(); } }, [
        el('div', { class: 'sheet' }, [
          el('div', { class: 'grip' }),
          el('div', { class: 'h', text: '소명하기' }),
          el('div', { class: 'dhead' }, [
            el('span', { class: 'dtag', text: '보호자 이의' }),
            el('span', { class: 'sub', text: it.proof.dispute.reason }),
          ]),
          el('div', { class: 'sub', text: '무슨 일이 있었는지 그대로 적어주세요. 보호자 화면에 이의와 나란히 남습니다. 소명한 뒤에는 보호자가 이의를 철회할 수 없습니다.' }),
          el('textarea', { name: 'reply_text', style: 'min-height:120px',
            placeholder: '예) 그 시간에 두 번 갔는데 두 번째에 다 먹었습니다.',
            value: d.text, oninput: e => { d.text = e.target.value; rerender(); } }),
          el('button', { class: 'cta', disabled: d.busy || !d.text.trim(),
            text: d.busy ? '보내는 중…' : '소명 보내기',
            onclick: async () => {
              d.busy = true; rerender();
              try {
                await replyDispute(it.proof.dispute.id, d.text.trim());
                ui.replyFor = null; ui.replyDraft = null;
                flash('소명을 보냈어요', '보호자 화면에 함께 표시됩니다.');
                await reload();
              } catch (e) { d.busy = false; flash('전송 실패', e.message); rerender(); }
            } }),
          el('button', { class: 'linkbtn center', text: '닫기', onclick: () => { if (!d.busy) closeR(); } }),
        ]),
      ]);
    }
  }

  return {
    title: '오늘의 돌봄',
    back: () => go('home'),
    right: { label: '돌봄 정보', on: () => go('contract', c.id) },
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

      (() => {
        const notes = c.notes.filter(n => !multi || !n.pet_id || n.pet_id === cur);
        return notes.length ? card([
          el('div', { class: 'tight' }, [
            el('div', { class: 'h', text: '보호자가 남긴 참고 사항' }),
            el('div', { class: 'notelist' }, notes.flatMap((n, i) => [
              el('span', { class: 'k' + (i ? ' sep' : ''), text: kindName(n.kind) }),
              el('span', { class: 'v' + (i ? ' sep' : ''), text: n.text }),
            ])),
          ]),
        ]) : null;
      })(),

      card([
        el('div', { class: 'h', text: '오늘 해야 할 것' }),
        el('div', { class: 'sub', text: '항목을 누르면 사진과 시각이 그대로 보호자에게 갑니다.' }),
        el('div', { class: 'rows' }, items.map(it => el('div', { class: 'listrow' }, [
          el('span', { class: 'tt', text: it.fuzz_min === -1 ? '아무때나' : hm(it.at_time) }),
          el('div', { class: 'lrmain' }, [
            el('div', { class: 'lrtitle' }, [
              el('span', { text: kindName(it.kind) }),
              it.proof ? el('span', { class: 'badge', text: '제출됨' }) : null,
            ]),
            el('div', { class: 'metacol' }, it.proof
              ? [`${clock(it.proof.submitted_at)} 기록`
                  + (it.proof.dispute ? ' · 이의' : it.proof.verdict?.matched ? ' · 확인됨' : ''),
                 [outMinutes(it.proof) !== null ? `밖에 있던 시간 ${outMinutes(it.proof)}분` : null,
                  !it.proof.photo_url ? '설명만' : null].filter(Boolean).join(' · '),
                ].filter(Boolean).map(t => el('span', { class: 'sub', text: t }))
              : [el('span', { class: 'sub', text: '아직 기록 없음' })]),
          ]),
          el('button', { class: 'ctasm', text: it.proof ? '다시 기록' : '기록하기',
            onclick: () => { ui.proofFor = it.id; ui.proofDraft = null; rerender(); } }),
        ]))),
        // 이의가 온 항목은 목록 아래에 따로 세워 놓친 것이 없게 한다
        ...items.filter(it => it.proof && it.proof.dispute).map(it => el('div', { class: 'dispute' }, [
          el('div', { class: 'dhead' }, [
            el('span', { class: 'dtag', text: '사실과 달라요' }),
            el('span', { class: 'sub', text: `${kindName(it.kind)} · ${it.proof.dispute.reason}` }),
          ]),
          it.proof.dispute.reply_at
            ? el('div', { class: 'dreply' }, [
                el('span', { class: 'dlab', text: '내가 보낸 소명' }),
                el('span', { class: 'ptext', text: it.proof.dispute.reply_text || '' }),
              ])
            : el('div', { class: 'sub', text: noReply(it.proof.dispute)
                ? '72시간이 지났습니다 — 보호자 화면에 「소명 없음」으로 남습니다.'
                : '아직 소명하지 않았습니다.' }),
          !it.proof.dispute.reply_at ? el('button', { class: 'ctasm', text: '소명하기',
            onclick: () => { ui.replyFor = it.proof.dispute.id; ui.replyDraft = null; rerender(); } }) : null,
        ])),
        items.length ? null : el('div', { class: 'sub', text: '보호자가 아직 일정을 보내지 않았어요.' }),
      ]),

      card([
        el('div', { class: 'h', text: '먼저 챙긴 순간' }),
        el('div', { class: 'sub', text: '부탁받지 않았어도 보여주고 싶은 순간. 보호자의 리액션은 프로필에 쌓입니다.' }),
        (c.extras || []).length ? el('div', { class: 'rows' }, c.extras.map(x => el('div', { class: 'prow' }, [
          el('div', { class: 'phead' }, [
            el('span', { class: 'tltime', text: clock(x.at) }),
          ]),
          (x.extra_photos || []).length ? el('div', { class: 'shots' }, x.extra_photos.map(ph =>
            el('button', { class: 'shot', onclick: () => openLightbox(ph.url) }, [
              el('img', { src: ph.url, alt: '' }),
              el('span', { class: 'tag', text: ph.is_album ? '앨범' : '앱 촬영' }),
            ]))) : null,
          x.text ? el('div', { class: 'ptext', text: x.text }) : null,
          x.thanks_at
            ? el('span', { class: 'thxdone', text: `${REACT_EMOJI[x.thanks_reaction] || '💙'} 보호자가 「${x.thanks_reaction || '고마워요'}」를 보냈어요` })
            : el('button', { class: 'linkbtn', text: '지우기',
                onclick: async () => { await api.delExtra(x.id); await reload(); } }),
        ]))) : null,
        el('button', { class: 'add', text: '＋ 순간 남기기',
          onclick: () => { ui.extraOpen = true; ui.extraDraft = null; rerender(); } }),
      ]),

      // 전 항목이 기록돼야 마칠 수 있다 — 서버(guard_finish)도 같은 조건으로 막는다
      c.finished_at ? card([
        el('div', { class: 'h', text: '돌봄을 마쳤어요' }),
        el('div', { class: 'sub', text: '이 돌봄의 후기를 아이마다 한 편씩 남길 수 있습니다.' }),
        el('button', { class: 'cta', text: '후기 쓰기', onclick: () => go('diaryWrite') }),
      ]) : (done === c.items.length && c.items.length ? card([
        el('div', { class: 'h', text: '오늘 할 것을 다 기록했어요' }),
        el('div', { class: 'sub', text: '돌봄 기간이 끝났다면 마치기를 누르세요. 마치면 아이마다 후기를 한 편 남길 수 있어요.' }),
        el('button', { class: 'cta', text: '돌봄 마치기', onclick: async () => {
          try { await finishCare(c.id); flash('돌봄을 마쳤어요', '이제 후기를 남겨주세요.'); await reload(); go('diaryWrite'); }
          catch (e) { flash('마칠 수 없어요', e.message); }
        } }),
      ]) : null),
    ],
  };
}

const FUZZTX = f => ({ 0: '정각', 30: '~30분쯤', 60: '~1시간쯤', 120: '~2시간쯤' }[f] || '');
export const REACT_EMOJI = { '귀여워요': '😍', '안심돼요': '😌', '고마워요': '💙' };
