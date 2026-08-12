import { el, card, field, flash } from '../el.js';
import * as api from '../../data/owner.js';
import { copyText, openLightbox } from '../el.js';
import { enablePush } from '../../lib/push.js';
import { shareOrigin } from '../../lib/supabase.js';
import { thankExtra, setVerdict, withdrawVerdict, openDispute, withdrawDispute, REASONS, noReply } from '../../data/care.js';

import { KINDS, kindName, outMinutes } from '../../lib/kinds.js';
const FUZZ = { 0: '정각', 30: '~30분쯤', 60: '~1시간쯤', 120: '~2시간쯤', '-1': '아무때나' };
const HO_START = { owner: '보호자가 데려다줘요', sitter: '펫시터가 데리러 와요' };
const HO_END = { owner: '보호자가 데리러 와요', sitter: '펫시터가 데려다줘요' };
const dot = d => (d || '').replaceAll('-', '.');
const hm = t => (t || '').slice(0, 5);
const mapUrl = q => 'https://map.naver.com/p/search/' + encodeURIComponent(q);
// 날짜 문자열만 다루므로 UTC로 고정해 시간대에 따라 하루가 밀리지 않게 한다
const nightsOf = (a, b) => {
  if (!a || !b) return null;
  const d = (Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000;
  return Number.isFinite(d) ? Math.max(0, Math.round(d)) : null;
};
const spanLabel = (a, b) => {
  const n = nightsOf(a, b);
  if (n === null) return '기간';
  return n === 0 ? '1일' : `${n}박 ${n + 1}일`;
};
// 계정이 없으므로 앱 설치 안내를 봤는지는 이 기기에만 남긴다
const INSTALL_KEY = 'doongji.install.seen';
export const installSeen = () => localStorage.getItem(INSTALL_KEY) === '1';
export const markInstallSeen = () => localStorage.setItem(INSTALL_KEY, '1');

/* ── 1. 초대장 ── */
export function ownerWelcome(c, go) {
  const s = c.sitters || {};
  return {
    title: '초대장',
    body: [
      card([
        el('div', { class: 'profhead' }, [
          el('div', { class: 'avatar' + (s.photo_url ? ' hasimg' : ''), style: s.photo_url ? `background-image:url(${s.photo_url})` : null }),
          el('div', { class: 'pcol' }, [
            el('div', { class: 'h', text: `${s.name} 시터` }),
            el('div', { class: 'sub', text: [s.type, s.region].filter(Boolean).join(' · ') }),
          ]),
        ]),
        s.bio ? el('div', { class: 'sub', text: s.bio }) : null,
      ]),
      el('div', { class: 'lead', text: `${s.name} 시터가 아이 정보와 일정 조건을 미리 채워뒀어요. 맞는지 확인만 하시면, 돌봄이 어떻게 진행되는지 사진으로 그때그때 보실 수 있습니다.` }),
      el('div', { class: 'quiet' }, [
        el('div', { class: 'qh', text: '이 앱이 약속하는 것' }),
        el('div', { class: 'qrow' }, [el('span', { text: '일정대로 인증' }), el('span', { text: '항목마다 사진이 그 시각에' })]),
        el('div', { class: 'qrow' }, [el('span', { text: '조작 어렵게' }), el('span', { text: '앱 카메라 · 시각 새김' })]),
        el('div', { class: 'qrow' }, [el('span', { text: '기록은 내 것' }), el('span', { text: '동의 없이 비공개' })]),
      ]),
    ],
    foot: [el('button', { class: 'cta', text: '시작하기', onclick: () => go('confirm') })],
  };
}

/* ── 2. 앱처럼 쓰기 (홈 화면 추가 · 알림) ── */
export function ownerInstall(state, go, rerender) {
  // 홈 화면에 추가한 뒤에만 iOS가 푸시를 준다 — 안내 순서가 그래서 설치 먼저다
  if (state.step === undefined) state.step = 1;
  const bullet = (t) => el('div', { class: 'bul' }, [el('span', { class: 'bdot' }), el('span', { class: 'btx', text: t })]);
  const sheet = kids => el('div', { class: 'sheetback' }, [el('div', { class: 'sheet' }, kids)]);

  const step1 = () => sheet([
    el('div', { class: 'grip' }),
    el('div', { class: 'a2head' }, [
      el('div', { class: 'appicon' }, el('img', { class: 'appimg', src: '/app-icon-180.png?v=5', alt: '' })),
      el('div', { class: 'pcol' }, [
        el('div', { class: 'h', text: '홈 화면에 앱으로 추가' }),
        el('div', { class: 'sub', text: '설치하면 앱처럼 전체화면으로 열려요.' }),
      ]),
    ]),
    el('div', { class: 'warnbox' }, [
      el('span', { class: 'wt', text: '카톡·당근에서 열었다면 먼저 이걸 해주세요' }),
      el('span', { class: 'wd', text: '우측 하단 ⋯ 버튼 → 「Safari로 열기」(안드로이드는 「다른 브라우저로 열기」). 카톡·당근 안에서는 홈 화면에 추가할 수 없습니다.' }),
    ]),
    el('div', { class: 'a2box' }, [
      bullet('1. Safari 하단의 공유 버튼을 탭하세요'),
      bullet("2. '홈 화면에 추가'를 선택하세요"),
    ]),
    el('div', { class: 'hintdown' }, [
      el('span', { class: 'ht', text: '아래 공유 버튼을 눌러주세요' }),
      el('span', { class: 'har', text: '↓' }),
    ]),
    el('button', { class: 'linkbtn center', text: '나중에 할게요', onclick: () => { state.step = 2; rerender(); } }),
  ]);

  const step2 = () => sheet([
    el('div', { class: 'grip' }),
    el('div', { class: 'a2head' }, [
      el('div', { class: 'bellicon', text: '🔔' }),
      el('div', { class: 'pcol' }, [
        el('div', { class: 'h', text: '돌봄 알림 받기' }),
        el('div', { class: 'sub', text: '언제든 설정에서 끌 수 있어요.' }),
      ]),
    ]),
    el('div', { class: 'a2box' }, [
      bullet('인증 사진이 도착하면 바로 알려드려요'),
      bullet('시터의 소명이 오면 놓치지 않아요'),
      bullet('돌봄이 끝나면 하루 요약을 보내드려요'),
    ]),
    el('button', { class: 'cta', text: '알림 켜기', onclick: async () => {
      try {
        await enablePush({ audience: 'owner', contractId: state.contractId });
        flash('알림을 켰어요', '인증이 도착하면 바로 알려드려요.');
      } catch (e) { flash('알림을 켤 수 없어요', e.message); }
      go('home');
    } }),
    el('button', { class: 'linkbtn center', text: '나중에 할게요', onclick: () => go('home') }),
  ]);

  return {
    title: '앱처럼 쓰기',
    back: () => go('schedule'),
    right: { label: '건너뛰기', on: () => go('home') },
    overlay: state.step === 2 ? step2() : step1(),
    body: [card([
      el('div', { class: 'h', text: '이렇게 앱을 설치하면 확인이 더 편해요' }),
      el('div', { class: 'sub', text: '전달은 이미 끝났어요. 홈 화면에 추가하면 앱처럼 바로 열리고, 알림을 켜면 인증 사진이 도착할 때 그때그때 알 수 있습니다. 지금 넘겨도 나중에 설정할 수 있어요.' }),
      el('div', { class: 'stepdots' }, [
        el('span', { class: 'dot' + (state.step !== 2 ? ' on' : ''), text: '1' }),
        el('span', { class: 'dot' + (state.step === 2 ? ' on' : ''), text: '2' }),
      ]),
    ])],
  };
}

/* 아이 수정 시트 — 정보 확인·아이 프로필에서 함께 쓴다 */
function petEditSheet(c, ui, reload, rerender) {
  if (ui.petIdx === undefined || ui.petIdx === null || !c.pets[ui.petIdx]) return null;
  const pt = ui.petDraft || (ui.petDraft = { ...c.pets[ui.petIdx] });
  const close = () => { ui.petIdx = null; ui.petDraft = null; rerender(); };
  return el('div', { class: 'sheetback',
    onclick: e => { if (e.target.classList.contains('sheetback')) close(); } }, [
    el('div', { class: 'sheet' }, [
      el('div', { class: 'grip' }),
      el('div', { class: 'h', text: `${c.pets[ui.petIdx].name} 정보 수정` }),
      field('이름', { name: 'p_name', value: pt.name || '', oninput: e => { pt.name = e.target.value; } }),
      field('나이', { name: 'p_age', value: pt.age || '', oninput: e => { pt.age = e.target.value; } }),
      field('추가 정보', { name: 'p_extra', value: pt.extra || '', oninput: e => { pt.extra = e.target.value; } }),
      el('button', { class: 'cta', text: '완료', onclick: async () => {
        await api.savePet(pt.id, { name: pt.name, age: pt.age, extra: pt.extra });
        ui.petIdx = null; ui.petDraft = null; flash('수정했어요'); reload();
      } }),
    ]),
  ]);
}

/* 특이사항 추가 시트 — 일정·아이 프로필에서 함께 쓴다 */
function careNoteSheet(c, ui, reload, rerender, defaultPet) {
  if (!ui.cnOpen) return null;
  const multi = c.pets.length > 1;
  const saved = [...new Set(c.notes.map(n => n.kind).filter(k => String(k).startsWith('c:')))];
  const customKinds = [...new Set([...saved, ...(ui.customKinds || [])])];
  const d = ui.cnDraft = ui.cnDraft || { kind: 'all', pet_id: multi ? (defaultPet || null) : null, text: '' };
  const close = () => { ui.cnOpen = false; rerender(); };
  return el('div', { class: 'sheetback',
    onclick: e => { if (e.target.classList.contains('sheetback')) close(); } }, [
    el('div', { class: 'sheet' }, [
      el('div', { class: 'grip' }),
      el('div', { class: 'h', text: '특이사항 추가' }),
      multi ? el('div', { class: 'chips' }, [{ id: null, name: '모든 아이' }, ...c.pets].map(p =>
        el('button', { class: 'chip', 'aria-pressed': d.pet_id === p.id, text: p.name,
          onclick: () => { d.pet_id = p.id; rerender(); } }))) : null,
      el('div', { class: 'sub', text: '어느 항목을 할 때 봐야 하나요?' }),
      el('div', { class: 'chips' }, [
        ...[['all', '공통'], ...Object.entries(KINDS).map(([k, v]) => [k, v.name]), ...customKinds.map(k => [k, kindName(k)])]
          .map(([k, t]) => el('button', { class: 'chip', 'aria-pressed': d.kind === k, text: t,
            onclick: () => { d.kind = k; rerender(); } })),
        el('button', { class: 'chip addchip', text: d.adding ? '취소' : '＋ 직접 추가',
          onclick: () => { d.adding = !d.adding; rerender(); } }),
      ]),
      d.adding ? el('div', { class: 'addrow' }, [
        el('input', { name: 'newkind', placeholder: '예) 약 챙길 때', value: d.newKind || '',
          oninput: e => { d.newKind = e.target.value; } }),
        el('button', { class: 'ctasm', text: '추가', onclick: () => {
          const name = (d.newKind || '').trim();
          if (!name) { flash('이름을 적어주세요'); return; }
          const key = 'c:' + name;
          if (!customKinds.includes(key)) ui.customKinds = [...customKinds, key];
          d.kind = key; d.newKind = ''; d.adding = false; rerender();
        } }),
      ]) : null,
      el('textarea', { name: 'cntext', placeholder: '예) 기저귀를 갈 때는 꼭 리드줄을 채워주세요',
        value: d.text, oninput: e => { d.text = e.target.value; } }),
      el('button', { class: 'cta', text: '저장', onclick: async () => {
        if (!d.text.trim()) { flash('내용을 적어주세요'); return; }
        const { data, error } = await api.addNote(c.owner_id, { kind: d.kind, pet_id: d.pet_id, text: d.text.trim() });
        if (error) { flash('저장 실패', error.message); return; }
        c.notes.push(data);
        ui.cnOpen = false; ui.cnDraft = null;
        flash('특이사항이 저장되었어요', '시터의 해당 인증 화면에 참고 사항으로 보입니다.');
        rerender();
      } }),
    ]),
  ]);
}

/* ── 3. 정보 확인 ── */
export function ownerConfirm(c, ui, go, reload, rerender) {
  const sheets = [];
  const row = (label, value, onEdit) => el('button', { class: 'kvrow', onclick: onEdit }, [
    el('span', { class: 'sub', text: label }),
    el('span', { class: 'kvval', text: value }),
    el('span', { class: 'chev', text: '›' }),
  ]);

  const petSheet = petEditSheet(c, ui, reload, rerender);
  if (petSheet) sheets.push(petSheet);

  if (ui.hoOpen) {
    // 초안을 ui에 둔다 — 칩을 누를 때마다 새로 만들면 입력하던 주소가 사라진다
    const p = ui.hoDraft || (ui.hoDraft = {
      handoff_start_time: hm(c.handoff_start_time), handoff_start_by: c.handoff_start_by,
      handoff_end_time: hm(c.handoff_end_time), handoff_end_by: c.handoff_end_by,
      owner_place_addr: c.owner_place_addr || '', owner_place_detail: c.owner_place_detail || '',
    });
    sheets.push(el('div', { class: 'sheetback', onclick: e => { if (e.target.classList.contains('sheetback')) { ui.hoOpen = false; ui.hoDraft = null; rerender(); } } }, [
      el('div', { class: 'sheet' }, [
        el('div', { class: 'grip' }),
        el('div', { class: 'h', text: '픽·드롭 약속 수정' }),
        el('div', { class: 'hogrp' }, [
          el('label', { text: '맡기는 날' }),
          field('', { name: 'ho_s', type: 'time', value: p.handoff_start_time, onchange: e => { p.handoff_start_time = e.target.value; } }),
          el('div', { class: 'chips' }, Object.entries(HO_START).map(([v, t]) =>
            el('button', { class: 'chip', 'aria-pressed': p.handoff_start_by === v, text: t,
              onclick: () => { p.handoff_start_by = v; rerender(); } }))),
        ]),
        el('div', { class: 'hogrp' }, [
          el('label', { text: '돌아오는 날' }),
          field('', { name: 'ho_e', type: 'time', value: p.handoff_end_time, onchange: e => { p.handoff_end_time = e.target.value; } }),
          el('div', { class: 'chips' }, Object.entries(HO_END).map(([v, t]) =>
            el('button', { class: 'chip', 'aria-pressed': p.handoff_end_by === v, text: t,
              onclick: () => { p.handoff_end_by = v; rerender(); } }))),
        ]),
        (p.handoff_start_by === 'sitter' || p.handoff_end_by === 'sitter') ? el('div', { class: 'hogrp' }, [
          el('label', { text: '우리 집 주소 (펫시터가 올 때)' }),
          el('div', { class: 'sub', text: '이 주소는 맡긴 시터에게만 보입니다.' }),
          field('주소', { name: 'oaddr', value: p.owner_place_addr || '', oninput: e => { p.owner_place_addr = e.target.value; } }),
          field('상세', { name: 'odetail', value: p.owner_place_detail || '', oninput: e => { p.owner_place_detail = e.target.value; } }),
        ]) : null,
        el('button', { class: 'cta', text: '완료', onclick: async () => {
          await api.saveContract(c.id, {
            handoff_start_time: p.handoff_start_time, handoff_start_by: p.handoff_start_by,
            handoff_end_time: p.handoff_end_time, handoff_end_by: p.handoff_end_by,
            owner_place_addr: p.owner_place_addr || null, owner_place_detail: p.owner_place_detail || null,
          });
          ui.hoOpen = false; ui.hoDraft = null; flash('저장했어요'); reload();
        } }),
      ]),
    ]));
  }

  const s = c.sitters || {};
  const sitterPlace = (c.handoff_start_by === 'owner' || c.handoff_end_by === 'owner') && s.addr;
  const needOwnerPlace = c.handoff_start_by === 'sitter' || c.handoff_end_by === 'sitter';
  const openHo = () => { ui.hoOpen = true; ui.hoDraft = null; rerender(); };

  return {
    title: '정보 확인',
    back: () => go('welcome'),
    overlay: sheets[0] || null,
    body: [
      el('div', { class: 'ding' }, [
        el('span', { class: 't', text: `${s.name} 시터가 미리 채워뒀어요` }),
        el('span', { class: 'd', text: '맞는지만 확인해주세요. 다른 부분이 있으면 눌러서 고치면 됩니다.' }),
      ]),
      card([
        el('div', { class: 'h', text: '돌보는 아이' }),
        el('div', { class: 'kvlist' }, c.pets.map((pt, i) => row(pt.name, [pt.age, pt.extra].filter(Boolean).join(' · ') || '정보 없음',
          () => { ui.petIdx = i; ui.petDraft = null; rerender(); }))),
      ]),
      card([
        el('div', { class: 'h', text: '돌봄 기간' }),
        el('div', { class: 'kv' }, [
          el('span', { class: 'sub', text: spanLabel(c.start_date, c.end_date) }),
          el('b', { text: `${dot(c.start_date)} ~ ${dot(c.end_date)}` }),
        ]),
      ]),
      card([
        el('div', { class: 'h', text: '픽·드롭 약속' }),
        el('button', { class: 'kvrow', onclick: () => { ui.hoOpen = true; ui.hoDraft = null; rerender(); } }, [
          el('div', { class: 'horows' }, [
            el('div', { class: 'hrow2' }, [el('span', { class: 'sub', text: `맡기는 날 · ${HO_START[c.handoff_start_by]}` }), el('b', { text: `${dot(c.start_date).slice(5)} ${hm(c.handoff_start_time)}` })]),
            el('div', { class: 'hrow2' }, [el('span', { class: 'sub', text: `돌아오는 날 · ${HO_END[c.handoff_end_by]}` }), el('b', { text: `${dot(c.end_date).slice(5)} ${hm(c.handoff_end_time)}` })]),
          ]),
          el('span', { class: 'chev', text: '›' }),
        ]),
      ]),
      needOwnerPlace ? card([
        el('div', { class: 'h', text: '약속 장소 · 우리 집' }),
        el('div', { class: 'sub', text: '펫시터가 오는 날 찾아올 주소예요. 맡긴 시터에게만 보입니다.' }),
        c.owner_place_addr
          ? el('div', { class: 'mapbox' }, [el('span', { text: '📍' }),
              el('span', { class: 'maptx', text: c.owner_place_addr + (c.owner_place_detail ? ` · ${c.owner_place_detail}` : '') })])
          : null,
        el('button', { class: 'add', text: c.owner_place_addr ? '주소 수정' : '＋ 주소 입력', onclick: openHo }),
      ]) : null,
      sitterPlace ? card([
        el('div', { class: 'h', text: '약속 장소 · 시터 쪽' }),
        el('div', { class: 'mapbox' }, [el('span', { text: '📍' }), el('span', { class: 'maptx', text: s.addr + (s.addr_detail ? ` · ${s.addr_detail}` : '') })]),
        el('button', { class: 'ctasm', text: '지도에서 보기', onclick: () => window.open(mapUrl(s.addr), '_blank') }),
      ]) : null,
      card([
        el('div', { class: 'h', text: '다음은 보호자님 차례예요' }),
        el('div', { class: 'sub', text: '확인을 누르면 돌봄 일정(언제 무엇을 해줄지)과 특이사항을 입력하는 화면으로 넘어갑니다.' }),
      ]),
    ],
    foot: [el('button', { class: 'cta', text: '확인했어요', onclick: async () => {
      await api.confirmContract(c.id); flash('확인 완료', '이제 돌봄 일정을 알려주세요.'); await reload(); go('schedule');
    } })],
  };
}

/* ── 4. 일정·특이사항 ── */
export function ownerSchedule(c, ui, go, reload, rerender) {
  const petOf = id => c.pets.find(p => p.id === id) || c.pets[0];
  const multi = c.pets.length > 1;
  const cur = ui.petTab && c.pets.some(p => p.id === ui.petTab) ? ui.petTab : c.pets[0]?.id;
  const items = c.items.filter(i => !multi || i.pet_id === cur);

  // 낙관적 갱신 — 화면을 먼저 바꾸고 저장은 뒤에서 한다 (매번 전체 재조회하면 입력이 버벅인다)
  const patchItem = (it, patch) => {
    Object.assign(it, patch);
    rerender();
    api.saveItem(it.id, patch).catch(e => flash('저장 실패', e.message));
  };
  const addRow = async () => {
    const { data, error } = await api.addItem(c.id, cur, { kind: 'meal', at_time: '12:00', fuzz_min: 60, sort_key: c.items.length });
    if (error) { flash('추가 실패', error.message); return; }
    c.items.push(data);
    rerender();
  };
  const dropRow = (it) => {
    c.items.splice(c.items.indexOf(it), 1);
    rerender();
    api.delItem(it.id).catch(e => flash('삭제 실패', e.message));
  };

  const noteSheet = careNoteSheet(c, ui, reload, rerender, cur);

  return {
    title: c.sent_at ? '일정·특이사항' : '돌봄 일정',
    back: () => go(c.sent_at ? 'home' : 'confirm'),
    overlay: noteSheet,
    body: [
      (!c.sent_at && c.items.length) ? el('div', { class: 'ding' }, [
        el('span', { class: 't', text: `${(c.sitters || {}).name} 시터가 일정을 미리 넣어뒀어요` }),
        el('span', { class: 'd', text: '맞는지 보시고 다르면 고치면 됩니다. 특이사항만 채우면 끝이에요.' }),
      ]) : null,
      multi ? el('div', { class: 'pettabs' }, c.pets.map(p =>
        el('button', { class: 'ptab', 'aria-pressed': cur === p.id, text: p.name,
          onclick: () => { ui.petTab = p.id; rerender(); } }))) : null,

      card([
        el('div', { class: 'headrow' }, [
          el('div', {}, [
            el('div', { class: 'h', text: '언제 무엇을 해주면 되나요?' }),
            el('div', { class: 'sub', text: '항목마다 시터가 그 시각에 사진 인증합니다.' }),
          ]),
          el('button', { class: 'addmini', text: '＋', 'aria-label': '항목 추가', onclick: addRow }),
        ]),
        ...items.map(it => el('div', { class: 'srow' }, [
          el('select', { name: `k_${it.id}`, onchange: e => {
            const kind = e.target.value;
            patchItem(it, kind === 'med' ? { kind, fuzz_min: 0 } : { kind });
          } }, Object.entries(KINDS).map(([k, t]) =>
            el('option', { value: k, selected: it.kind === k, text: t.name }))),
          it.fuzz_min === -1 ? null : el('input', { name: `t_${it.id}`, type: 'time', value: hm(it.at_time),
            onchange: e => patchItem(it, { at_time: e.target.value }) }),
          el('select', { name: `f_${it.id}`, 'aria-label': '시간 범위',
            onchange: e => patchItem(it, { fuzz_min: Number(e.target.value) }) }, Object.entries(FUZZ).map(([v, t]) =>
            el('option', { value: v, selected: String(it.fuzz_min) === v, text: t }))),
          el('button', { class: 'del', text: '✕', 'aria-label': '삭제', onclick: () => dropRow(it) }),
        ])),
        items.length ? null : el('div', { class: 'sub', text: '＋ 를 눌러 항목을 추가해주세요.' }),
      ]),

      card([
        el('div', { class: 'h', text: '특이사항' }),
        el('div', { class: 'sub', text: '한 번 적어두면 시터가 그 일을 하는 순간 「참고 사항」으로 함께 보입니다. 아이 프로필에 저장되어 다음 돌봄에도 쓰입니다.' }),
        ...c.notes.filter(n => !multi || !n.pet_id || n.pet_id === cur).map(n => el('div', { class: 'note' }, [
          el('div', { class: 'notehead' }, [
            el('span', { class: 'notechip', text: kindName(n.kind) + (multi && n.pet_id ? ` · ${petOf(n.pet_id)?.name}` : '') }),
            el('button', { class: 'linkbtn', text: '삭제', onclick: () => {
              c.notes.splice(c.notes.indexOf(n), 1); rerender();
              api.delNote(n.id).catch(e => flash('삭제 실패', e.message));
            } }),
          ]),
          el('span', { class: 'r', text: n.text }),
        ])),
        el('button', { class: 'add', text: '＋ 특이사항 추가',
          onclick: () => { ui.cnOpen = true; ui.cnDraft = null; rerender(); } }),
      ]),
    ],
    foot: [el('button', { class: 'cta', disabled: !c.items.length,
      text: c.items.length ? (c.sent_at ? '다시 전달' : `${(c.sitters || {}).name} 시터에게 전달`) : '항목을 하나 이상 넣어주세요',
      onclick: async () => {
        await api.sendSchedule(c.id);
        flash('전달했어요', '시터에게 일정이 전송됐습니다.');
        await reload(); go(installSeen() ? 'home' : 'install');
      } })],
  };
}

/* ── F2 아이 프로필 — 아이 정보와 저장된 특이사항 ── */
export function ownerPetProfile(c, ui, go, reload, rerender) {
  const multi = c.pets.length > 1;
  const nameOf = id => (c.pets.find(p => p.id === id) || {}).name || '';

  return {
    title: '아이 프로필',
    back: () => go('home'),
    overlay: petEditSheet(c, ui, reload, rerender) || careNoteSheet(c, ui, reload, rerender, null),
    body: [
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
        el('div', { class: 'sub', text: '내 프로필에 저장된 아이입니다. 다음 돌봄에도 그대로 쓰여요.' }),
      ]),

      el('div', { class: 'sect', text: '저장된 특이사항' }),
      el('div', { class: 'sectsub', text: '여기 저장해두면 다음 돌봄 일정을 만들 때 그대로 불러와집니다. 시터가 바뀌어도 다시 쓸 필요가 없어요.' }),
      card([
        c.notes.length ? el('div', { class: 'notelist' }, c.notes.flatMap((n, i) => [
          el('span', { class: 'k' + (i ? ' sep' : ''),
            text: kindName(n.kind) + (multi && n.pet_id ? ` · ${nameOf(n.pet_id)}` : '') }),
          el('span', { class: 'v' + (i ? ' sep' : '') }, [
            el('span', { class: 'vtx', text: n.text }),
            el('button', { class: 'ntrash', 'aria-label': '삭제', text: '✕', onclick: async () => {
              c.notes.splice(c.notes.indexOf(n), 1); rerender();
              try { await api.delNote(n.id); } catch (e) { flash('삭제 실패', e.message); await reload(); }
            } }),
          ]),
        ])) : el('div', { class: 'sub', text: '아직 저장된 특이사항이 없습니다.' }),
        el('button', { class: 'add', text: '＋ 특이사항 추가',
          onclick: () => { ui.cnOpen = true; ui.cnDraft = null; rerender(); } }),
      ]),
    ],
  };
}

/* ── 5. 돌봄 일지 — 시터가 올린 인증이 쌓인다 ── */
const clock = ts => new Date(ts).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' });
// 여러 날 돌봄에서는 시각만으로 어느 날인지 알 수 없다
const dayTime = ts => {
  const d = new Date(ts);
  const today = new Date().toDateString() === d.toDateString();
  return (today ? '오늘' : `${d.getMonth() + 1}.${d.getDate()}`) + ' ' + clock(ts);
};
const REACTIONS = { '귀여워요': '😍', '안심돼요': '😌', '고마워요': '💙' };
const DISPUTE_UI = false;   // 보호자 쪽 이의 접수 노출 여부

// 종 배지 = 아직 안 본 인증 (반응한 것은 「새 인증」이 아니다 — 38차 회귀 방지)
export const freshProofs = c => c.items
  .filter(it => it.proof && !it.proof.seen && !it.proof.verdict)
  .map(it => it.proof.id);

export function ownerHome(c, go, ui, rerender, bell) {
  const s = c.sitters || {};
  const multi = c.pets.length > 1;
  const nameOf = id => (c.pets.find(p => p.id === id) || {}).name || '';
  // 다견이면 아이를 골라야 그 아이의 일지가 열린다 (한 마리면 바로 열린다)
  const cur = multi ? (ui.diaryPet && c.pets.some(p => p.id === ui.diaryPet) ? ui.diaryPet : null) : c.pets[0]?.id;
  const mine = it => !multi || it.pet_id === cur;
  const fresh = freshProofs(c).length;

  const shot = (url, at) => el('button', { class: 'thumb', onclick: () => openLightbox(url) }, [
    el('img', { src: url, alt: '' }),
    at ? el('span', { class: 'shotstamp', text: clock(at) }) : null,
  ]);

  const disputeSheet = () => {
    const it = c.items.find(i => i.proof && i.proof.id === ui.disputeFor);
    if (!it) return null;
    const close = () => { ui.disputeFor = null; rerender(); };
    return el('div', { class: 'sheetback',
      onclick: e => { if (e.target.classList.contains('sheetback')) close(); } }, [
      el('div', { class: 'sheet' }, [
        el('div', { class: 'grip' }),
        el('div', { class: 'h', text: '무엇이 달랐나요?' }),
        el('div', { class: 'sub', text: '사유를 골라야 접수됩니다. 시터에게 그대로 전달되고, 시터가 소명하면 함께 남습니다.' }),
        el('div', { class: 'chips' }, REASONS.map(r =>
          el('button', { class: 'chip', 'aria-pressed': ui.disputeReason === r, text: r,
            onclick: () => { ui.disputeReason = r; rerender(); } }))),
        el('button', { class: 'cta', disabled: !ui.disputeReason,
          text: ui.disputeReason ? '보내기' : '사유를 골라주세요',
          onclick: async () => {
            try {
              await openDispute(it.proof.id, ui.disputeReason);
              await setVerdict(it.proof.id, { matched: false });
              ui.disputeFor = null; ui.disputeReason = null;
              flash('전달했어요', '시터의 소명을 기다립니다.');
              await reload();
            } catch (e) { flash('전달 실패', e.message); }
          } }),
        el('button', { class: 'linkbtn center', text: '닫기', onclick: close }),
      ]),
    ]);
  };

  const overlay = ui.disputeFor ? disputeSheet() : null;

  return {
    title: multi && cur ? `${nameOf(cur)} 돌봄 일지` : '돌봄 일지',
    back: multi && cur ? () => { ui.diaryPet = null; rerender(); } : null,
    right: bell,
    overlay,
    body: [
      (multi && cur) ? null : card([
        el('div', { class: 'profhead' }, [
          el('div', { class: 'pcol' }, [
            el('div', { class: 'h', text: c.pets.map(p => p.name).join(' · ') }),
            el('div', { class: 'sub', text: `${dot(c.start_date)} ~ ${dot(c.end_date)}` }),
          ]),
          el('button', { class: 'ctasm', text: `${s.name} 시터`, onclick: () => go('sitterProfile') }),
        ]),
      ]),

      (!multi || cur) ? (() => {
        const notes = c.notes.filter(n => !n.pet_id || n.pet_id === cur);
        const open = !!ui.notesOpen;
        return notes.length ? el('div', { class: 'sectwrap' }, [
          el('button', { class: 'secttoggle', 'aria-expanded': open,
            onclick: () => { ui.notesOpen = !open; rerender(); } }, [
            el('span', { class: 'sect', text: `내가 남긴 특이사항 ${notes.length}` }),
            el('span', { class: 'tchev', text: '›' }),
          ]),
          open ? card([el('div', { class: 'notelist' }, notes.flatMap((n, i) => [
            el('span', { class: 'k' + (i ? ' sep' : ''), text: kindName(n.kind) }),
            el('span', { class: 'v' + (i ? ' sep' : ''), text: n.text }),
          ]))]) : null,
        ]) : null;
      })() : null,

      multi && !cur ? card([
        el('div', { class: 'h', text: '어느 아이의 기록을 볼까요?' }),
        el('div', { class: 'rows' }, c.pets.map(p => {
          const its = c.items.filter(it => it.pet_id === p.id);
          const arrived = its.filter(it => it.proof).length;
          return el('button', { class: 'kvrow', onclick: () => { ui.diaryPet = p.id; rerender(); } }, [
            el('div', { class: 'lrmain' }, [
              el('div', { class: 'lrtitle' }, [
                el('span', { text: p.name }),
                its.some(it => it.proof && !it.proof.seen && !it.proof.verdict)
                  ? el('span', { class: 'badge', text: 'NEW' }) : null,
              ]),
              el('div', { class: 'sub', text: [p.age, p.extra].filter(Boolean).join(' · ') || '정보 없음' }),
            ]),
            el('span', { class: 'kvval', text: `${arrived} / ${its.length}` }),
            el('span', { class: 'chev', text: '›' }),
          ]);
        })),
      ]) : null,

      fresh ? el('div', { class: 'ding' }, [
        el('span', { class: 't', text: `방금 인증 ${fresh}건이 도착했어요` }),
        el('span', { class: 'd', text: '확인하지 않아도 불이익은 없어요. 보고 싶을 때 보시면 됩니다.' }),
      ]) : null,

      (!multi || cur) ? el('div', { class: 'sect', text: '활동 타임라인' }) : null,

      // 항목 하나가 카드 하나 — 시간순으로 쌓인다
      ...((!multi || cur) ? c.items.filter(mine).map(it => {
        const p = it.proof;
        const shots = p ? [[p.photo_url, p.shot_at], [p.photo2_url, p.shot2_at]].filter(([u]) => u) : [];
        const out = p ? outMinutes(p) : null;
        return card([
          el('div', { class: 'tlhead' }, [
            el('span', { class: 'tltime', text: p ? dayTime(p.submitted_at) : (it.fuzz_min === -1 ? '아무때나' : hm(it.at_time)) }),
            el('span', { class: 'kchip' + (p ? ' on' : ''), text: kindName(it.kind) + (p ? ' 완료' : ' 예정') }),
            p && !p.seen && !p.verdict ? el('span', { class: 'badge', text: 'NEW' }) : null,
          ]),
          p && p.text ? el('div', { class: 'tltext', text: p.text }) : null,
          shots.length ? el('div', { class: 'shots' }, shots.map(([u, a]) => shot(u, a))) : null,
          el('div', { class: 'tlmeta', text: !p ? '아직 기록 없음'
            : [out !== null ? `밖에 있던 시간 ${out}분` : null,
               !p.photo_url ? '사진 없이 설명만' : null,
               p.resubmit_count ? `${p.resubmit_count}회 다시 제출` : null].filter(Boolean).join(' · ')
              || '사진과 시각은 시터가 올린 그대로입니다' }),

          // 리액션 어느 것이든 「확인」이다. 확인하지 않아도 불이익은 없다
          p && !p.dispute ? el('div', { class: 'react' + (p.verdict?.matched ? ' locked' : '') },
            Object.entries(REACTIONS).map(([label, emoji]) =>
              el('button', {
                'aria-pressed': p.verdict?.reaction === label,
                disabled: !!p.verdict?.matched,
                text: `${emoji} ${label}`,
                onclick: async () => {
                  if (p.verdict?.matched) return;
                  p.verdict = { matched: true, reaction: label, decided_at: new Date().toISOString() };
                  rerender();
                  try { await setVerdict(p.id, { matched: true, reaction: label }); }
                  catch (e) { flash('전달 실패', e.message); }
                },
              }))) : null,

          // 이의 접수 버튼은 지금 버전에서 감춘다 (DISPUTE_UI를 true로 되돌리면 다시 나온다)
          (DISPUTE_UI && p && !p.dispute && !p.verdict) ? el('button', { class: 'seecap wrong', text: '사실과 달라요',
            onclick: () => { ui.disputeFor = p.id; ui.disputeReason = null; rerender(); } }) : null,

          p && p.dispute ? el('div', { class: 'dispute' }, [
            el('div', { class: 'dhead' }, [
              el('span', { class: 'dtag', text: '사실과 달라요' }),
              el('span', { class: 'sub', text: p.dispute.reason }),
            ]),
            p.dispute.reply_at
              ? el('div', { class: 'dreply' }, [
                  el('span', { class: 'dlab', text: `시터 소명 · ${clock(p.dispute.reply_at)}` }),
                  el('span', { class: 'ptext', text: p.dispute.reply_text || '' }),
                ])
              : el('div', { class: 'sub', text: noReply(p.dispute)
                  ? '72시간이 지나도록 소명이 없습니다.' : '시터의 소명을 기다리는 중입니다.' }),
            !p.dispute.reply_at ? el('button', { class: 'seecap', text: '이의 철회',
              onclick: async () => {
                try {
                  await withdrawDispute(p.dispute.id);
                  await withdrawVerdict(p.id).catch(() => {});
                  flash('철회했어요'); await reload();
                } catch (e) { flash('철회할 수 없어요', e.message); }
              } }) : null,
          ]) : null,
        ]);
      }) : []),

      ((c.extras || []).length && (!multi || !cur)) ? el('div', { class: 'sectwrap' }, [
        el('div', { class: 'sect', text: '먼저 챙긴 순간' }),
        el('div', { class: 'sectsub', text: '부탁하지 않았는데 시터가 남긴 순간입니다. 마음에 닿았다면 리액션을 눌러주세요 — 시터 프로필에 쌓입니다.' }),
        ...c.extras.map(x => card([
          el('div', { class: 'exrow' }, [
            (x.extra_photos || []).length ? el('div', { class: 'exshots' }, [
              el('button', { class: 'thumb', onclick: () => openLightbox(x.extra_photos[0].url) }, [
                el('img', { src: x.extra_photos[0].url, alt: '' }),
                el('span', { class: 'tag', text: x.extra_photos[0].is_album ? '앨범' : '앱 촬영' }),
              ]),
              x.extra_photos.length > 1 ? el('button', { class: 'exmore', text: `+${x.extra_photos.length - 1}`,
                onclick: () => openLightbox(x.extra_photos[1].url) }) : null,
            ]) : null,
            el('div', { class: 'excol' }, [
              el('span', { class: 'tltime', text: dayTime(x.at) }),
              x.text ? el('div', { class: 'ptext', text: x.text }) : null,
          el('div', { class: 'react' + (x.thanks_reaction ? ' locked' : '') },
            Object.entries(REACTIONS).map(([label, emoji]) =>
              el('button', {
                'aria-pressed': (x.thanks_reaction || '') === label,
                disabled: !!x.thanks_reaction,
                text: `${emoji} ${label}`,
                onclick: async () => {
                  if (x.thanks_reaction) return;
                  x.thanks_reaction = label; x.thanks_at = new Date().toISOString();
                  rerender();
                  try { await thankExtra(x.id, label); } catch (e) { flash('전달 실패', e.message); }
                },
              }))),
            ]),
          ]),
          x.thanks_at ? el('span', { class: 'thxdone', text: `${clock(x.thanks_at)} 시터에게 전달됐어요` }) : null,
        ])),
      ]) : null,

      (c.finished_at && (!multi || !cur)) ? card([
        el('div', { class: 'h', text: '이 돌봄 기록을 공개할까요?' }),
        el('div', { class: 'sub', text: '켜면 사진·시각·확인 여부가 그대로 담긴 읽기 전용 링크가 만들어집니다. 다음에 이 시터를 알아보는 다른 보호자가 「말이 아니라 기록」으로 판단할 수 있어요. 언제든 다시 끌 수 있고, 끄면 링크는 바로 열리지 않습니다.' }),
        el('label', { class: 'switchrow' }, [
          el('span', { class: 'swlab', text: c.record_public ? '공개 중' : '비공개' }),
          el('input', { type: 'checkbox', checked: c.record_public ? 'checked' : null,
            onchange: async e => {
              const on = e.target.checked;
              c.record_public = on; rerender();
              try { await api.setRecordPublic(c.id, on); flash(on ? '공개했어요' : '비공개로 바꿨어요'); }
              catch (err) { flash('바꾸지 못했어요', err.message); }
            } }),
        ]),
        c.record_public ? el('div', { class: 'okbox' }, [
          el('div', { class: 'sub', text: '공개 링크' }),
          el('input', { class: 'linkinput', name: 'reclink', readonly: 'readonly',
            value: `${shareOrigin()}/r/${c.record_token}`, onclick: e => e.target.select() }),
          el('button', { class: 'ctasm', text: '링크 복사', onclick: async () => {
            flash(await copyText(`${shareOrigin()}/r/${c.record_token}`) ? '복사했어요' : '길게 눌러 복사해주세요');
          } }),
        ]) : null,
      ]) : null,

      el('div', { class: 'hgrid' }, [
        el('button', { class: 'add', text: '아이 프로필', onclick: () => go('petProfile') }),
        el('button', { class: 'add', text: '일정·특이사항', onclick: () => go('schedule') }),
      ]),
      installSeen() ? el('button', { class: 'linkbtn center', text: '홈 화면에 앱으로 추가하기', onclick: () => go('install') }) : null,
    ],
  };
}
