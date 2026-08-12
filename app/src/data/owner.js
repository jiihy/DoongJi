import { sb, inviteToken } from '../lib/supabase.js';

// 보호자(무계정)가 토큰으로 자기 계약 하나만 읽는다 — 범위는 RLS가 강제한다
export async function loadContract() {
  const { data, error } = await sb.from('contracts')
    .select(`id, start_date, end_date, confirmed_at, sent_at, finished_at,
             handoff_start_time, handoff_start_by, handoff_end_time, handoff_end_by,
             owner_place_addr, owner_place_detail, owner_id,
             sitters(name, type, region, bio, addr, addr_detail, photo_url),
             owners(nickname),
             contract_pets(pets(id, name, age, extra))`)
    .eq('invite_token', inviteToken).single();
  if (error) throw error;

  const [{ data: items }, { data: notes }] = await Promise.all([
    sb.from('schedule_items').select('*').eq('contract_id', data.id).order('sort_key'),
    sb.from('care_notes').select('*').eq('owner_id', data.owner_id).order('created_at'),
  ]);
  return { ...data, pets: (data.contract_pets || []).map(cp => cp.pets), items: items || [], notes: notes || [] };
}

export const savePet   = (id, patch) => sb.from('pets').update(patch).eq('id', id).throwOnError();
export const saveContract = (id, patch) => sb.from('contracts').update(patch).eq('id', id).throwOnError();
export const confirmContract = id => saveContract(id, { confirmed_at: new Date().toISOString() });
export const sendSchedule    = id => saveContract(id, { sent_at: new Date().toISOString() });

export const addItem = (contractId, petId, row) =>
  sb.from('schedule_items').insert({ contract_id: contractId, pet_id: petId, ...row }).select().single();
export const saveItem = (id, patch) => sb.from('schedule_items').update(patch).eq('id', id).throwOnError();
export const delItem  = id => sb.from('schedule_items').delete().eq('id', id).throwOnError();

export const addNote = (ownerId, row) =>
  sb.from('care_notes').insert({ owner_id: ownerId, ...row }).select().single();
export const delNote = id => sb.from('care_notes').delete().eq('id', id).throwOnError();
