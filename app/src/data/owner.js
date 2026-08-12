// Supabase 쿼리 빌더는 then만 있고 catch가 없다 — 붙여놓고 잊는 호출(.catch)이 조용히 죽는다.
// 그래서 쓰기 함수는 모두 async로 감싸 진짜 Promise를 돌려준다.
import { sb, inviteToken } from '../lib/supabase.js';
import { hydrate } from './care.js';

// 보호자(무계정)가 토큰으로 자기 계약 하나만 읽는다 — 범위는 RLS가 강제한다
export async function loadContract() {
  const { data, error } = await sb.from('contracts')
    .select(`id, start_date, end_date, confirmed_at, sent_at, finished_at,
             handoff_start_time, handoff_start_by, handoff_end_time, handoff_end_by,
             owner_place_addr, owner_place_detail, owner_id, record_public, record_token,
             sitters(id, name, type, region, bio, addr, addr_detail, photo_url, invite_slug),
             owners(nickname),
             contract_pets(pets(id, name, age, extra))`)
    .eq('invite_token', inviteToken).single();
  if (error) throw error;
  return hydrate(data);          // 일정·특이사항·인증을 시터 쪽과 같은 모양으로 붙인다
}

// 공개 프로필 — 주소·연락처는 서버가 빼고 내준다 (마이그레이션 15)
export async function publicProfile(slug) {
  const { data, error } = await sb.rpc('sitter_public', { p_slug: slug });
  if (error) throw error;
  return data;
}
export async function sendInquiry(slug, contact, when, msg, pet) {
  const { data, error } = await sb.rpc('send_inquiry',
    { p_slug: slug, p_contact: contact, p_when: when || null, p_msg: msg || null, p_pet: pet || null });
  if (error) throw error;
  return data;
}

// 공개 돌봄 기록 — 동의한 계약만 서버가 내준다 (마이그레이션 25)
export async function publicRecord(token) {
  const { data, error } = await sb.rpc('public_record', { p_token: token });
  if (error) throw error;
  return data;
}
export const setRecordPublic = async (contractId, on) => {
  const { error } = await sb.from('contracts').update({ record_public: on }).eq('id', contractId);
  if (error) throw error;
};

// 시터 프로필의 숫자 — 개별 행이 아니라 집계만 서버가 내준다 (마이그레이션 14)
export async function sitterStats(sitterId) {
  const { data, error } = await sb.rpc('sitter_stats', { p_sitter: sitterId });
  if (error) throw error;
  return data;
}

export const savePet   = async (id, patch) => { await sb.from('pets').update(patch).eq('id', id).throwOnError(); };
export const saveContract = async (id, patch) => { await sb.from('contracts').update(patch).eq('id', id).throwOnError(); };
export const confirmContract = id => saveContract(id, { confirmed_at: new Date().toISOString() });
export const sendSchedule    = id => saveContract(id, { sent_at: new Date().toISOString() });

export const addItem = (contractId, petId, row) =>
  sb.from('schedule_items').insert({ contract_id: contractId, pet_id: petId, ...row }).select().single();
export const saveItem = async (id, patch) => { await sb.from('schedule_items').update(patch).eq('id', id).throwOnError(); };
export const delItem  = async id => { await sb.from('schedule_items').delete().eq('id', id).throwOnError(); };

export const addNote = (ownerId, row) =>
  sb.from('care_notes').insert({ owner_id: ownerId, ...row }).select().single();
export const delNote = async id => { await sb.from('care_notes').delete().eq('id', id).throwOnError(); };
export const saveNote = async (id, patch) => { await sb.from('care_notes').update(patch).eq('id', id).throwOnError(); };
