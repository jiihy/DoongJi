import { sb, inviteToken } from './supabase.js';

const b64ToU8 = (b64) => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
};
const keyOf = (sub, name) => btoa(String.fromCharCode(...new Uint8Array(sub.getKey(name))))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export const pushSupported = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

// iOS는 홈 화면에 추가한 상태에서만 웹 푸시를 준다
export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
export const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent);

export async function enablePush({ audience, sitterId, contractId }) {
  if (!pushSupported()) throw new Error('이 브라우저는 알림을 지원하지 않아요');
  if (isIOS() && !isStandalone()) throw new Error('홈 화면에 추가한 뒤에 알림을 켤 수 있어요');

  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('알림이 허용되지 않았어요');

  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  const { data: vapid, error: e1 } = await sb.rpc('vapid_public_key');
  if (e1 || !vapid) throw new Error('알림 키를 가져오지 못했어요');

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: b64ToU8(vapid),
    });
  }

  const row = {
    audience,
    sitter_id: audience === 'sitter' ? sitterId : null,
    contract_id: audience === 'owner' ? contractId : null,
    endpoint: sub.endpoint,
    p256dh: keyOf(sub, 'p256dh'),
    auth: keyOf(sub, 'auth'),
  };
  const { error } = await sb.from('push_subscriptions').upsert(row, { onConflict: 'endpoint' });
  if (error) throw error;
  return true;
}

export async function pushState() {
  if (!pushSupported()) return 'unsupported';
  if (isIOS() && !isStandalone()) return 'needs-install';
  if (Notification.permission === 'granted') {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg && await reg.pushManager.getSubscription();
    return sub ? 'on' : 'off';
  }
  return Notification.permission === 'denied' ? 'denied' : 'off';
}

export { inviteToken };
