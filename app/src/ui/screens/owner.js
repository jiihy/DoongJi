import { el, card, field, flash } from '../el.js';
import * as api from '../../data/owner.js';

const KINDS = { meal: '밥', walk: '산책', poop: '배변', med: '약', play: '놀이', sleep: '취침' };
const FUZZ = { 0: '정각', 30: '~30분쯤', 60: '~1시간쯤', 120: '~2시간쯤', '-1': '아무때나' };
const HO_START = { owner: '보호자가 데려다줘요', sitter: '펫시터가 데리러 와요' };
const HO_END = { owner: '보호자가 데리러 와요', sitter: '펫시터가 데려다줘요' };
const dot = d => (d || '').replaceAll('-', '.');
const hm = t => (t || '').slice(0, 5);
const mapUrl = q => 'https://map.naver.com/p/search/' + encodeURIComponent(q);
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
    hint: '시터가 보낸 초대 링크입니다. 가입은 필요 없어요.',
  };
}

/* ── 2. 앱처럼 쓰기 (홈 화면 추가 · 알림) ── */
export function ownerInstall(state, go, rerender) {
  if (state.step === undefined) state.step = 1;
  const bullet = (t) => el('div', { class: 'bul' }, [el('span', { class: 'bdot' }), el('span', { class: 'btx', text: t })]);
  const sheet = kids => el('div', { class: 'sheetback' }, [el('div', { class: 'sheet' }, kids)]);

  const step1 = () => sheet([
    el('div', { class: 'grip' }),
    el('div', { class: 'a2head' }, [
      el('div', { class: 'appicon' }, el('img', { class: 'appimg', src: '/app-icon.png?v=2', alt: '' })),
      el('div', { class: 'pcol' }, [
        el('div', { class: 'h', text: '홈 화면에 앱으로 추가' }),
        el('div', { class: 'sub', text: '설치하면 앱처럼 전체화면으로 열려요.' }),
      ]),
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
      try { if ('Notification' in window) await Notification.requestPermission(); } catch (e) {}
      go('home');
    } }),
    el('button', { class: 'linkbtn center', text: '나중에 할게요', onclick: () => go('home') }),
  ]);

  return {
    title: '앱처럼 쓰기',
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

/* ── 3. 정보 확인 ── */
export function ownerConfirm(c, ui, go, reload, rerender) {
  const sheets = [];
  const row = (label, value, onEdit) => el('button', { class: 'kvrow', onclick: onEdit }, [
    el('span', { class: 'sub', text: label }),
    el('span', { class: 'kvval', text: value }),
    el('span', { class: 'chev', text: '›' }),
  ]);

  if (ui.petIdx !== undefined && ui.petIdx !== null && c.pets[ui.petIdx]) {
    const pt = { ...c.pets[ui.petIdx] };
    sheets.push(el('div', { class: 'sheetback', onclick: e => { if (e.target.classList.contains('sheetback')) { ui.petIdx = null; rerender(); } } }, [
      el('div', { class: 'sheet' }, [
        el('div', { class: 'grip' }),
        el('div', { class: 'h', text: `${pt.name} 정보 수정` }),
        field('이름', { name: 'p_name', value: pt.name || '', oninput: e => { pt.name = e.target.value; } }),
        field('나이', { name: 'p_age', value: pt.age || '', oninput: e => { pt.age = e.target.value; } }),
        field('추가 정보', { name: 'p_extra', value: pt.extra || '', oninput: e => { pt.extra = e.target.value; } }),
        el('button', { class: 'cta', text: '완료', onclick: async () => {
          await api.savePet(pt.id, { name: pt.name, age: pt.age, extra: pt.extra });
          ui.petIdx = null; flash('수정했어요'); reload();
        } }),
      ]),
    ]));
  }

  if (ui.hoOpen) {
    const p = { ...c };
    sheets.push(el('div', { class: 'sheetback', onclick: e => { if (e.target.classList.contains('sheetback')) { ui.hoOpen = false; rerender(); } } }, [
      el('div', { class: 'sheet' }, [
        el('div', { class: 'grip' }),
        el('div', { class: 'h', text: '픽·드롭 약속 수정' }),
        el('div', { class: 'hogrp' }, [
          el('label', { text: '맡기는 날' }),
          field('', { name: 'ho_s', type: 'time', value: hm(p.handoff_start_time), onchange: e => { p.handoff_start_time = e.target.value; } }),
          el('div', { class: 'chips' }, Object.entries(HO_START).map(([v, t]) =>
            el('button', { class: 'chip', 'aria-pressed': p.handoff_start_by === v, text: t,
              onclick: () => { p.handoff_start_by = v; c.handoff_start_by = v; rerender(); } }))),
        ]),
        el('div', { class: 'hogrp' }, [
          el('label', { text: '돌아오는 날' }),
          field('', { name: 'ho_e', type: 'time', value: hm(p.handoff_end_time), onchange: e => { p.handoff_end_time = e.target.value; } }),
          el('div', { class: 'chips' }, Object.entries(HO_END).map(([v, t]) =>
            el('button', { class: 'chip', 'aria-pressed': p.handoff_end_by === v, text: t,
              onclick: () => { p.handoff_end_by = v; c.handoff_end_by = v; rerender(); } }))),
        ]),
        (c.handoff_start_by === 'sitter' || c.handoff_end_by === 'sitter') ? el('div', { class: 'hogrp' }, [
          el('label', { text: '우리 집 주소 (펫시터가 올 때)' }),
          el('div', { class: 'sub', text: '이 주소는 맡긴 시터에게만 보입니다.' }),
          field('주소', { name: 'oaddr', value: p.owner_place_addr || '', oninput: e => { p.owner_place_addr = e.target.value; } }),
          field('상세', { name: 'odetail', value: p.owner_place_detail || '', oninput: e => { p.owner_place_detail = e.target.value; } }),
        ]) : null,
        el('button', { class: 'cta', text: '완료', onclick: async () => {
          await api.saveContract(c.id, {
            handoff_start_time: p.handoff_start_time, handoff_start_by: c.handoff_start_by,
            handoff_end_time: p.handoff_end_time, handoff_end_by: c.handoff_end_by,
            owner_place_addr: p.owner_place_addr, owner_place_detail: p.owner_place_detail,
          });
          ui.hoOpen = false; flash('저장했어요'); reload();
        } }),
      ]),
    ]));
  }

  const s = c.sitters || {};
  const sitterPlace = (c.handoff_start_by === 'owner' || c.handoff_end_by === 'owner') && s.addr;

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
        ...c.pets.map((pt, i) => row(pt.name, [pt.age, pt.extra].filter(Boolean).join(' · ') || '정보 없음',
          () => { ui.petIdx = i; rerender(); })),
      ]),
      card([
        el('div', { class: 'h', text: '돌봄 기간' }),
        el('div', { class: 'kv' }, [
          el('span', { class: 'sub', text: '기간' }),
          el('b', { text: `${dot(c.start_date)} ~ ${dot(c.end_date)}` }),
        ]),
      ]),
      card([
        el('div', { class: 'h', text: '픽·드롭 약속' }),
        el('button', { class: 'kvrow', onclick: () => { ui.hoOpen = true; rerender(); } }, [
          el('div', { class: 'horows' }, [
            el('div', { class: 'hrow2' }, [el('span', { class: 'sub', text: `맡기는 날 · ${HO_START[c.handoff_start_by]}` }), el('b', { text: `${dot(c.start_date).slice(5)} ${hm(c.handoff_start_time)}` })]),
            el('div', { class: 'hrow2' }, [el('span', { class: 'sub', text: `돌아오는 날 · ${HO_END[c.handoff_end_by]}` }), el('b', { text: `${dot(c.end_date).slice(5)} ${hm(c.handoff_end_time)}` })]),
          ]),
          el('span', { class: 'chev', text: '›' }),
        ]),
      ]),
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

  const addRow = async () => {
    const { data, error } = await api.addItem(c.id, cur, { kind: 'meal', at_time: '12:00', fuzz_min: 60, sort_key: c.items.length });
    if (error) { flash('추가 실패', error.message); return; }
    await reload();
  };

  const noteSheet = ui.cnOpen ? (() => {
    const d = ui.cnDraft = ui.cnDraft || { kind: 'all', pet_id: null, text: '' };
    return el('div', { class: 'sheetback', onclick: e => { if (e.target.classList.contains('sheetback')) { ui.cnOpen = false; rerender(); } } }, [
      el('div', { class: 'sheet' }, [
        el('div', { class: 'grip' }),
        el('div', { class: 'h', text: '특이사항 추가' }),
        multi ? el('div', { class: 'chips' }, [{ id: null, name: '모든 아이' }, ...c.pets].map(p =>
          el('button', { class: 'chip', 'aria-pressed': d.pet_id === p.id, text: p.name,
            onclick: () => { d.pet_id = p.id; rerender(); } }))) : null,
        el('div', { class: 'sub', text: '어느 항목을 할 때 봐야 하나요?' }),
        el('div', { class: 'chips' }, [['all', '공통'], ...Object.entries(KINDS)].map(([k, t]) =>
          el('button', { class: 'chip', 'aria-pressed': d.kind === k, text: t,
            onclick: () => { d.kind = k; rerender(); } }))),
        el('textarea', { name: 'cntext', placeholder: '예) 기저귀를 갈 때는 꼭 리드줄을 채워주세요',
          value: d.text, oninput: e => { d.text = e.target.value; } }),
        el('button', { class: 'cta', text: '저장', onclick: async () => {
          if (!d.text.trim()) { flash('내용을 적어주세요'); return; }
          await api.addNote(c.owner_id, { kind: d.kind, pet_id: d.pet_id, text: d.text.trim() });
          ui.cnOpen = false; ui.cnDraft = null; flash('특이사항이 저장되었어요', '시터의 해당 인증 화면에 참고 사항으로 보입니다.');
          await reload();
        } }),
      ]),
    ]);
  })() : null;

  return {
    title: c.sent_at ? '일정·특이사항' : '돌봄 일정',
    back: c.sent_at ? () => go('home') : null,
    overlay: noteSheet,
    body: [
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
          el('select', { name: `k_${it.id}`, onchange: async e => {
            const kind = e.target.value;
            const patch = kind === 'med' ? { kind, fuzz_min: 0 } : { kind };
            await api.saveItem(it.id, patch); await reload();
          } }, Object.entries(KINDS).map(([k, t]) =>
            el('option', { value: k, selected: it.kind === k, text: t }))),
          it.fuzz_min === -1 ? null : el('input', { name: `t_${it.id}`, type: 'time', value: hm(it.at_time),
            onchange: async e => { await api.saveItem(it.id, { at_time: e.target.value }); await reload(); } }),
          el('select', { name: `f_${it.id}`, 'aria-label': '시간 범위', onchange: async e => {
            await api.saveItem(it.id, { fuzz_min: Number(e.target.value) }); await reload();
          } }, Object.entries(FUZZ).map(([v, t]) =>
            el('option', { value: v, selected: String(it.fuzz_min) === v, text: t }))),
          el('button', { class: 'del', text: '✕', 'aria-label': '삭제',
            onclick: async () => { await api.delItem(it.id); await reload(); } }),
        ])),
        items.length ? null : el('div', { class: 'sub', text: '＋ 를 눌러 항목을 추가해주세요.' }),
      ]),

      card([
        el('div', { class: 'h', text: '특이사항' }),
        el('div', { class: 'sub', text: '한 번 적어두면 시터가 그 일을 하는 순간 「참고 사항」으로 함께 보입니다. 아이 프로필에 저장되어 다음 돌봄에도 쓰입니다.' }),
        ...c.notes.filter(n => !multi || !n.pet_id || n.pet_id === cur).map(n => el('div', { class: 'note' }, [
          el('div', { class: 'notehead' }, [
            el('span', { class: 'notechip', text: (n.kind === 'all' ? '공통' : KINDS[n.kind] || n.kind) + (multi && n.pet_id ? ` · ${petOf(n.pet_id)?.name}` : '') }),
            el('button', { class: 'linkbtn', text: '삭제', onclick: async () => { await api.delNote(n.id); await reload(); } }),
          ]),
          el('span', { class: 'r', text: n.text }),
        ])),
        el('button', { class: 'add', text: '＋ 특이사항 추가', onclick: () => { ui.cnOpen = true; rerender(); } }),
      ]),
    ],
    foot: [el('button', { class: 'cta', disabled: !c.items.length,
      text: c.items.length ? (c.sent_at ? '다시 전달' : `${(c.sitters || {}).name} 시터에게 전달`) : '항목을 하나 이상 넣어주세요',
      onclick: async () => {
        await api.sendSchedule(c.id);
        flash('전달했어요', '시터에게 일정이 전송됐습니다.');
        await reload(); go(installSeen() ? 'home' : 'install');
      } })],
    hint: '보호자 화면입니다. 찍을 대상을 보호자가 정합니다.',
  };
}

/* ── 5. 전달 후 홈 (M4에서 일지로 확장) ── */
export function ownerHome(c, go) {
  const s = c.sitters || {};
  return {
    title: '돌봄 일지',
    body: [
      card([
        el('div', { class: 'profhead' }, [
          el('div', { class: 'avatar' }),
          el('div', { class: 'pcol' }, [
            el('div', { class: 'h', text: c.pets.map(p => p.name).join(' · ') }),
            el('div', { class: 'sub', text: `${dot(c.start_date)} ~ ${dot(c.end_date)}` }),
          ]),
          el('button', { class: 'ctasm', text: `${s.name} 시터` }),
        ]),
      ]),
      card([
        el('div', { class: 'h', text: '일정을 전달했어요' }),
        el('div', { class: 'sub', text: '시터가 인증을 보내면 여기에 사진과 시각이 쌓입니다. (인증 화면은 M4에서 열립니다)' }),
        el('div', { class: 'tl' }, c.items.map(it => el('div', { class: 'titem' }, [
          el('span', { class: 'tt', text: it.fuzz_min === -1 ? '아무때나' : hm(it.at_time) }),
          el('span', { class: 'tk', text: KINDS[it.kind] + (c.pets.length > 1 ? ` · ${(c.pets.find(p => p.id === it.pet_id) || {}).name || ''}` : '') }),
          el('span', { class: 'sub', text: '아직 기록 없음' }),
        ]))),
      ]),
      el('button', { class: 'add', text: '일정·특이사항 보기 · 수정', onclick: () => go('schedule') }),
      installSeen() ? el('button', { class: 'linkbtn center', text: '홈 화면에 앱으로 추가하기', onclick: () => go('install') }) : null,
    ],
    hint: 'M3 완료 — 다음 단계에서 인증이 도착합니다.',
  };
}
