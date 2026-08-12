import { el, card, field, flash, copyText } from '../el.js';
import { sb, shareOrigin } from '../../lib/supabase.js';
import { saveSitter, uploadAvatar, listInquiries, markInquiry } from '../../data/sitter.js';

export function profileScreen(ctx, rerender, go) {
  const s = ctx.sitter;
  const patch = {};
  const f = (label, key, ph) => field(label, {
    type: 'text', placeholder: ph, value: s[key] || '',
    oninput: e => { patch[key] = e.target.value; },
  });
  const publicUrl = `${shareOrigin()}/s/${s.invite_slug}`;
  const inq = ctx.inquiries || [];

  return {
    title: '내 프로필',
    back: go ? () => go('home') : null,
    right: { label: '로그아웃', on: async () => { await sb.auth.signOut(); location.reload(); } },
    body: [
      card([
        el('div', { class: 'profhead' }, [
          el('label', { class: 'avaedit' }, [
            el('div', { class: 'avatar' + (s.photo_url ? ' hasimg' : ''), style: s.photo_url ? `background-image:url(${s.photo_url})` : null }),
            el('span', { class: 'avacam', text: '＋' }),
            el('input', { type: 'file', accept: 'image/*', 'aria-label': '프로필 사진 변경',
              onchange: async e => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;
                try {
                  flash('사진 올리는 중…');
                  const url = await uploadAvatar(file);
                  ctx.sitter = await saveSitter(s.id, { photo_url: url });
                  flash('사진을 바꿨어요');
                  rerender();
                } catch (err) { flash('사진 업로드 실패', err.message); }
              } }),
          ]),
          el('div', { class: 'pcol' }, [
            el('div', { class: 'h', text: s.name }),
            el('div', { class: 'sub', text: [s.type, s.region].filter(Boolean).join(' · ') || '정보를 채워주세요' }),
            el('div', { class: 'sub', text: s.photo_url ? '사진을 누르면 바꿀 수 있어요' : '보호자가 초대장에서 보는 사진이에요' }),
          ]),
        ]),
      ]),
      card([
        el('div', { class: 'h', text: '보호자에게 보이는 정보' }),
        f('이름', 'name', '예) 박서준'),
        f('서비스 유형', 'type', '예) 방문 돌봄'),
        f('활동 지역', 'region', '예) 서울 마포구'),
        f('기본 약속 장소', 'addr', '예) 서울 마포구 월드컵북로 12'),
        f('장소 상세', 'addr_detail', '예) 1층 카페 앞'),
        f('한 줄 소개', 'bio', '예) 기록으로 신뢰를 쌓습니다'),
        field('앱 밖에서 마친 돌봄 (건)', { name: 'offsite', type: 'number', inputmode: 'numeric',
          value: s.offsite_done ?? 0,
          oninput: e => { patch.offsite_done = Number(e.target.value) || 0; } }),
        el('div', { class: 'sub', text: '당근 알바 등 이 앱을 쓰기 전에 마친 건수입니다. 프로필의 「약속 이행」에 함께 셉니다.' }),
      ]),
      el('div', { class: 'hgrid' }, [
        el('button', { class: 'add', text: '돌봄 일기', onclick: () => go('books') }),
        el('button', { class: 'add', text: '가져온 후기', onclick: () => go('imported') }),
      ]),

      card([
        el('div', { class: 'h', text: '공개 프로필 링크' }),
        el('div', { class: 'sub', text: 'SNS·당근 소개글에 이 주소를 올리면, 본 사람이 바로 의뢰를 보낼 수 있어요. 주소와 연락처는 공개되지 않습니다.' }),
        el('input', { class: 'linkinput', name: 'publiclink', readonly: 'readonly', value: publicUrl,
          onclick: e => e.target.select() }),
        el('div', { class: 'hgrid' }, [
          el('button', { class: 'ctasm', text: '링크 복사', onclick: async () => {
            flash(await copyText(publicUrl) ? '복사했어요' : '길게 눌러 복사해주세요');
          } }),
          el('button', { class: 'ctasm', text: '미리 보기', onclick: () => window.open(publicUrl, '_blank') }),
        ]),
      ]),

      card([
        el('div', { class: 'h', text: `받은 의뢰${inq.length ? ` · ${inq.filter(q => !q.handled).length}건 대기` : ''}` }),
        inq.length ? el('div', { class: 'rows' }, inq.map(q => el('div', { class: 'prow' }, [
          el('div', { class: 'phead' }, [
            el('span', { class: 'tk', text: q.contact }),
            el('span', { class: 'sub', text: new Date(q.at).toLocaleDateString('ko-KR') }),
          ]),
          q.pet_name ? el('div', { class: 'ptext', text: `아이 · ${q.pet_name}` }) : null,
          q.when_text ? el('div', { class: 'ptext', text: `원하는 시기 · ${q.when_text}` }) : null,
          q.msg ? el('div', { class: 'ptext', text: q.msg }) : null,
          el('div', { class: 'hgrid' }, [
            q.handled ? null : el('button', { class: 'ctasm', text: '이 의뢰로 준비하기',
              onclick: () => { ctx.fromInquiry = q; ctx.form = null; go('newContract'); } }),
            el('button', { class: 'seecap', text: q.handled ? '처리됨 · 되돌리기' : '처리함으로 표시',
              onclick: async () => { await markInquiry(q.id, !q.handled); ctx.inquiries = await listInquiries(); rerender(); } }),
          ]),
        ]))) : el('div', { class: 'sub', text: '아직 받은 의뢰가 없어요.' }),
      ]),
    ],
    foot: [el('button', {
      class: 'cta', text: '저장',
      onclick: async () => {
        if (!Object.keys(patch).length) { flash('바뀐 내용이 없어요'); return; }
        try {
          ctx.sitter = await saveSitter(s.id, patch);
          flash('저장했어요', '새로고침해도 유지됩니다.');
          rerender();
        } catch (e) { flash('저장 실패', e.message); }
      },
    })],
    hint: '공개 링크로 들어온 사람에게는 이름·소개·회계 숫자만 보입니다.',
  };
}
