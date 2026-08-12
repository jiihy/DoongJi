// Supabase 쿼리 빌더는 then만 있고 catch가 없다 — 쓰기 함수는 async로 감싼다 (44차 참고)
import { sb } from '../lib/supabase.js';
import { prepare } from '../lib/photo.js';

const SEL = `id, start_date, end_date, confirmed_at, sent_at, finished_at,
  handoff_start_time, handoff_start_by, handoff_end_time, handoff_end_by,
  owner_place_addr, owner_place_detail, owner_id,
  sitters(id, name, type, region, bio, addr, addr_detail, photo_url),
  owners(nickname),
  contract_pets(pets(id, name, age, extra))`;

// 시터가 여는 계약 상세 — 보호자 화면(loadContract)과 같은 모양으로 맞춘다
export async function loadCare(contractId) {
  const { data, error } = await sb.from('contracts').select(SEL).eq('id', contractId).single();
  if (error) throw error;
  return hydrate(data);
}

export async function hydrate(contract) {
  const [{ data: items }, { data: notes }] = await Promise.all([
    sb.from('schedule_items').select('*').eq('contract_id', contract.id).order('sort_key'),
    sb.from('care_notes').select('*').eq('owner_id', contract.owner_id).order('created_at'),
  ]);
  const ids = (items || []).map(i => i.id);
  let proofs = [];
  if (ids.length) {
    const { data } = await sb.from('proofs')
      .select('*, verdicts(*), seens(*)')
      .in('schedule_item_id', ids);
    proofs = data || [];
  }
  const { data: extras } = await sb.from('extras')
    .select('*, extra_photos(*)').eq('contract_id', contract.id).order('at');

  const byItem = Object.fromEntries(proofs.map(p => [p.schedule_item_id, {
    ...p,
    verdict: Array.isArray(p.verdicts) ? (p.verdicts[0] || null) : (p.verdicts || null),
    seen:    Array.isArray(p.seens)    ? (p.seens[0]    || null) : (p.seens    || null),
  }]));
  return {
    ...contract,
    pets: (contract.contract_pets || []).map(cp => cp.pets),
    items: (items || []).map(i => ({ ...i, proof: byItem[i.id] || null })),
    notes: notes || [],
    extras: extras || [],
  };
}

// 사진은 계약 폴더 아래로 — 파일명이 겹치지 않게 항목 id와 순번을 쓴다
// 올리기 전에 시각을 픽셀에 굽는다(prepare) — 나중에 다른 사진으로 바꾸면 워터마크가 안 맞는다
export async function uploadPhoto(contractId, itemId, slot, file) {
  const { blob, at, stamp } = await prepare(file, { burn: true, tag: '앱 촬영' });
  const path = `${contractId}/${itemId}-${slot}-${stampKey()}.jpg`;
  const { error } = await sb.storage.from('proofs').upload(path, blob, { contentType: 'image/jpeg' });
  if (error) throw error;
  return { url: sb.storage.from('proofs').getPublicUrl(path).data.publicUrl, at, stamp };
}
const stampKey = () => new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);

/* ── 먼저 챙긴 순간 — 일정 밖의 기록. 약속 회계에는 들어가지 않는다 ── */
// 앨범에서 고른 사진은 찍힌 시각을 보증할 수 없다 → is_album으로 구분해 화면에 그대로 표기한다
export async function addExtra(contractId, text, photos) {
  const { data: extra, error } = await sb.from('extras')
    .insert({ contract_id: contractId, at: new Date().toISOString(), text: text || null })
    .select().single();
  if (error) throw error;
  if (photos.length) {
    const { error: e2 } = await sb.from('extra_photos').insert(photos.map(ph => ({
      extra_id: extra.id, url: ph.url, is_album: !!ph.album, stamp: ph.stamp || null,
    })));
    if (e2) throw e2;
  }
  return extra;
}
export const delExtra = async id => { await sb.from('extras').delete().eq('id', id).throwOnError(); };
export const thankExtra = async (id, reaction) => {
  await sb.from('extras').update({ thanks_at: new Date().toISOString(), thanks_reaction: reaction })
    .eq('id', id).throwOnError();
};

// 앨범 사진은 찍힌 시각을 보증할 수 없다 → 굽지 않고 태그만 붙인다
export async function uploadExtraPhoto(contractId, file, album) {
  const { blob, stamp } = await prepare(file, { burn: !album, tag: '앱 촬영' });
  const path = `${contractId}/${stampKey()}-${Math.floor(performance.now())}.jpg`;
  const { error } = await sb.storage.from('extras').upload(path, blob, { contentType: 'image/jpeg' });
  if (error) throw error;
  return { url: sb.storage.from('extras').getPublicUrl(path).data.publicUrl, album, stamp };
}

export async function submitProof(itemId, row) {
  const { data, error } = await sb.from('proofs')
    .upsert({ schedule_item_id: itemId, ...row }, { onConflict: 'schedule_item_id' })
    .select('*, verdicts(*), seens(*)').single();
  if (error) throw error;
  return data;
}

// 예정 시각 + 여유를 넘겨 올렸는가 (표시만 한다 — 벌점은 없다)
export function lateOf(item, at = new Date()) {
  if (!item.at_time || item.fuzz_min < 0) return false;
  const [h, m] = item.at_time.split(':').map(Number);
  const due = new Date(at); due.setHours(h, m + (item.fuzz_min || 0), 0, 0);
  return at > due;
}

/* ── 알림 종 ── */
// 이벤트는 트리거가 쓴다(마이그레이션 16) — 클라이언트는 읽고 읽음 표시만 한다
export async function listEvents(audience, contractId) {
  let q = sb.from('events').select('*').eq('audience', audience).order('at', { ascending: false }).limit(50);
  if (contractId) q = q.eq('contract_id', contractId);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}
export const readEvents = async (ids) => {
  if (!ids.length) return;
  await sb.from('events').update({ read_at: new Date().toISOString() }).in('id', ids).throwOnError();
};

// 화면을 연 것 자체가 열람이다 — 보호자가 따로 누를 필요 없이 시각만 남긴다
export const markSeen = async (proofIds) => {
  if (!proofIds.length) return;
  await sb.from('seens').upsert(proofIds.map(id => ({ proof_id: id, kind: 'view' })),
    { onConflict: 'proof_id', ignoreDuplicates: true }).throwOnError();
};

/* ── F12 돌봄 마치기 · F13 돌봄 일기 ── */
// finished_at은 전 항목이 기록된 뒤에만 들어간다 — 서버 트리거(guard_finish)가 막는다
export async function finishCare(contractId) {
  const { error } = await sb.from('contracts')
    .update({ finished_at: new Date().toISOString() }).eq('id', contractId);
  if (error) throw error;
}

// 아이당 한 권(unique sitter_id, pet_id) · 계약당 한 편(unique book_id, contract_id)
export async function ensureBook(sitterId, petId) {
  const { data: found } = await sb.from('diary_books')
    .select('id').eq('sitter_id', sitterId).eq('pet_id', petId).maybeSingle();
  if (found) return found.id;
  const { data, error } = await sb.from('diary_books')
    .insert({ sitter_id: sitterId, pet_id: petId }).select('id').single();
  if (error) throw error;
  return data.id;
}

export async function writeEntry(sitterId, petId, contractId, text) {
  const bookId = await ensureBook(sitterId, petId);
  const { error } = await sb.from('diary_entries')
    .insert({ book_id: bookId, contract_id: contractId, text });
  if (error) {
    if (error.code === '23505') throw new Error('이 돌봄의 후기는 이미 쓰셨어요');
    throw error;
  }
}

// 이 계약에서 이미 후기를 쓴 아이
export async function writtenPets(sitterId, contractId) {
  const { data } = await sb.from('diary_entries')
    .select('diary_books(pet_id)').eq('contract_id', contractId);
  return (data || []).map(r => r.diary_books?.pet_id).filter(Boolean);
}

export async function listBooks(sitterId) {
  const { data, error } = await sb.from('diary_books')
    .select('id, created_at, pets(id, name), diary_entries(id, text, written_at, contract_id)')
    .eq('sitter_id', sitterId).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export const setRecordPublic = async (contractId, on) => {
  await sb.from('contracts').update({ record_public: on }).eq('id', contractId).throwOnError();
};
