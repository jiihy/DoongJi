import { el, card } from '../el.js';
import { icon } from '../../lib/icons.js';

const when = ts => {
  const d = new Date(ts), now = new Date();
  const same = d.toDateString() === now.toDateString();
  const t = d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  return same ? t : `${d.getMonth() + 1}.${d.getDate()} ${t}`;
};

// 종 버튼 — 안 읽은 수를 배지로 얹는다 (시안 v2와 같은 alert 아이콘 20px)
export const bellButton = (count, onClick) => el('button', { class: 'bell', onclick: onClick,
  'aria-label': count ? `알림 ${count}건` : '알림' }, [
  icon('alert', 20),
  count ? el('span', { class: 'bbadge', text: count > 9 ? '9+' : String(count) }) : null,
]);

export function bellScreen(events, back, title, empty, opts = {}) {
  const label = opts.label || (() => null);
  const onPick = opts.onPick || null;
  const unread = events.filter(e => !e.read_at);
  return {
    title: title || '알림',
    back,
    body: [
      unread.length ? el('div', { class: 'ding' }, [
        el('span', { class: 't', text: `새 알림 ${unread.length}건` }),
        el('span', { class: 'd', text: '확인하지 않아도 불이익은 없어요. 기록은 그대로 남습니다.' }),
      ]) : null,
      card([
        el('div', { class: 'h', text: '알림' }),
        events.length ? el('div', { class: 'rows' }, events.map(e => {
          const who = label(e);
          const kids = [
            el('div', { class: 'lrmain' }, [
              el('div', { class: 'lrtitle' }, [
                el('span', { text: e.text }),
                !e.read_at ? el('span', { class: 'badge', text: 'NEW' }) : null,
              ]),
              el('div', { class: 'sub', text: [who, when(e.at)].filter(Boolean).join(' · ') }),
            ]),
            onPick ? el('span', { class: 'chev', text: '›' }) : null,
          ];
          return onPick
            ? el('button', { class: 'listrow', onclick: () => onPick(e) }, kids)
            : el('div', { class: 'listrow' }, kids);
        })) : el('div', { class: 'sub', text: empty || '아직 알림이 없어요.' }),
      ]),
    ],
    hint: '알림은 서버가 남깁니다 — 앱을 안 켜둬도 쌓입니다.',
  };
}
