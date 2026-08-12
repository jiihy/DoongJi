import { el, card, openLightbox } from '../el.js';
import { KINDS, kindName, outMinutes } from '../../lib/kinds.js';

const dot = d => (d || '').replaceAll('-', '.');
const hm = t => (t || '').slice(0, 5);
const clock = ts => new Date(ts).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' });

// 읽기 전용이다 — 여기서는 아무것도 누를 수 없고, 있는 그대로만 보인다
export function recordScreen(r) {
  if (!r) return {
    title: '돌봄 기록',
    body: [card([
      el('div', { class: 'h', text: '열 수 없는 기록입니다' }),
      el('div', { class: 'sub', text: '보호자가 공개에 동의한 기록만 열립니다. 링크를 다시 확인해주세요.' }),
    ])],
  };

  const done = r.items.filter(i => i.submitted_at).length;
  const checked = r.items.filter(i => i.matched).length;

  return {
    title: '돌봄 기록',
    body: [
      card([
        el('div', { class: 'profhead' }, [
          el('div', { class: 'avatar' + (r.sitter.photo_url ? ' hasimg' : ''),
            style: r.sitter.photo_url ? `background-image:url(${r.sitter.photo_url})` : null }),
          el('div', { class: 'pcol' }, [
            el('div', { class: 'h', text: `${(r.pets || []).join(' · ')} · ${r.sitter.name} 시터` }),
            el('div', { class: 'sub', text: `${dot(r.start_date)} ~ ${dot(r.end_date)}` }),
          ]),
        ]),
        el('div', { class: 'kv' }, [
          el('span', { class: 'sub', text: '제출 · 확인' }),
          el('b', { text: `${done}건 · ${checked}건` }),
        ]),
        el('div', { class: 'sub', text: '보호자가 공개에 동의한 기록입니다. 사진과 시각은 시터가 올린 그대로이며, 이 화면에서는 아무것도 고칠 수 없습니다.' }),
      ]),

      r.diary ? card([
        el('div', { class: 'h', text: '시터 후기' }),
        el('div', { class: 'q', text: '“' + r.diary + '”' }),
      ]) : null,

      el('div', { class: 'sect', text: '활동 타임라인' }),
      ...r.items.map(it => {
        const shots = [[it.photo_url, it.shot_at], [it.photo2_url, it.shot2_at]].filter(([u]) => u);
        const out = outMinutes(it);
        return card([
          el('div', { class: 'tlhead' }, [
            el('span', { class: 'tltime', text: it.submitted_at ? clock(it.submitted_at)
              : (it.fuzz_min === -1 ? '아무때나' : hm(it.at_time)) }),
            el('span', { class: 'kchip' + (it.submitted_at ? ' on' : ''),
              text: kindName(it.kind) + (it.submitted_at ? ' 완료' : ' 예정')
                + (r.pets.length > 1 ? ` · ${it.pet}` : '') }),
            it.matched ? el('span', { class: 'badge', text: '보호자 확인' }) : null,
            Number(it.disputes) ? el('span', { class: 'dtag', text: '사실과 달라요' }) : null,
          ]),
          it.text ? el('div', { class: 'tltext', text: it.text }) : null,
          shots.length ? el('div', { class: 'shots' }, shots.map(([u, a]) =>
            el('button', { class: 'thumb', onclick: () => openLightbox(u) }, [
              el('img', { src: u, alt: '' }),
              a ? el('span', { class: 'shotstamp', text: clock(a) }) : null,
            ]))) : null,
          el('div', { class: 'tlmeta', text: !it.submitted_at ? '기록 없음'
            : [out !== null ? `밖에 있던 시간 ${out}분` : null,
               !it.photo_url ? '사진 없이 설명만' : null,
               it.resubmit_count ? `${it.resubmit_count}회 다시 제출` : null,
               Number(it.disputes) ? (Number(it.replied) ? '이의 · 소명 있음' : '이의 · 소명 없음') : null,
              ].filter(Boolean).join(' · ') || '앱 카메라 · 시각 새김' }),
        ]);
      }),

      (r.extras || []).length ? el('div', { class: 'sect', text: '먼저 챙긴 순간' }) : null,
      ...(r.extras || []).map(x => card([
        el('div', { class: 'phead' }, [
          el('span', { class: 'tk', text: '먼저 챙긴 순간' }),
          el('span', { class: 'sub', text: clock(x.at) }),
        ]),
        (x.photos || []).length ? el('div', { class: 'shots' }, x.photos.map(ph =>
          el('button', { class: 'thumb', onclick: () => openLightbox(ph.url) }, [
            el('img', { src: ph.url, alt: '' }),
            el('span', { class: 'tag', text: ph.is_album ? '앨범' : '앱 촬영' }),
          ]))) : null,
        x.text ? el('div', { class: 'ptext', text: x.text }) : null,
        x.thanks_reaction ? el('span', { class: 'thxdone', text: `보호자 「${x.thanks_reaction}」` }) : null,
      ])),
    ],
    hint: '읽기 전용 · 보호자 동의로 공개된 기록입니다.',
  };
}
