import { el, card, flash, copyText } from '../el.js';
import { inviteUrlOf } from '../../data/contracts.js';

const dot = d => (d || '').replaceAll('-', '.');

let rerenderRef = null;
export function sitterHomeScreen(ctx, go, rerender, bell) {
  rerenderRef = rerender;
  const list = ctx.contracts || [];
  const copy = async (url) => {
    const ok = await copyText(url);
    if (ok) flash('초대 링크를 복사했어요', '당근·카톡에 붙여넣어 보내세요.');
    else { ctx.showLink = url; flash('길게 눌러 복사해주세요', '아래에 링크를 펼쳐뒀어요.'); rerenderRef && rerenderRef(); }
  };

  return {
    title: '오늘의 돌봄',
    right: { label: '내 프로필', on: () => go('profile') },
    rightExtra: bell,
    body: [
      ctx.lastToken ? el('div', { class: 'ding' }, [
        el('span', { class: 't', text: '초대 링크가 준비됐어요' }),
        el('span', { class: 'd', text: '보호자가 이 링크를 열면 정보를 확인하고 일정을 입력합니다.' }),
        el('button', { class: 'ctasm', text: '링크 복사', onclick: () => copy(inviteUrlOf(ctx.lastToken)) }),
      ]) : null,

      ctx.showLink ? card([
        el('div', { class: 'h', text: '초대 링크' }),
        el('div', { class: 'sub', text: '길게 눌러 전체 선택 후 복사하세요. (폰에서 http로 열면 자동 복사가 막힙니다)' }),
        el('input', { class: 'linkinput', name: 'invitelink', readonly: 'readonly', value: ctx.showLink,
          onclick: e => e.target.select() }),
        el('button', { class: 'linkbtn', text: '닫기', onclick: () => { ctx.showLink = null; rerender(); } }),
      ]) : null,

      list.length ? card([
        el('div', { class: 'h', text: `돌봄 ${list.length}건` }),
        el('div', { class: 'rows' }, list.map(c => {
          const pets = (c.contract_pets || []).map(cp => cp.pets?.name).filter(Boolean).join('·');
          const state = c.finished_at ? '완료' : c.sent_at ? '진행 중' : c.confirmed_at ? '일정 대기' : '보호자 확인 대기';
          return el('div', { class: 'listrow' }, [
            el('div', { class: 'lrmain' }, [
              el('div', { class: 'lrtitle' }, [
                el('span', { text: pets || '아이 미지정' }),
                el('span', { class: 'badge', text: state }),
              ]),
              el('div', { class: 'sub', text: `${c.owners?.nickname || '보호자'} · ${dot(c.start_date)} ~ ${dot(c.end_date)}` }),
            ]),
            el('div', { class: 'lrbtns' }, [
              c.sent_at
                ? el('button', { class: 'ctasm', text: '기록하기', onclick: () => go('care', c.id) })
                : el('button', { class: 'ctasm', text: '정보 수정', onclick: () => go('contract', c.id) }),
              el('button', { class: 'seecap', text: c.sent_at ? '돌봄 정보' : '보호자 링크',
                onclick: () => c.sent_at ? go('contract', c.id) : copy(inviteUrlOf(c.invite_token)) }),
            ]),
          ]);
        })),
      ]) : card([
        el('div', { class: 'h', text: '아직 준비된 돌봄이 없어요' }),
        el('div', { class: 'sub', text: '의뢰가 오면 아이 정보·기간·픽드롭을 미리 채우고 링크를 보냅니다. 보호자는 확인만 하면 돼요.' }),
      ]),

      el('button', { class: 'add', text: '＋ 돌봄 준비하기',
        onclick: () => { ctx.fromInquiry = null; ctx.form = null; go('newContract'); } }),
    ],
    hint: '보호자가 일정을 보내면 「기록하기」가 열립니다.',
  };
}
