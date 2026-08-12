// 프로토타입의 렌더 문법을 그대로 가져온다 — 검증된 UI를 다시 짜지 않는다
export const el = (tag, attrs = {}, kids = []) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k === 'value') n.value = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (v !== null && v !== false && v !== undefined) n.setAttribute(k, v);
  }
  (Array.isArray(kids) ? kids : [kids]).filter(Boolean).forEach(c => n.appendChild(c));
  return n;
};
export const card = kids => el('div', { class: 'card' }, kids);
export const field = (label, attrs = {}) => el('div', { class: 'field' }, [
  label ? el('label', { text: label }) : null,
  el('input', { name: attrs.name || `f_${label || ''}`.replace(/\s/g, ''), ...attrs }),
]);

// http(LAN)에선 navigator.clipboard가 막힌다 — execCommand로 폴백하고, 그것도 막히면 선택 상태로 남긴다
export async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) {}
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
    document.body.appendChild(ta);
    ta.select(); ta.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch (e) { return false; }
}

let toastTimer = null;
export function flash(title, desc) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const t = el('div', { class: 'toast' }, [
    el('span', { class: 't', text: title }),
    desc ? el('span', { class: 'd', text: desc }) : null,
  ]);
  document.body.appendChild(t);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.remove(), 2200);
}

// 화면 함수는 { title, body[], foot[], hint }를 반환한다 (프로토타입과 동일)
export function paint(view) {
  const app = document.getElementById('app');
  // 다시 그릴 때 입력 중이던 포커스·커서·스크롤을 잃지 않게 한다 (튕김 방지)
  const act = document.activeElement;
  const keep = act && act.name ? { name: act.name, pos: act.selectionStart } : null;
  const scroll = window.scrollY;
  app.replaceChildren(...[
    el('div', { class: 'nav' }, [
      view.back ? el('button', { class: 'navback', text: '‹', onclick: view.back }) : el('span', { class: 'sp' }),
      el('span', { class: 'navt', text: view.title || '' }),
      view.right ? el('button', { class: 'navr', text: view.right.label, onclick: view.right.on }) : el('span', { class: 'sp' }),
    ]),
    el('div', { class: 'body' }, (view.body || []).filter(Boolean)),
    (view.foot || []).filter(Boolean).length ? el('div', { class: 'foot' }, view.foot.filter(Boolean)) : null,
    view.hint ? el('div', { class: 'hint', text: view.hint }) : null,
  ].filter(Boolean));

  if (keep) {
    const next = app.querySelector(`[name="${CSS.escape(keep.name)}"]`);
    if (next) {
      next.focus({ preventScroll: true });
      try { next.setSelectionRange(keep.pos, keep.pos); } catch (e) {}
    }
  }
  window.scrollTo({ top: scroll });
}
