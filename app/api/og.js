// 카카오·SNS 크롤러는 JS를 돌리지 않는다 — SPA 한 장으로는 링크마다 다른 미리보기를 만들 수 없다.
// /s/<slug>, /r/<token> 요청만 이 함수를 거쳐 정적 index.html에 og 태그를 갈아 끼운다.
const esc = (v) => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const SB_URL = 'https://maipblnldvmvttfjbmsc.supabase.co';
const SB_KEY = 'sb_publishable_W_2Ry1BgRQFu9QRswvi3iA_jMQ1Dzvy';

async function rpc(fn, body) {
  const url = process.env.VITE_SUPABASE_URL || SB_URL;
  const key = process.env.VITE_SUPABASE_KEY || SB_KEY;
  try {
    const r = await fetch(`${url}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

export default async function handler(req, res) {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const origin = `https://${host}`;
  const { type, id } = req.query;

  let title = '둥지 — 돌봄 기록';
  let desc = '약속한 것을 사진과 시각으로 남깁니다. 말이 아니라 기록으로 남는 펫시팅.';
  let image = `${origin}/app-icon-512.png?v=5`;
  let path = '/';

  if (type === 's' && id) {
    const p = await rpc('sitter_public', { p_slug: id });
    path = `/s/${id}`;
    if (p) {
      const st = p.stats || {};
      const total = Number(st.total || 0) + Number(p.offsite_done || 0);
      const done = Number(st.submitted || 0) + Number(p.offsite_done || 0);
      title = `${p.name} 펫시터 · 둥지`;
      desc = [p.type, p.region].filter(Boolean).join(' · ')
        + (total ? ` · 약속 이행 ${Math.round((done / total) * 100)}% (${done}/${total}건)` : '')
        + (p.bio ? ` — ${p.bio}` : '');
      if (p.photo_url) image = p.photo_url;
    }
  } else if (type === 'r' && id) {
    const r = await rpc('public_record', { p_token: id });
    path = `/r/${id}`;
    if (r) {
      const pets = (r.pets || []).join(' · ');
      title = `${pets} 돌봄 기록 · ${r.sitter?.name} 시터`;
      desc = `${(r.start_date || '').replaceAll('-', '.')} ~ ${(r.end_date || '').replaceAll('-', '.')} · 보호자가 공개에 동의한 읽기 전용 기록입니다.`;
      if (r.sitter?.photo_url) image = r.sitter.photo_url;
    } else {
      title = '열 수 없는 기록입니다 · 둥지';
      desc = '보호자가 공개에 동의한 기록만 열립니다.';
    }
  }

  let html = '';
  try {
    html = await (await fetch(`${origin}/index.html`)).text();
  } catch {
    res.status(302).setHeader('Location', path).end();
    return;
  }

  const tags = [
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:image" content="${esc(image)}">`,
    `<meta property="og:url" content="${esc(origin + path)}">`,
    `<meta name="twitter:title" content="${esc(title)}">`,
    `<meta name="twitter:description" content="${esc(desc)}">`,
    `<meta name="twitter:image" content="${esc(image)}">`,
  ].join('\n');

  html = html
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<meta property="og:title"[^>]*>/, '')
    .replace(/<meta property="og:description"[^>]*>/, '')
    .replace(/<meta property="og:image"[^>]*>/, '')
    .replace('</head>', `${tags}\n</head>`);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400');
  res.status(200).send(html);
}
