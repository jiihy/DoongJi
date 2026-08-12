// 항목마다 무엇을 찍을지가 정해져 있다 — 시터가 고를 대상이 없다 (프로토타입 KINDS 그대로)
export const KINDS = {
  meal:  { name: '밥',   shoot: '밥그릇을 찍어주세요' },
  walk:  { name: '산책', shoot: '출발할 때와 돌아왔을 때 한 장씩 · 아이가 보이게', pair: true,
           cap1: '산책 출발!', cap2: '산책 완료!' },
  poop:  { name: '배변', shoot: '배변 패드를 찍어주세요' },
  med:   { name: '약',   shoot: '약 먹은 뒤 한 장 · 아이가 보이게' },
  play:  { name: '놀이', shoot: '노는 모습 한 장 · 아이가 보이게' },
  sleep: { name: '취침', shoot: '잠자리에 든 모습 한 장' },
};

// 커스텀 카테고리는 'c:이름'으로 저장한다 (별도 테이블 없이 특이사항 안에 산다)
export const kindName = k =>
  k === 'all' ? '공통' : String(k).startsWith('c:') ? String(k).slice(2) : (KINDS[k]?.name || k);

// 두 컷의 촬영 시각 차이가 곧 「밖에 있던 시간」이다 — 시터가 고칠 수 없는 사실
export const outMinutes = p => {
  if (!p?.shot_at || !p?.shot2_at) return null;
  const d = (new Date(p.shot2_at) - new Date(p.shot_at)) / 60000;
  return d > 0 ? Math.round(d) : null;
};
