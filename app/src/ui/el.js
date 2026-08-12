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
export const field = (label, attrs) => el('div', { class: 'field' }, [
  el('label', { text: label }), el('input', attrs),
]);

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
}
