import { el, card, field, flash } from '../el.js';
import { createContract, listClients } from '../../data/contracts.js';

const today = () => new Date().toISOString().slice(0, 10);
const plus = d => { const t = new Date(); t.setDate(t.getDate() + d); return t.toISOString().slice(0, 10); };

const HO_START = { owner: '보호자가 데려다줘요', sitter: '펫시터가 데리러 와요' };
const HO_END = { owner: '보호자가 데리러 와요', sitter: '펫시터가 데려다줘요' };

export function newContractScreen(ctx, go, rerender) {
  const f = ctx.form = ctx.form || {
    nickname: '', ownerId: null, petIds: null,
    pets: [{ name: '', age: '', extra: '' }],
    start: today(), end: plus(2),
    startTime: '14:00', startBy: 'owner', endTime: '18:00', endBy: 'owner',
  };
  const cta = el('button', { class: 'cta' });
  const ready = () => !!f.ownerId || f.pets.some(p => (p.name || '').trim());
  const sync = () => { cta.disabled = !ready() || !!ctx.busy;
    cta.textContent = ctx.busy ? '만드는 중…' : ready() ? '초대 링크 만들기' : '아이 이름을 적어주세요'; };
  const txt = (obj, label, key, ph, nameKey) => field(label, {
    type: 'text', placeholder: ph, value: obj[key] || '', name: nameKey || `owner_${key}`,
    oninput: e => { obj[key] = e.target.value; sync(); },
  });
  const date = (label, key) => field(label, {
    type: 'date', value: f[key],
    onchange: e => { if (e.target.value) { f[key] = e.target.value; } },
  });
  const chips = (cur, map, onPick) => el('div', { class: 'chips' },
    Object.entries(map).map(([v, t]) => el('button', {
      class: 'chip', 'aria-pressed': cur === v, text: t,
      onclick: () => { onPick(v); rerender(); },
    })));

  const body = [];

  if ((ctx.clients || []).length) body.push(card([
    el('div', { class: 'h', text: '다시 맡기는 고객인가요?' }),
    el('div', { class: 'sub', text: '전에 저장한 아이 정보를 그대로 씁니다. 다시 입력하지 않아도 돼요.' }),
    el('div', { class: 'chips' }, [
      el('button', {
        class: 'chip', 'aria-pressed': !f.ownerId, text: '새 고객',
        onclick: () => { f.ownerId = null; f.petIds = null; rerender(); },
      }),
      ...ctx.clients.map(c => el('button', {
        class: 'chip', 'aria-pressed': f.ownerId === c.id,
        text: `${c.nickname} · ${(c.pets || []).map(p => p.name).join('·') || '아이 없음'}`,
        onclick: () => {
          f.ownerId = c.id; f.nickname = c.nickname;
          f.petIds = (c.pets || []).map(p => p.id);
          flash(`${c.nickname} 정보를 불러왔어요`);
          rerender();
        },
      })),
    ]),
  ]));

  if (!f.ownerId) {
    body.push(card([
      el('div', { class: 'h', text: '보호자' }),
      txt(f, '호칭', 'nickname', '예) 콩이 보호자님'),
    ]));
    body.push(card([
      el('div', { class: 'headrow' }, [
        el('div', {}, [
          el('div', { class: 'h', text: '돌보는 아이' }),
          el('div', { class: 'sub', text: '이름만 있어도 됩니다. 보호자가 확인하며 고칠 수 있어요.' }),
        ]),
        el('button', { class: 'addmini', 'aria-label': '아이 추가',
          onclick: () => { f.pets.push({ name: '', age: '', extra: '' }); rerender(); }, text: '＋' }),
      ]),
      ...f.pets.map((p, i) => el('div', { class: 'petbox' }, [
        el('div', { class: 'notehead' }, [
          el('span', { class: 'notechip', text: (p.name || '').trim() || `아이 ${i + 1}` }),
          f.pets.length > 1 ? el('button', { class: 'linkbtn', text: '삭제',
            onclick: () => { f.pets.splice(i, 1); rerender(); } }) : null,
        ]),
        txt(p, '이름', 'name', '예) 콩이', `pet${i}_name`),
        txt(p, '나이', 'age', '예) 4살', `pet${i}_age`),
        txt(p, '추가 정보', 'extra', '예) 3.2kg · 크림색 · 말티즈', `pet${i}_extra`),
      ])),
    ]));
  } else {
    const c = ctx.clients.find(x => x.id === f.ownerId);
    body.push(card([
      el('div', { class: 'h', text: c ? c.nickname : '고객' }),
      el('div', { class: 'sub', text: (c?.pets || []).map(p => [p.name, p.age, p.extra].filter(Boolean).join(' · ')).join('\n') || '아이 정보 없음' }),
    ]));
  }

  body.push(card([
    el('div', { class: 'h', text: '돌봄 기간' }),
    el('div', { class: 'hgrid' }, [date('시작일', 'start'), date('종료일', 'end')]),
  ]));

  body.push(card([
    el('div', { class: 'h', text: '픽·드롭 약속' }),
    el('div', { class: 'hogrp' }, [
      el('label', { text: '맡기는 날 (돌봄 시작)' }),
      field('', { type: 'time', value: f.startTime, onchange: e => { f.startTime = e.target.value || f.startTime; } }),
      chips(f.startBy, HO_START, v => { f.startBy = v; }),
    ]),
    el('div', { class: 'hogrp' }, [
      el('label', { text: '돌아오는 날 (돌봄 종료)' }),
      field('', { type: 'time', value: f.endTime, onchange: e => { f.endTime = e.target.value || f.endTime; } }),
      chips(f.endBy, HO_END, v => { f.endBy = v; }),
    ]),
    (f.startBy === 'owner' || f.endBy === 'owner') ? el('div', { class: 'sub',
      text: `보호자가 오실 때 만날 곳: ${ctx.sitter.addr || '프로필에 기본 약속 장소를 등록해주세요'}` }) : null,
  ]));

  body.push(card([
    el('div', { class: 'h', text: '보내면 이렇게 됩니다' }),
    el('div', { class: 'sub', text: '보호자는 링크를 열어 이 정보를 확인하고(수정 가능), 돌봄 일정과 특이사항만 입력합니다. 회원가입은 필요 없어요.' }),
  ]));

  return {
    title: '돌봄 준비하기',
    back: () => go('home'),
    body,
    foot: [(sync(), cta.addEventListener('click', async () => {
      if (!ready() || ctx.busy) return;
      ctx.busy = true; sync();
      try {
        const c = await createContract(ctx.sitter.id, {
          ...f, nickname: (f.nickname || '').trim() || `${f.pets.map(p => p.name).filter(Boolean).join('·')} 보호자`,
        });
        ctx.busy = false; ctx.form = null; ctx.lastToken = c.invite_token;
        flash('초대 링크가 만들어졌어요', '보호자에게 링크를 보내세요.');
        go('home');
      } catch (e) { ctx.busy = false; sync(); flash('저장 실패', e.message); }
    }), cta)],
    hint: '이 정보는 내 계정에 저장됩니다. 보호자는 가입하지 않아도 됩니다.',
  };
}
