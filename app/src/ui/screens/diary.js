import { el, card, flash } from '../el.js';
import * as api from '../../data/care.js';

const day = ts => new Date(ts).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

/* 후기 쓰기 — 계약이 끝날 때 아이마다 한 편 */
export function diaryWriteScreen(c, ui, sitterId, go, reload, rerender) {
  const written = ui.written || [];
  const left = c.pets.filter(p => !written.includes(p.id));
  const cur = ui.writeFor && left.some(p => p.id === ui.writeFor) ? ui.writeFor : left[0]?.id;
  const pet = c.pets.find(p => p.id === cur);
  const d = ui.entry = ui.entry || {};

  if (!pet) return {
    title: '후기 작성',
    back: () => go('care'),
    body: [card([
      el('div', { class: 'h', text: '후기를 모두 남기셨어요' }),
      el('div', { class: 'sub', text: '남긴 후기는 아이마다 한 권씩 쌓입니다. 프로필에서 보호자가 볼 수 있어요.' }),
      el('button', { class: 'add', text: '돌봄 일기 보기', onclick: () => go('books') }),
    ])],
  };

  return {
    title: `${pet.name} 후기 쓰기`,
    back: () => go('care'),
    body: [
      left.length > 1 ? el('div', { class: 'pettabs' }, left.map(p =>
        el('button', { class: 'ptab', 'aria-pressed': cur === p.id, text: p.name,
          onclick: () => { ui.writeFor = p.id; rerender(); } }))) : null,

      card([
        el('div', { class: 'h', text: `${pet.name}와의 ${nights(c)}` }),
        el('div', { class: 'sub', text: '이 돌봄 전체를 마치고 한 편만 씁니다. 매일 쓰지 않아요. 어떤 마음으로 돌봤는지 남겨주세요 — 보호자와 다음 보호자가 이 글을 봅니다.' }),
        el('textarea', { name: 'entry_text', style: 'min-height:180px',
          placeholder: '예) 사흘을 함께했습니다. 첫날엔 방석에서 나오지도 않던 아이가…',
          value: d[cur] || '', oninput: e => { d[cur] = e.target.value; rerender(); } }),
      ]),

      card([
        el('span', { class: 'unver', text: 'ⓘ 시터 본인이 씀' }),
        el('div', { class: 'sub', text: '후기는 이 서비스가 확인한 기록이 아닙니다. 확인된 것(사진·시각)과 섞이지 않게 그렇게 표시됩니다.' }),
      ]),
    ],
    foot: [el('button', { class: 'cta', disabled: !(d[cur] || '').trim(),
      text: (d[cur] || '').trim() ? `${pet.name} 후기 남기기` : '내용을 적어주세요',
      onclick: async () => {
        try {
          await api.writeEntry(sitterId, cur, c.id, d[cur].trim());
          d[cur] = ''; ui.writeFor = null;
          ui.written = await api.writtenPets(sitterId, c.id);
          flash('후기를 남겼어요', '프로필의 돌봄 일기에 쌓입니다.');
          await reload(); rerender();
        } catch (e) { flash('저장 실패', e.message); }
      } })],
    hint: '아이당 한 권 · 이 돌봄에서 한 편입니다.',
  };
}

const nights = c => {
  const n = Math.round((Date.parse(`${c.end_date}T00:00:00Z`) - Date.parse(`${c.start_date}T00:00:00Z`)) / 86400000);
  return n > 0 ? `${n}박 ${n + 1}일` : '하루';
};

/* 일기장 — 아이마다 한 권 */
export function booksScreen(books, go) {
  return {
    title: '돌봄 일기',
    back: () => go('profile'),
    body: [
      card([
        el('div', { class: 'h', text: `일기장 ${books.length}권` }),
        el('div', { class: 'sub', text: '돌본 아이마다 한 권씩입니다. 돌봄이 끝날 때마다 후기가 한 편씩 쌓여요.' }),
      ]),
      ...books.map(bk => card([
        el('span', { class: 'unver', text: 'ⓘ 시터 본인이 씀' }),
        el('div', { class: 'h', text: `${bk.pets?.name || '아이'}의 돌봄 일기 · 후기 ${(bk.diary_entries || []).length}편` }),
        ...(bk.diary_entries || [])
          .slice().sort((a, b) => new Date(b.written_at) - new Date(a.written_at))
          .map(en => el('div', { class: 'imp' }, [
            el('div', { class: 'top' }, [
              el('span', { class: 'src', text: '후기' }),
              el('span', { class: 'date', text: day(en.written_at) }),
            ]),
            el('div', { class: 'q', text: '“' + en.text + '”' }),
          ])),
        (bk.diary_entries || []).length ? null : el('div', { class: 'sub', text: '아직 후기가 없어요.' }),
      ])),
      books.length ? null : card([
        el('div', { class: 'h', text: '아직 일기장이 없어요' }),
        el('div', { class: 'sub', text: '돌봄을 마치고 후기를 남기면 아이 이름으로 한 권이 만들어집니다.' }),
      ]),
    ],
    hint: '보호자와 공개 프로필에서 이 글이 보입니다.',
  };
}
