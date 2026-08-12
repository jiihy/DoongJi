# PRD v3 — 펫시팅 돌봄 기록 서비스 (가칭)

> **이 문서가 정본이다.** `07-PRD.md`(2판)는 방향 전환으로 폐기됐고, `09-방향전환.md`의
> 1~38차 결정을 이 문서로 통합했다. 충돌하면 **이 문서 > 09 > 나머지** 순으로 이긴다.
>
> - 작성: 2026-08-12
> - 선행 문서: `08-사용자-인터뷰`(유일한 1차 근거) · `09-방향전환`(결정 로그) · `10-경쟁사-검증`
> - 구현체: `prototype/index.html` (localStorage, 22화면 동작) · `design/_canvas-source.dc_v2.html` (시안 13화면)
> - 다음 단계: **이 PRD → CLAUDE.md(하네스) → ralph-loop → Supabase 백엔드**

---

## 0. 한 문장

> **경쟁사는 「감시」를 판다. 우리는 「회계」를 판다.**
> 실시간 영상은 그 순간에만 작동하고 아무것도 남기지 않는다.
> 회계는 돌봄이 끝난 뒤에 남고, **다음 보호자가 본다.**

---

## 1. 문제와 근거

### 1-1. 문제 정의

보호자와 시터는 서로를 검증할 방법이 없어서 **매 건마다 관계를 0에서 다시 쌓는다.**
신뢰의 단위가 '사람'이 아니라 '건(件)'이기 때문이다.

### 1-2. 1차 근거 (인터뷰, `08` 참조)

| # | 발견 | 인용 |
|---|---|---|
| 1 | 정보를 **수행 시점에** 못 꺼낸다 | "대화내용을 타고 올라가서 다시 확인" |
| 2 | 왜곡은 **수행이 아니라 상태**에서 일어난다 | "'잘 지낸다'고 안심시키는 편" |
| 3 | 완화의 이유는 불이익이 아니라 **역할 인식** | 인센티브를 바꿔도 안 바뀐다 → **묻는 방식**을 바꿔야 함 |
| 4 | 보호자의 최대 불안 | "말로만 잘 지낸다 하고 아니면 어쩌지?" |
| 5 | 기록 요구의 한계선 | "**너무 숙제처럼 느껴지진 않으면** 좋겠음" |

> ⚠ **가장 큰 공백: 보호자 인터뷰 0명.** 보호자 측 판단은 전부 [추측]이며,
> 실사용(V1) 후 최우선으로 메꾼다.

### 1-3. 설계 원칙 (기각 이력에서 도출)

1. **시터에게 판단을 요구하면 완화된다** → 판단할 게 없는 것(사진·시각)만 요구하고, 판정은 보호자가 한다
2. **비율(%)은 본인이 통제하는 것에만 쓴다** (30차 검증 → §8 미결)
3. **확인 안 해도 불이익 없음**을 화면 문구와 집계가 **동시에** 지켜야 한다
4. **정직 표기**: 확인된 것과 본인이 쓴 것을 절대 섞지 않는다
5. **느슨함이 기본, 엄격함이 예외** (정각·사진은 선택 → 그래서 신호가 된다)

---

## 2. 사용자와 배포 전략

### 2-1. V1 = 마켓플레이스가 아니라 **시터 개인의 도구**

```
당근알바에서 매칭  →  시터가 초대 링크 전송  →  보호자가 링크로 진입
   (외부)              (앱 A: 초대 카드)         (앱 B: 온보딩 → 일정)
```

| 역할 | 누구 | V1에서의 진입 |
|---|---|---|
| 시터 | 프로젝트 오너 본인 (당근알바 활동 중) | 앱 설치·계정 보유 |
| 보호자 | 당근에서 매칭된 실제 고객 | **초대 링크** (무계정) |
| 열람자 | SNS에서 공개 프로필을 본 사람 | 공개 링크 → 돌봄 의뢰 |

유입 경로 둘: **당근(초대 링크)** + **SNS(공개 프로필 → 의뢰)**

### 2-2. 사용자 여정 (V1 확정)

```
[시터] 초대 링크 복사 ──카톡/당근──▶ [보호자] 초대 랜딩
                                        ↓ 시작하기
                                     아이 소개 (이름 필수 · 나이 · 추가 정보 · 아이 추가)
                                     픽·드롭 약속 (맡기는 날/돌아오는 날 · 시각 · 담당)
                                        ↓
                                     돌봄 일정 작성 → [시터에게 전달]
[시터] 알림 수신 → 항목별 인증(앱 카메라) ──즉시──▶ [보호자] 종 알림 → 리액션(=확인)
   ↓ 전 일정 완료
[시터] 돌봄 마치기 → (계약 마지막 날) 아이별 후기 1회
   ↓
[보호자] 오늘의 기록(정산) → 별점 후기(선택)
   ↓
공개 프로필: 회계 숫자 + 돌봄 일기(후기 + 검증 기록 링크)
```

---

## 3. 범위 (스코프)

### 3-1. V1 — localStorage 프로토타입 ✅ **완료**

22화면 동작. 아래 §4 기능표의 P0 전량 구현·브라우저 검증 완료.

### 3-2. V2 — Supabase 백엔드 🚧 **다음 단계**

동일 기능을 실제 다중 사용자·영속 저장으로 옮긴다. **기능 추가 없음. 이식과 신뢰성만.**

### 3-3. V3 이후 (범위 밖, 참고)

푸시 알림 서버, 결제·정산, 시터 다계정/매칭, 사진 EXIF 검증, 알림톡.

### 3-4. Non-goals (하지 않는 것)

- ❌ 실시간 영상/CCTV (경쟁사 영역 — `10` 참조)
- ❌ GPS 추적 (아이 위치가 아니라 시터 위치만 증명 → 무의미)
- ❌ 시터 순위·랭킹 (회계는 비교가 아니라 이력)
- ❌ 지연 벌점 (숙제화 방지)
- ❌ 보호자 주소 수집 (당근 채팅이 이미 담당)

---

## 4. 기능 명세

### 4-1. P0 — V1 구현 완료 (V2 이식 대상)

| ID | 기능 | 핵심 규칙 | 근거 |
|---|---|---|---|
| **F1** | 초대 링크 · 랜딩 | 시터 이름 먼저 노출, 약속 3종 고지 | 32·33차 |
| **F2** | 아이 프로필 | 이름만 필수, 다두 지원(petId), 언제든 수정 | 33·34·38차 |
| **F3** | 픽·드롭 약속 | **이벤트 기준**(맡기는 날/돌아오는 날 × 보호자/펫시터) = 4케이스 | 36차 |
| **F4** | 돌봄 일정 | 항목(밥·산책·배변·약·놀이·취침) + 시각 + **범위 기본(~1시간쯤)** / 약=자동 정각 | 18·28·36차 |
| **F5** | 특이사항 | 카테고리 칩(커스텀 추가 가능) · **아이 프로필에 저장**되어 다음 돌봄에 재사용 | 19·31·35차 |
| **F6** | 항목별 인증 | 앱 카메라 강제(`capture`) + 시각 워터마크 픽셀 굽기 + 산책 2컷(출발/완료 → 산책 시간) | 12·16·29차 |
| **F7** | 사진 없는 제출 | 설명만으로도 제출 가능. **사진=설명=1건** (벌점 없음) | 17·18차 |
| **F8** ✅ | 리액션 = 확인 | 😍😌💙 어느 것이든 확인으로 집계. 확인 안 해도 불이익 없음 | 22차 |
| **F9** ✅ | 이의 → 소명 | 사유 선택 전엔 미접수 / 72h 무응답 = 「소명 없음」 / **소명 전까지만 되돌리기** | 14·15차 |
| **F10** ✅ | 재제출 | 판정·열람 무효화(다시 확인 필요), 이의 이력은 보존 | 18차 |
| **F11** ✅ | 먼저 챙긴 순간 | 일정 외 활동 + 앨범 허용(태그 표기) + 보호자 리액션 | 20·21·35차 |
| **F12** ✅ | 돌봄 마치기 | 전 일정 기록 후에만 노출 → 계약 종료일이면 아이별 후기로 연결 | 17·20·24·34차 |
| **F13** ✅ | 돌봄 일기 | 아이당 한 권 = ①시터 후기(계약당 1회) + ②검증 기록 링크 | 21·22·24차 |
| **F14** ✅ | 공개 프로필 | 확인됨/본인작성 분리, 회계 숫자, 일기 미리보기, 기록 링크 | 16·22차 |
| **F15** ✅ | 공개 돌봄 기록 | 읽기 전용 타임라인. 보호자 동의 전제 명시 | 22차 |
| **F16** ✅ | 양방향 알림 | 보호자 종=새 인증 / 시터 종=보호자 행동(전달·리액션·특이사항·픽드롭) | 25·38차 |
| **F17** | 보호자 홈 = 돌봄 일지 | 전달 후 홈이 일지로 전환. 사진 슬라이드+라이트박스, 일지에서 바로 리액션 | 37·38차 |
| **F18** ✅ | 돌봄 의뢰 (SNS) | 공개 프로필 → 의뢰 폼 → 시터 문자(sms 딥링크) + 앱 수신함 | 35·38차 |
| **F19** | 시터 프로필 수정 | 이름·유형·지역·소개 (전 화면 동적 반영) | 38차 |
| **F20** | 가져온 후기 | 타 플랫폼 후기 + 캡처 필수, 「확인하지 않음」 라벨 | 10·12차 |

### 4-2. P1 — V2에서 추가 (백엔드 필수 기능)

| ID | 기능 | 왜 백엔드가 필요한가 |
|---|---|---|
| B1 | 계정·세션 (시터) | 기기 교체·재설치에도 이력 유지 |
| B2 | 초대 링크 토큰 | 보호자 무계정 접근, 계약 단위 권한 |
| B3 | 사진 저장소 | localStorage 5MB 한계 → Supabase Storage |
| B4 | 실시간 동기화 | 두 사람이 다른 기기에서 같은 계약을 본다 (현재는 역할 스위처로 위장) |
| B5 | 알림 | 인증 도착·소명 요청·72h 경과 (V2는 인앱, V3에서 푸시) |
| B6 ✅ | 기록 공개 동의 | 보호자가 동의해야 공개 링크 생성 (현재 문구만 있고 토글 없음) |

### 4-3. P2 — 보류

시터 다계정, 결제, 리뷰 신고, EXIF 검증, 알림톡.

---

## 5. 화면 인벤토리 (V1 구현 기준)

| 역할 | 화면 | 상태 |
|---|---|---|
| 보호자 | `welcome` 초대 랜딩 | ✅ |
| | `petSetup` 아이 소개 + 픽·드롭 | ✅ |
| | `home` 돌봄 일지 (전달 후 홈) | ✅ |
| | `schedule` 일정·특이사항 편집 | ✅ |
| | `live` 지금 오는 인증 (종 진입, 새 것만) | ✅ |
| | `confirm` 오늘의 기록 (정산) | ✅ |
| | `review` 후기 쓰기 | ✅ |
| | `petProfile` 아이 프로필 (정보·특이사항 수정) | ✅ |
| 시터 | `today` 오늘의 돌봄 (+ 보호자 알림 종, FAB) | ✅ |
| | `record` 항목 기록 (참고 사항 표시) | ✅ |
| | `extra` 먼저 챙긴 순간 | ✅ |
| | `reply` 소명하기 | ✅ |
| | `profile` 내 프로필 (초대 카드·받은 의뢰·회계) | ✅ |
| | `sitterEdit` 프로필 수정 | ✅ |
| | `addReview` 가져온 후기 담기 | ✅ |
| | `diaryWrite` / `diaryBook` 후기 작성/일기장 | ✅ |
| 공개 | `verify` 공개 프로필 (+의뢰) | ✅ |
| | `careRecord` 공개 돌봄 기록 | ✅ |

---

## 6. 데이터 모델

### 6-1. 현재 (localStorage `petcare.proto.v3`)

```js
{
  pets: [{ id, name, age, extra, photo }],
  period: { start, end },                       // 'YYYY.MM.DD'
  handoff: { start: {time, by}, end: {time, by} },   // by: 'owner'|'sitter'
  schedule: [{ id, petId, kind, time, fuzzMin, timeEnd }],
  careNotes: [{ id, kind, petId|null, text }],  // kind: 'all'|KIND|'c:커스텀'
  customKinds: ['목욕', ...],
  sent: bool, finished: bool,
  proofs: {                                     // scheduleId →
    [id]: { at, photo, photo2, ts, ts2, stamp, text, late, resubmitted, prevAt,
            seen: {at, kind},
            verdict: { at, matched, reaction },
            dispute: { at, reason, reply:{at,text}, resolution } }
  },
  extras: [{ id, at, photos:[{url,album,stamp}], text, thanks:{at,reaction} }],
  diaryBooks: [{ id, pet, petId, entries:[{id,at,text,photos}], records:[{id,date,live,petId,items}] }],
  diaryDoneMap: { [petId]: true },
  review: { stars, chips }, imported: [...],
  sitterInfo: { name, type, region, bio },
  inquiries: [{ id, at, contact, when, msg }],
  sitterEvents: [{ id, at, text }], sitterEventsRead: n,
  baseline: { ... }                             // 데모용 과거 누적치
}
```

### 6-2. Supabase 스키마 (V2 제안)

```sql
-- 사람
sitters      (id pk, auth_uid, name, type, region, bio, created_at)
owners       (id pk, nickname, contact, created_at)        -- 무계정: 토큰으로 식별

-- 계약 (한 번의 돌봄 = 1 contract)
contracts    (id pk, sitter_id fk, owner_id fk, invite_token uniq,
              start_date, end_date,
              handoff_start_time, handoff_start_by,        -- 'owner'|'sitter'
              handoff_end_time,   handoff_end_by,
              sent_at, finished_at, record_public bool default false,  -- B6 동의
              created_at)

pets         (id pk, owner_id fk, name, age, extra, photo_url)
contract_pets(contract_id fk, pet_id fk)                   -- 다두

-- 일정과 인증
schedule_items (id pk, contract_id fk, pet_id fk, kind, at_time, fuzz_min,
                sort_key, created_at)
proofs       (id pk, schedule_item_id fk uniq, submitted_at,
              photo_url, photo2_url, shot_at, shot2_at, stamp_text,
              text, is_late bool, resubmit_count int, prev_at)
verdicts     (id pk, proof_id fk uniq, decided_at, matched bool, reaction)
seens        (id pk, proof_id fk uniq, seen_at, kind)
disputes     (id pk, proof_id fk, opened_at, reason,
              reply_at, reply_text, resolution)             -- resolved|unresolved|noreply

-- 부가 기록
care_notes   (id pk, pet_id fk, kind, text, created_at)     -- 아이에 붙는다 (계약 아님)
extras       (id pk, contract_id fk, at, text)
extra_photos (id pk, extra_id fk, url, is_album bool, stamp)
extra_thanks (extra_id fk uniq, at, reaction)

-- 일기 (아이당 한 권)
diary_books  (id pk, sitter_id fk, pet_id fk, unique(sitter_id, pet_id))
diary_entries(id pk, book_id fk, contract_id fk, written_at, text)  -- 계약당 1편
diary_photos (id pk, entry_id fk, url, is_album bool)

-- 유입/알림
inquiries    (id pk, sitter_id fk, at, contact, when_text, msg, handled bool)
events       (id pk, contract_id fk, audience, at, text, read_at)   -- 양방향 알림
imported_reviews (id pk, sitter_id fk, source, text, capture_url)
```

**Storage**: `proofs/{contract}/{proof}.jpg`, `extras/…`, `diary/…`, `imports/…`

**RLS 핵심**
- 시터: 자기 `sitter_id` 행 전체 R/W
- 보호자: `invite_token`으로 발급된 세션 → 해당 `contract_id` 범위만 R/W
- 공개(익명): `record_public = true`인 계약의 **읽기 전용 뷰**만
- 판정/소명은 **작성자만** 쓰기, 상대는 읽기 — 되돌리기 규칙(F9)은 서버에서 강제

**서버가 강제해야 할 불변식**
1. 재제출 시 `verdicts`·`seens` 삭제, `disputes`는 보존 (F10)
2. `disputes.reply_at IS NOT NULL`이면 보호자 철회 불가 (F9)
3. `diary_entries`는 (book_id, contract_id) 유니크 — 계약당 1편 (F13)
4. `finished_at`은 전 `schedule_items`에 `proofs`가 있을 때만 세팅 (F12)

### 6-3. 파생 지표 (뷰)

| 지표 | 계산 |
|---|---|
| 약속 이행 | `proofs 수 / schedule_items 수` |
| 보호자 확인 | `verdicts 수 / proofs 수` ⚠ §8-1 미결 |
| 이의·해소 | `disputes` 건수 / `resolution='resolved'` 건수 |
| 산책 시간 | `shot2_at - shot_at` |
| 재계약 | 같은 (sitter, pet)의 contract 수 = 일기 후기 편수 |

---

## 7. 정책 (서비스 규칙)

| 영역 | 규칙 |
|---|---|
| **집계** | 사진과 설명 모두 1건. 사진/설명 비율은 공개하되 벌점 없음 |
| **확인** | 리액션 = 확인. 무응답에 불이익 없음 (문구·집계 동시 준수) |
| **판정 정정** | 시터 소명 전까지 흔적 없이 철회 가능. 소명 후엔 불가 |
| **소명 기한** | 24h 리마인드 → 72h 무응답 = 「소명 없음」 (자동 해소/미해소 아님) |
| **정직 표기** | ✅확인됨 / ⓘ본인이 씀 / 앨범 / 종료 후 기록 / n회 다시 제출 |
| **공개** | 돌봄 기록은 **보호자 동의 후에만**. 후기는 시터 자유(본인작성 라벨) |
| **삭제 불가** | 보호자가 「고마워요」한 순간은 시터가 지울 수 없음 |
| **시간 기본값** | 범위(~1시간쯤)가 기본, 정각은 선택 · 약은 자동 정각 |
| **후기** | 아이당 계약당 1편. 수정 가능, 건너뛰기 가능 |
| **개인정보** | 주소 미수집. 사진은 계약 참여자 + (동의 시) 공개 링크만 |

---

## 8. 미결 / 리스크

### 8-1. 「보호자 확인 %」 공정성 (30차, **결정 대기**)

시터가 통제할 수 없는 보호자 행동이 시터의 공개 성적표가 된다. 앱 문구("불이익 없음")와도 모순.
→ 후보 A) **건수 전환**("보호자 확인 462건") B) 참여 보호자 기준 % C) 현행+온보딩 강화. **A 추천.**

### 8-2. 검증되지 않은 것

| 항목 | 상태 |
|---|---|
| 보호자 인터뷰 | **0명** — V1 실사용이 첫 데이터 |
| 72시간 기한 | 근거 없는 임의값 |
| 다일 계약 중간 날 마치기 | 코드만 있고 실기기 미검증 |
| sms 딥링크 | 모바일 전용 (데스크톱 무시) |
| 워터마크 | 화면 재촬영으로 우회 가능 — **비용을 올릴 뿐 차단 아님** |

### 8-3. 알려진 부채

- `design/` 시안 v1(24화면)과 v2(13화면)가 분리 — 통합 미정
- Figma 파일 2개 (Starter 한도로 새 파일 생성) — 동기화 미정
- localStorage 용량·EXIF·orphan proof 집계 등 프로토타입 한계 (`09` 12차 검토 참조)

---

## 9. 로드맵과 완료 조건

### Phase 0 — localStorage 프로토타입 ✅ 완료
- [x] 22화면, 보호자·시터·공개 3역할 전 구간 동작
- [x] 38차까지 사용 피드백 반영, 매 건 브라우저 검증
- [x] 시안 v2 export + Figma 이식

### Phase 1 — Supabase 이식 🚧 다음
**완료 조건 (체크 가능한 형태)**
- [x] 시터 계정 로그인 후 새로고침·기기 교체에도 상태 유지 (M1)
- [x] 초대 링크로 연 보호자가 **계정 없이** 아이 확인 → 일정 전달까지 완료 (M3)
- [x] 시터가 사진 인증 제출 → **다른 기기의 보호자 화면**에 30초 내 반영 (M4, Realtime)
- [x] 사진이 Storage에 저장되고 새로고침 후에도 보임 (localStorage 미사용) (M4)
- [x] 재제출 시 판정 무효화·이의 보존이 **서버에서** 강제됨 (클라이언트 우회 불가) (M5)
- [x] 보호자가 동의 토글을 켠 계약만 공개 링크로 열림, 끈 계약은 404 (M6)
- [x] RLS: 익명 키로 sitters·inquiries·contracts·proofs 직접 조회 시 빈 배열, 직접 INSERT는 401 (51차)
- [ ] RLS: 다른 계약의 데이터를 URL 조작으로 못 읽음 (수동 시도 3케이스 실패 확인)
- [ ] 기존 프로토타입 시드 시나리오가 실서버에서 동일하게 재현

### Phase 2 — 실사용 검증
- [ ] 실제 당근 알바 1건에 투입, 보호자 1명 온보딩 완주
- [ ] 보호자 인터뷰 1명 이상 (§8-2 최대 공백 해소)
- [ ] 8-1 결정 반영

### Phase 3 — 확장 (조건부)
푸시 알림 · 알림톡 · 결제 · 시터 다계정

---

## 10. 다음 작업 순서 (개발 착수)

1. **이 PRD 확정** ← 현재
2. **CLAUDE.md(하네스) 작성** — 프로젝트 규칙: 검증 방식, 문서 갱신 규칙, 금지 사항, 완료 조건 판정 기준
3. **ralph-loop 플러그인 설치** — 반복 상한과 종료 조건을 Phase 1 체크리스트로 고정
4. **Supabase 프로젝트 생성 → 스키마(§6-2) → RLS → 클라이언트 이식**

> 하네스 주의 (전역 규칙 §6): 스캐폴딩은 최소로. Phase 1 체크리스트가 곧 종료 조건이며,
> **문자열 매칭 완료 판정은 단독 안전장치가 못 된다** — 반복 상한을 반드시 건다.
