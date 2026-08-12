// Supabase 쿼리 빌더는 then만 있고 catch가 없다 — 쓰기 함수는 async로 감싼다 (44차 참고)
import { sb } from '../lib/supabase.js';

const SEL = `id, start_date, end_date, confirmed_at, sent_at, finished_at,
  handoff_start_time, handoff_start_by, handoff_end_time, handoff_end_by,
  owner_place_addr, owner_place_detail, owner_id,
  sitters(name, type, region, bio, addr, addr_detail, photo_url),
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
  const byItem = Object.fromEntries(proofs.map(p => [p.schedule_item_id, p]));
  return {
    ...contract,
    pets: (contract.contract_pets || []).map(cp => cp.pets),
    items: (items || []).map(i => ({ ...i, proof: byItem[i.id] || null })),
    notes: notes || [],
  };
}

// 사진은 계약 폴더 아래로 — 파일명이 겹치지 않게 항목 id와 순번을 쓴다
export async function uploadPhoto(contractId, itemId, slot, file) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${contractId}/${itemId}-${slot}-${stampKey()}.${ext}`;
  const { error } = await sb.storage.from('proofs').upload(path, file, { contentType: file.type });
  if (error) throw error;
  return sb.storage.from('proofs').getPublicUrl(path).data.publicUrl;
}
const stampKey = () => new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);

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
