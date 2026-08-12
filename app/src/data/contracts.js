import { sb, shareOrigin } from '../lib/supabase.js';

// 고객 장부 — 시터가 만든 owners(+pets). 보호자는 계속 무계정이다
export async function listClients(sitterId) {
  const { data, error } = await sb
    .from('owners')
    .select('id, nickname, created_at, pets(id, name, age, extra)')
    .eq('sitter_id', sitterId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function listContracts(sitterId) {
  const { data, error } = await sb
    .from('contracts')
    .select(`id, invite_token, start_date, end_date, sent_at, confirmed_at, finished_at,
             owners(nickname), contract_pets(pets(name))`)
    .eq('sitter_id', sitterId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// 계약 준비: 고객·아이·기간·픽드롭을 한 번에 만든다 (아이는 기존 고객이면 재사용)
export async function createContract(sitterId, form) {
  let ownerId = form.ownerId;
  if (!ownerId) {
    const { data, error } = await sb.from('owners')
      .insert({ sitter_id: sitterId, nickname: form.nickname })
      .select('id').single();
    if (error) throw error;
    ownerId = data.id;
  }

  let petIds = form.petIds || [];
  if (!petIds.length) {
    const rows = form.pets
      .filter(p => (p.name || '').trim())
      .map(p => ({ owner_id: ownerId, name: p.name.trim(), age: (p.age || '').trim(), extra: (p.extra || '').trim() }));
    const { data, error } = await sb.from('pets').insert(rows).select('id');
    if (error) throw error;
    petIds = data.map(r => r.id);
  }

  const { data: contract, error: e2 } = await sb.from('contracts').insert({
    sitter_id: sitterId, owner_id: ownerId,
    start_date: form.start, end_date: form.end,
    handoff_start_time: form.startTime, handoff_start_by: form.startBy,
    handoff_end_time: form.endTime, handoff_end_by: form.endBy,
  }).select('id, invite_token').single();
  if (e2) throw e2;

  const { error: e3 } = await sb.from('contract_pets')
    .insert(petIds.map(pid => ({ contract_id: contract.id, pet_id: pid })));
  if (e3) throw e3;

  // 일정 초안 — 시터가 미리 채워 보내면 보호자는 확인만 하면 된다 (아이마다 같은 항목)
  const draft = (form.items || []).filter(i => i.kind);
  if (draft.length) {
    const rows = [];
    petIds.forEach(pid => draft.forEach((it, i) => rows.push({
      contract_id: contract.id, pet_id: pid,
      kind: it.kind, at_time: it.fuzz === -1 ? null : it.time, fuzz_min: it.fuzz, sort_key: i,
    })));
    const { error: e4 } = await sb.from('schedule_items').insert(rows);
    if (e4) throw e4;
  }

  return contract;
}

export const inviteUrlOf = token => `${shareOrigin()}/?t=${token}`;
