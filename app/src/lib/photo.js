// 인증 사진: 앱에서 찍은 그 순간의 날짜·시각을 이미지에 굽는다.
// 나중에 다른 사진을 올리면 워터마크가 없거나 시각이 안 맞는다.
// (프로토타입은 localStorage 5MB 때문에 320px로 줄였다. Storage를 쓰는 지금은 1280px.)
const MAX = 1280;

const stampText = (d = new Date()) => {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

export function prepare(file, { burn = true, tag = '앱 촬영' } = {}) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(new Error('사진을 읽지 못했어요'));
    fr.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('사진을 열지 못했어요'));
      img.onload = () => {
        const sc = Math.min(1, MAX / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * sc);
        c.height = Math.round(img.height * sc);
        const x = c.getContext('2d');
        x.drawImage(img, 0, 0, c.width, c.height);

        const at = new Date();
        if (burn) {
          const h = Math.max(22, Math.round(c.height * 0.075));
          const fs = Math.max(11, Math.round(h * 0.46));
          x.fillStyle = 'rgba(0,0,0,0.55)';
          x.fillRect(0, c.height - h, c.width, h);
          x.fillStyle = '#fff';
          x.font = `600 ${fs}px -apple-system, system-ui, sans-serif`;
          x.textBaseline = 'middle';
          x.fillText(stampText(at), Math.round(h * 0.35), c.height - h / 2);
          x.textAlign = 'right';
          x.fillText(tag, c.width - Math.round(h * 0.35), c.height - h / 2);
          x.textAlign = 'left';
        }
        c.toBlob(b => b ? resolve({ blob: b, at: at.toISOString(), stamp: burn ? stampText(at) : null })
                        : reject(new Error('사진을 변환하지 못했어요')), 'image/jpeg', 0.82);
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}
