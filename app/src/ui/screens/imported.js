import { el, card, field, flash } from '../el.js';
import { addImported, delImported, uploadCapture } from '../../data/sitter.js';

// 캡처 없이는 등록되지 않는다 — 「본인이 올림」이라도 근거는 남긴다
export function importedScreen(ctx, go, rerender, reload) {
  const d = ctx.impDraft = ctx.impDraft || { source: '당근 알바', text: '', review_date: '', reviewed_at: '', capture_url: null, busy: false };
  const list = ctx.imported || [];

  return {
    title: '가져온 후기',
    back: () => go('profile'),
    body: [
      card([
        el('span', { class: 'unver', text: 'ⓘ 이 서비스가 확인하지 않음' }),
        el('div', { class: 'h', text: '다른 곳에서 받은 후기 담기' }),
        el('div', { class: 'sub', text: '당근·카톡 등에서 받은 후기를 캡처와 함께 올립니다. 공개 프로필에 「본인이 올림」으로 표시되고, 이 서비스가 확인한 기록과 섞이지 않습니다.' }),
        field('출처', { name: 'imp_source', value: d.source, placeholder: '예) 당근 알바',
          oninput: e => { d.source = e.target.value; } }),
        field('날짜 표기 (선택)', { name: 'imp_date', value: d.review_date, placeholder: '예) 2개월 전 · 6/26 돌봄',
          oninput: e => { d.review_date = e.target.value; } }),
        field('정렬용 날짜 (선택)', { name: 'imp_at', type: 'date', value: d.reviewed_at || '',
          onchange: e => { d.reviewed_at = e.target.value; } }),
        el('textarea', { name: 'imp_text', placeholder: '후기 내용을 옮겨 적어주세요',
          value: d.text, oninput: e => { d.text = e.target.value; rerender(); } }),

        d.capture_url ? el('img', { class: 'capture', src: d.capture_url, alt: '캡처' }) : null,
        el('label', { class: 'shotadd' }, [
          el('span', { text: d.capture_url ? '캡처 다시 고르기' : '＋ 캡처 올리기 (필수)' }),
          el('input', { type: 'file', accept: 'image/*', onchange: async e => {
            const f = e.target.files && e.target.files[0];
            if (!f) return;
            d.busy = true; rerender();
            try { d.capture_url = await uploadCapture(ctx.sitter.id, f); }
            catch (err) { flash('업로드 실패', err.message); }
            d.busy = false; rerender();
          } }),
        ]),

        el('button', { class: 'cta', disabled: d.busy || !d.capture_url || !d.text.trim(),
          text: d.busy ? '올리는 중…' : (d.capture_url ? '담기' : '캡처 없이는 담을 수 없어요'),
          onclick: async () => {
            try {
              await addImported(ctx.sitter.id, {
                source: d.source.trim() || null, text: d.text.trim(),
                review_date: d.review_date.trim() || null, capture_url: d.capture_url,
                reviewed_at: d.reviewed_at || null,
              });
              ctx.impDraft = null;
              flash('담았어요', '공개 프로필에 표시됩니다.');
              await reload(); rerender();
            } catch (e) { flash('저장 실패', e.message); }
          } }),
      ]),

      list.length ? card([
        el('div', { class: 'h', text: `담은 후기 ${list.length}건` }),
        ...list.map(v => el('div', { class: 'imp' }, [
          el('div', { class: 'top' }, [
            el('span', { class: 'src', text: v.source || '출처 미기재' }),
            el('span', { class: 'date', text: v.review_date || '' }),
          ]),
          v.text ? el('div', { class: 'q', text: '“' + v.text + '”' }) : null,
          v.capture_url ? el('img', { class: 'capture', src: v.capture_url, alt: '캡처' }) : null,
          el('button', { class: 'linkbtn', text: '삭제',
            onclick: async () => { await delImported(v.id); await reload(); rerender(); } }),
        ])),
      ]) : null,
    ],
  };
}
