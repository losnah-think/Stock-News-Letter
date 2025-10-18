# 🔥 Supabase 일시중지 문제 해결 가이드

## 문제 상황

```
Your project SNL was one of those and it is scheduled to be paused in a couple of days.
```

Supabase 무료 플랜에서 7일 이상 DB 활동이 없으면 자동으로 일시중지됩니다.

## 원인

1. **DB 테이블 미생성**: `cache` 테이블이 생성되지 않아 데이터 저장 실패
2. **Cron Job 미실행**: Vercel Cron이 실행되지 않거나 실패
3. **활동 부족**: 실제 DB 읽기/쓰기가 발생하지 않음

---

## ✅ 해결 방법

### 1단계: Supabase 테이블 생성 (필수!)

#### 방법 1: Supabase Dashboard에서 직접 생성

1. **Supabase 접속**: https://supabase.com/dashboard/project/ebuogvnrfcuibhuqfyqd
2. **SQL Editor** 메뉴로 이동
3. `supabase/schema.sql` 파일 내용 전체 복사
4. SQL Editor에 붙여넣기
5. **Run** 버튼 클릭 (또는 Cmd/Ctrl + Enter)

#### 방법 2: 로컬에서 테스트 스크립트 실행

```bash
# 의존성 설치 (tsx 필요)
npm install -D tsx

# Supabase 연결 테스트
npx tsx scripts/test-supabase.ts
```

**예상 출력**:
```
🔍 Supabase 연결 테스트 시작...

1️⃣ 캐시 테이블 확인...
✅ 캐시 테이블 존재

2️⃣ 테스트 캐시 데이터 삽입...
✅ 테스트 데이터 삽입 성공
   Key: test:1729000000000
   Expires: 2025-10-18 오후 1:00:00

3️⃣ 캐시 데이터 읽기...
✅ 캐시 데이터 읽기 성공

✅ 모든 테스트 완료! Supabase가 정상 작동합니다. 🎉
```

**에러 발생 시**:
```
❌ 캐시 테이블 없음: relation "public.cache" does not exist
📝 Supabase Dashboard에서 schema.sql을 실행하세요!
```
→ 방법 1로 테이블을 먼저 생성하세요.

---

### 2단계: Keep-Alive 시스템 배포

매일 자동으로 DB에 활동을 유발하는 시스템을 추가했습니다.

#### Vercel Cron 구성

`vercel.json`에 3개의 Cron Job이 설정되어 있습니다:

```json
{
  "crons": [
    {
      "path": "/api/cache/warmup",
      "schedule": "0 */3 * * *"     // 3시간마다 - 캐시 워밍
    },
    {
      "path": "/api/check-filings",
      "schedule": "0 9 * * 1-6"     // 월-토 9시 - 공시 체크
    },
    {
      "path": "/api/keep-alive",
      "schedule": "0 0 * * *"       // 매일 자정 - DB 활동 유지 ⭐
    }
  ]
}
```

#### 배포하기

```bash
# 변경사항 커밋 및 푸시
git add .
git commit -m "feat: Add keep-alive system to prevent Supabase pause"
git push
```

Vercel이 자동으로 배포하고 Cron Job을 등록합니다.

---

### 3단계: 즉시 활동 생성 (수동)

테이블 생성 후 바로 DB 활동을 만들어 Supabase에 "활성" 상태를 알립니다.

#### 옵션 A: 로컬 스크립트 실행

```bash
# Keep-alive 스크립트 실행
npx tsx scripts/keep-alive.ts
```

**출력 예시**:
```
⏰ 2025-10-18 오후 12:00:00 - Keep-alive 시작
✅ Heartbeat 저장 성공
📊 현재 캐시: 1개
🧹 만료된 캐시 정리 완료
✅ Keep-alive 완료
```

#### 옵션 B: 로컬 웹에서 종목 검색

```bash
# 개발 서버 실행 (이미 실행 중이면 생략)
npm run dev

# 브라우저에서 http://localhost:3000
# NVDA, AAPL 등 검색 → 캐시 저장됨
```

#### 옵션 C: Vercel API 직접 호출

```bash
# Keep-alive API 수동 실행 (배포 후)
curl -X GET https://your-domain.vercel.app/api/keep-alive \
  -H "Authorization: Bearer your-cron-secret"
```

---

### 4단계: 확인

#### Supabase에서 확인

1. Supabase Dashboard → **Table Editor**
2. `cache` 테이블 선택
3. 데이터가 보이면 성공! ✅

**SQL로 확인**:
```sql
SELECT 
  key,
  created_at,
  expires_at,
  EXTRACT(EPOCH FROM (expires_at - NOW())) / 3600 as hours_remaining
FROM cache
ORDER BY created_at DESC
LIMIT 10;
```

#### Vercel에서 확인

1. Vercel Dashboard → **Deployments**
2. 최신 배포 클릭 → **Functions** 탭
3. `/api/keep-alive` 함수 로그 확인
4. **Settings → Cron Jobs**에서 3개 Cron 등록 확인

---

## 📊 Keep-Alive 시스템 작동 방식

```
매일 00:00 (UTC) = 09:00 (KST)
  ↓
/api/keep-alive 실행
  ↓
1. Heartbeat 데이터 저장 (system:heartbeat)
2. 캐시 통계 조회 (SELECT count)
3. 만료된 캐시 정리 (DELETE)
4. 사용 통계 기록 (INSERT)
  ↓
Supabase "활성" 상태 유지 ✅
```

### Heartbeat 데이터 예시

```json
{
  "key": "system:heartbeat",
  "value": {
    "timestamp": "2025-10-18T00:00:00.000Z",
    "message": "SNL system is alive",
    "cron_trigger": true
  },
  "expires_at": "2025-10-19T00:00:00.000Z"
}
```

---

## 🔍 문제 해결

### Q1: 테이블 생성했는데도 "relation does not exist" 오류

**원인**: RLS (Row Level Security) 정책 문제

**해결**:
```sql
-- Supabase SQL Editor에서 실행
ALTER TABLE cache DISABLE ROW LEVEL SECURITY;
```

또는 `.env.local`에서 `SUPABASE_SERVICE_ROLE_KEY` 사용 확인

### Q2: Cron이 실행 안 됨

**확인 사항**:
1. Vercel Dashboard → Settings → Cron Jobs
2. 환경 변수 `CRON_SECRET` 설정 확인
3. Function 로그에서 에러 확인

**수동 테스트**:
```bash
curl -X GET https://your-domain.vercel.app/api/keep-alive \
  -H "Authorization: Bearer $CRON_SECRET"
```

### Q3: 여전히 일시중지 경고가 옴

**대응**:
1. **즉시**: 로컬에서 `npx tsx scripts/keep-alive.ts` 실행
2. **매일**: 직접 웹사이트 방문하여 종목 검색
3. **장기**: Pro 플랜 업그레이드 ($25/month)

### Q4: 비용 절감하면서 활성 유지하려면?

**최소 설정**:
```json
// vercel.json - Cron 주기 늘리기
{
  "crons": [
    {
      "path": "/api/cache/warmup",
      "schedule": "0 */6 * * *"  // 3시간 → 6시간
    },
    {
      "path": "/api/keep-alive",
      "schedule": "0 */12 * * *" // 매일 → 12시간마다
    }
  ]
}
```

단, **7일에 1번 이상**은 실행되어야 합니다.

---

## 📅 활동 모니터링

### 수동 확인 스크립트

`scripts/check-activity.ts` 생성:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkActivity() {
  // 최근 활동 확인
  const { data } = await supabase
    .from('cache')
    .select('created_at')
    .order('created_at', { ascending: false })
    .limit(1);

  if (data && data[0]) {
    const lastActivity = new Date(data[0].created_at);
    const now = new Date();
    const daysSince = Math.floor(
      (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
    );

    console.log(`마지막 활동: ${lastActivity.toLocaleString('ko-KR')}`);
    console.log(`경과 일수: ${daysSince}일`);
    
    if (daysSince > 5) {
      console.log('⚠️ 경고: 5일 이상 활동 없음! 수동 실행 필요');
    } else {
      console.log('✅ 정상: 활동 유지 중');
    }
  }
}

checkActivity();
```

실행:
```bash
npx tsx scripts/check-activity.ts
```

---

## 🎯 권장 대응

### 즉시 (오늘)
1. ✅ Supabase에서 `schema.sql` 실행
2. ✅ `npx tsx scripts/test-supabase.ts` 실행
3. ✅ `npx tsx scripts/keep-alive.ts` 실행
4. ✅ Git push하여 Vercel 배포

### 단기 (이번 주)
- Vercel Dashboard에서 Cron Job 로그 확인
- Supabase에서 `cache` 테이블 데이터 확인
- 일시중지 경고 이메일 다시 오는지 확인

### 장기
- 매주 1회 이상 웹사이트 방문
- Cron Job이 정상 작동하는지 모니터링
- 필요 시 Pro 플랜 업그레이드 고려

---

## 📚 추가 리소스

- [Supabase Pausing Projects](https://supabase.com/docs/guides/platform/pause-projects)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Keep-Alive Pattern](https://en.wikipedia.org/wiki/Keepalive)

---

**🎉 이제 Supabase가 자동으로 활성 상태를 유지합니다!**
