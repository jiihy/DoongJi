import { el, card, field, flash, copyText, swipeRow } from '../el.js';
import { KINDS } from '../../lib/kinds.js';
import { savePet, saveContract, addItem, saveItem, delItem } from '../../data/owner.js';
import { inviteUrlOf } from '../../data/contracts.js';
import { delNote } from '../../data/owner.js';
import { careNoteSheet } from './owner.js';
import { kindName } from '../../lib/kinds.js';

const FUZZ = { 0: '정각', 30: '~30분쯤', 60: '~1시간쯤', 120: '~2시간쯤', '-1': '아무때나' };
const HO_START = { owner: '보호자가 데려다줘요', sitter: '펫시터가 데리러 와요' };
const HO_END = { owner: '보호자가 데리러 와요', sitter: '펫시터가 데려다줘요' };
const hm = t => (t || '').slice(0, 5);

// 보내기 전에 미리 채운 것을 시터가 다시 열어 고칠 수 있어야 한다
export function sitterContractScreen(c, ui, go, reload, rerender) {
  const multi = c.pets.length > 1;
  const cur = ui.cTab && c.pets.some(p => p.id === ui.cTab) ? ui.cTab : c.pets[0]?.id;
  const items = c.items.filter(i => !multi || i.pet_id === cur);
  const url = inviteUrlOf(c.invite_token);

  const patchItem = (it, patch) => {
    Object.assign(it, patch); rerender();
    saveItem(it.id, patch).catch(e => flash('저장 실패', e.message));
  };

  return {
    title: '돌봄 정보',
    back: () => go('home'),
    overlay: petSheet(c, ui, reload, rerender) || careNoteSheet(c, ui, reload, rerender, cur),
    body: [
      el('div', { class: 'ding' }, [
        el('span', { class: 't', text: c.sent_at ? '보호자가 확인하고 일정을 보냈어요'
          : c.confirmed_at ? '보호자가 정보를 확인했어요' : '아직 보호자가 열어보기 전이에요' }),
        el('span', { class: 'd', text: c.sent_at
          ? '지금 고치면 보호자 화면에도 바로 바뀝니다. 큰 변경은 미리 알려주세요.'
          : '지금 고쳐도 됩니다. 보호자는 링크를 열어 확인만 하면 돼요.' }),
      ]),

      card([
        el('div', { class: 'h', text: '보호자 링크' }),
        el('input', { class: 'linkinput', name: 'clink', readonly: 'readonly', value: url,
          onclick: e => e.target.select() }),
        el('button', { class: 'ctasm', text: '링크 복사', onclick: async () => {
          flash(await copyText(url) ? '복사했어요' : '길게 눌러 복사해주세요');
        } }),
      ]),

      card([
        el('div', { class: 'h', text: '돌보는 아이' }),
        el('div', { class: 'kvlist' }, c.pets.map((pt, i) =>
          el('button', { class: 'kvrow', onclick: () => { ui.petIdx = i; ui.petDraft = null; rerender(); } }, [
            el('div', { class: 'lrmain' }, [
              el('div', { class: 'lrtitle' }, [el('span', { text: pt.name })]),
              el('div', { class: 'sub', text: [pt.age, pt.extra].filter(Boolean).join(' · ') || '정보 없음' }),
            ]),
            el('span', { class: 'kvval', text: '수정' }),
            el('span', { class: 'chev', text: '›' }),
          ]))),
      ]),

      card([
        el('div', { class: 'h', text: '돌봄 기간' }),
        el('div', { class: 'hgrid' }, [
          field('시작일', { name: 'c_start', type: 'date', value: c.start_date || '',
            onchange: async e => { if (!e.target.value) return; c.start_date = e.target.value;
              await saveContract(c.id, { start_date: e.target.value }); flash('바꿨어요'); } }),
          field('종료일', { name: 'c_end', type: 'date', value: c.end_date || '',
            onchange: async e => { if (!e.target.value) return; c.end_date = e.target.value;
              await saveContract(c.id, { end_date: e.target.value }); flash('바꿨어요'); } }),
        ]),
      ]),

      card([
        el('div', { class: 'h', text: '픽·드롭 약속' }),
        el('div', { class: 'hogrp' }, [
          el('label', { text: '맡기는 날' }),
          field('', { name: 'c_hs', type: 'time', value: hm(c.handoff_start_time),
            onchange: async e => { c.handoff_start_time = e.target.value;
              await saveContract(c.id, { handoff_start_time: e.target.value }); } }),
          el('div', { class: 'chips' }, Object.entries(HO_START).map(([v, t]) =>
            el('button', { class: 'chip', 'aria-pressed': c.handoff_start_by === v, text: t,
              onclick: async () => { c.handoff_start_by = v; rerender();
                await saveContract(c.id, { handoff_start_by: v }); } }))),
        ]),
        el('div', { class: 'hogrp' }, [
          el('label', { text: '돌아오는 날' }),
          field('', { name: 'c_he', type: 'time', value: hm(c.handoff_end_time),
            onchange: async e => { c.handoff_end_time = e.target.value;
              await saveContract(c.id, { handoff_end_time: e.target.value }); } }),
          el('div', { class: 'chips' }, Object.entries(HO_END).map(([v, t]) =>
            el('button', { class: 'chip', 'aria-pressed': c.handoff_end_by === v, text: t,
              onclick: async () => { c.handoff_end_by = v; rerender();
                await saveContract(c.id, { handoff_end_by: v }); } }))),
        ]),
      ]),

      multi ? el('div', { class: 'pettabs' }, c.pets.map(p =>
        el('button', { class: 'ptab', 'aria-pressed': cur === p.id, text: p.name,
          onclick: () => { ui.cTab = p.id; rerender(); } }))) : null,

      card([
        el('div', { class: 'headrow' }, [
          el('div', {}, [
            el('div', { class: 'h', text: '돌봄 일정' }),
            el('div', { class: 'sub', text: c.sent_at ? '보호자가 정한 일정입니다. 고치면 보호자 화면에도 바뀝니다.'
              : '보호자가 확인하며 고칠 수 있어요.' }),
          ]),
          el('button', { class: 'addmini', text: '＋', 'aria-label': '항목 추가', onclick: async () => {
            const { data, error } = await addItem(c.id, cur, { kind: 'meal', at_time: '12:00', fuzz_min: 60, sort_key: c.items.length });
            if (error) { flash('추가 실패', error.message); return; }
            c.items.push(data); rerender();
          } }),
        ]),
        ...items.map(it => el('div', { class: 'srow' }, [
          el('select', { name: `ck_${it.id}`, onchange: e => {
            const kind = e.target.value;
            patchItem(it, kind === 'med' ? { kind, fuzz_min: 0 } : { kind });
          } }, Object.entries(KINDS).map(([k, t]) =>
            el('option', { value: k, selected: it.kind === k, text: t.name }))),
          it.fuzz_min === -1 ? null : el('input', { name: `ct_${it.id}`, type: 'time', value: hm(it.at_time),
            onchange: e => patchItem(it, { at_time: e.target.value }) }),
          el('select', { name: `cf_${it.id}`, 'aria-label': '시간 범위',
            onchange: e => patchItem(it, { fuzz_min: Number(e.target.value) }) },
            Object.entries(FUZZ).map(([v, t]) =>
              el('option', { value: v, selected: String(it.fuzz_min) === v, text: t }))),
          el('button', { class: 'del', text: '✕', 'aria-label': '삭제', onclick: () => {
            if (it.proof) { flash('인증이 있는 항목은 지울 수 없어요', '지우면 사진도 함께 사라집니다.'); return; }
            c.items.splice(c.items.indexOf(it), 1); rerender();
            delItem(it.id).catch(e => flash('삭제 실패', e.message));
          } }),
        ])),
        items.length ? null : el('div', { class: 'sub', text: '＋ 를 눌러 항목을 넣어두면 보호자가 확인만 하면 됩니다.' }),
      ]),

      card([
        el('div', { class: 'h', text: '특이사항' }),
        el('div', { class: 'sub', text: '원래는 보호자가 적는 칸입니다. 통화로 들었다면 여기에 대신 적어두세요 — 보호자도 자기 화면에서 고칠 수 있습니다.' }),
        c.notes.length ? el('div', { class: 'swlist' }, c.notes
          .filter(n => !multi || !n.pet_id || n.pet_id === cur)
          .map(n => swipeRow([
            el('span', { class: 'k', text: kindName(n.kind) }),
            el('span', { class: 'v', text: n.text }),
          ], {
            onEdit: () => { ui.cnEdit = n; ui.cnDraft = null; rerender(); },
            onDelete: async () => {
              c.notes.splice(c.notes.indexOf(n), 1); rerender();
              try { await delNote(n.id); } catch (e) { flash('삭제 실패', e.message); await reload(); }
            },
          }))) : el('div', { class: 'sub', text: '아직 없습니다.' }),
        el('button', { class: 'add', text: '＋ 특이사항 추가',
          onclick: () => { ui.cnOpen = true; ui.cnDraft = null; rerender(); } }),
      ]),
    ],
  };
}

function petSheet(c, ui, reload, rerender) {
  if (ui.petIdx === undefined || ui.petIdx === null || !c.pets[ui.petIdx]) return null;
  const pt = ui.petDraft || (ui.petDraft = { ...c.pets[ui.petIdx] });
  const close = () => { ui.petIdx = null; ui.petDraft = null; rerender(); };
  return el('div', { class: 'sheetback',
    onclick: e => { if (e.target.classList.contains('sheetback')) close(); } }, [
    el('div', { class: 'sheet' }, [
      el('div', { class: 'grip' }),
      el('div', { class: 'h', text: `${c.pets[ui.petIdx].name} 정보 수정` }),
      field('이름', { name: 'sp_name', value: pt.name || '', oninput: e => { pt.name = e.target.value; } }),
      field('나이', { name: 'sp_age', value: pt.age || '', oninput: e => { pt.age = e.target.value; } }),
      field('추가 정보', { name: 'sp_extra', value: pt.extra || '', oninput: e => { pt.extra = e.target.value; } }),
      el('button', { class: 'cta', text: '완료', onclick: async () => {
        await savePet(pt.id, { name: pt.name, age: pt.age, extra: pt.extra });
        ui.petIdx = null; ui.petDraft = null; flash('수정했어요'); reload();
      } }),
    ]),
  ]);
}
