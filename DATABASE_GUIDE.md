# 💾 데이터베이스 추가 가이드

## 📌 왜 DB가 필요한가?

### 현재 문제점
1. **느린 응답속도**: 매번 API 호출 (8-12초)
2. **비용 문제**: OpenAI API 호출마다 과금
3. **API 제한**: Yahoo Finance, SEC 호출 제한

### DB 추가 시 효과
- **속도**: 0.5초로 단축 (20배 빠름) ⚡
- **비용**: 90% 절감 💰
- **안정성**: API 장애 대응

---

## 🚀 추천 방법 1: Vercel KV (Redis) ⭐⭐⭐⭐⭐

### 장점
- ✅ 1분 설정
- ✅ Vercel 완벽 통합
- ✅ 무료 티어: 256MB, 10,000 commands/day
- ✅ 캐싱에 최적화

### 설정 방법

#### 1. Vercel 대시보드에서 생성
```bash
1. Vercel 프로젝트 선택
2. Storage 탭
3. Create Database → KV
4. 자동으로 환경 변수 설정됨
```

#### 2. 패키지 설치
```bash
npm install @vercel/kv
```

#### 3. 캐싱 적용

**`lib/cache-service.ts` 생성:**
```typescript
import { kv } from '@vercel/kv';

export class CacheService {
  // 재무 데이터 캐시 (1시간)
  async getFinancialData(ticker: string) {
    const cached = await kv.get(`financial:${ticker}`);
    if (cached) return cached;
    return null;
  }

  async setFinancialData(ticker: string, data: any) {
    await kv.set(`financial:${ticker}`, data, { ex: 3600 }); // 1 hour
  }

  // AI 분석 캐시 (30분)
  async getAnalysis(ticker: string) {
    const cached = await kv.get(`analysis:${ticker}`);
    if (cached) return cached;
    return null;
  }

  async setAnalysis(ticker: string, data: any) {
    await kv.set(`analysis:${ticker}`, data, { ex: 1800 }); // 30 min
  }

  // 뉴스 캐시 (15분)
  async getNews(ticker: string) {
    const cached = await kv.get(`news:${ticker}`);
    if (cached) return cached;
    return null;
  }

  async setNews(ticker: string, data: any) {
    await kv.set(`news:${ticker}`, data, { ex: 900 }); // 15 min
  }
}
```

**`app/api/stock/[ticker]/route.ts` 수정:**
```typescript
import { CacheService } from '@/lib/cache-service';

export async function GET(request: NextRequest, { params }: { params: { ticker: string } }) {
  const ticker = params.ticker?.toUpperCase();
  const cacheService = new CacheService();

  // 캐시 확인
  const cachedAnalysis = await cacheService.getAnalysis(ticker);
  if (cachedAnalysis) {
    return NextResponse.json(cachedAnalysis);
  }

  // 캐시 없으면 분석 수행
  const financialData = await financialService.getFinancialAnalysis(ticker);
  const recommendation = await aiService.analyzeStock(ticker, financialData, []);
  
  const result = {
    ticker,
    financialData,
    recommendation,
    generatedAt: new Date().toISOString(),
  };

  // 캐시 저장
  await cacheService.setAnalysis(ticker, result);

  return NextResponse.json(result);
}
```

### 예상 효과
- **첫 요청**: 8-12초
- **캐시된 요청**: **0.3-0.5초** ⚡⚡⚡
- **비용**: 90% 절감

---

## 🗄️ 방법 2: Vercel Postgres ⭐⭐⭐⭐

### 장점
- ✅ SQL 쿼리 가능
- ✅ 히스토리 저장
- ✅ 관계형 데이터 관리
- ✅ 무료 티어: 256MB, 60시간/월

### 사용 케이스
- 사용자 구독 정보 저장
- 분석 히스토리 관리
- 통계 데이터 수집

### 설정 방법

#### 1. Vercel 대시보드에서 생성
```bash
1. Storage → Create Database → Postgres
2. 환경 변수 자동 설정
```

#### 2. 패키지 설치
```bash
npm install @vercel/postgres
```

#### 3. 테이블 생성

**`db/schema.sql`:**
```sql
-- 분석 히스토리
CREATE TABLE stock_analyses (
  id SERIAL PRIMARY KEY,
  ticker VARCHAR(10) NOT NULL,
  current_price DECIMAL(10, 2),
  decision VARCHAR(20),
  confidence INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 사용자 구독
CREATE TABLE subscriptions (
  id SERIAL PRIMARY KEY,
  ticker VARCHAR(10) NOT NULL,
  email VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(ticker, email)
);

-- 캐시 테이블
CREATE TABLE cache (
  key VARCHAR(255) PRIMARY KEY,
  value JSONB NOT NULL,
  expires_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_cache_expires ON cache(expires_at);
```

#### 4. 사용 예시

```typescript
import { sql } from '@vercel/postgres';

// 분석 저장
await sql`
  INSERT INTO stock_analyses (ticker, current_price, decision, confidence)
  VALUES (${ticker}, ${price}, ${decision}, ${confidence})
`;

// 히스토리 조회
const history = await sql`
  SELECT * FROM stock_analyses 
  WHERE ticker = ${ticker}
  ORDER BY created_at DESC
  LIMIT 10
`;

// 구독 추가
await sql`
  INSERT INTO subscriptions (ticker, email)
  VALUES (${ticker}, ${email})
  ON CONFLICT (ticker, email) DO NOTHING
`;
```

---

## 🌐 방법 3: Supabase ⭐⭐⭐⭐

### 장점
- ✅ PostgreSQL + 인증 + Storage + Realtime
- ✅ 무료 티어 넉넉: 500MB DB, 1GB storage
- ✅ Admin 대시보드 제공
- ✅ Row Level Security (보안)

### 설정 방법

#### 1. Supabase 프로젝트 생성
```bash
1. https://supabase.com 가입
2. New Project 생성
3. API keys 복사
```

#### 2. 환경 변수 추가
```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### 3. 패키지 설치
```bash
npm install @supabase/supabase-js
```

#### 4. 클라이언트 생성

**`lib/supabase.ts`:**
```typescript
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

#### 5. 사용 예시

```typescript
// 데이터 저장
const { data, error } = await supabase
  .from('stock_analyses')
  .insert({
    ticker,
    current_price: price,
    decision,
    confidence
  });

// 데이터 조회
const { data: analyses } = await supabase
  .from('stock_analyses')
  .select('*')
  .eq('ticker', ticker)
  .order('created_at', { ascending: false })
  .limit(10);
```

---

## 🎯 권장 구성

### 단기 (즉시 적용)
```
Vercel KV (Redis)
└── 캐싱 전용
    ├── 재무 데이터: 1시간
    ├── AI 분석: 30분
    └── 뉴스: 15분
```

### 장기 (기능 확장 시)
```
Vercel KV (캐싱) + Vercel Postgres (데이터)
├── KV: 빠른 조회
└── Postgres: 구독, 히스토리, 통계
```

---

## 📊 성능 비교

| 구분 | 현재 | KV 추가 | KV + Postgres |
|------|------|---------|---------------|
| 첫 요청 | 8-12초 | 8-12초 | 8-12초 |
| 재요청 | 8-12초 | **0.3초** | **0.3초** |
| 히스토리 | ❌ | ❌ | ✅ |
| 구독 관리 | ❌ | ❌ | ✅ |
| 통계 | ❌ | ❌ | ✅ |
| 월 비용 | $0 | $0 | $0 |

---

## 🚀 빠른 시작 (Vercel KV)

### 1. Vercel에서 KV 생성 (1분)
```bash
Vercel Dashboard → Your Project → Storage → Create KV
```

### 2. 로컬에 환경 변수 가져오기
```bash
vercel env pull .env.local
```

### 3. 패키지 설치
```bash
npm install @vercel/kv
```

### 4. 파일 추가 (5분)

위의 `lib/cache-service.ts` 코드를 복사하여 파일 생성

### 5. API 수정 (3분)

`app/api/stock/[ticker]/route.ts`에 캐싱 로직 추가

### 6. 배포
```bash
git add .
git commit -m "feat: Add Vercel KV caching"
git push
```

### 7. 테스트
```
1. NVDA 검색 → 8-12초 (첫 요청)
2. NVDA 다시 검색 → 0.3초 (캐시됨) ⚡⚡⚡
```

---

## ⚠️ 주의사항

### 캐시 무효화
새로운 공시가 나오면 캐시를 삭제해야 합니다:

```typescript
// 공시 체크 시 캐시 삭제
if (hasNewFilings) {
  await kv.del(`analysis:${ticker}`);
  await kv.del(`financial:${ticker}`);
}
```

### 무료 티어 제한
- **Vercel KV**: 10,000 commands/day
- **Vercel Postgres**: 60시간/월

트래픽이 많아지면 유료 플랜 고려

---

## 🎉 결론

1. **즉시 적용**: Vercel KV (캐싱) - 가장 큰 효과
2. **기능 확장**: Vercel Postgres 추가
3. **풀스택**: Supabase로 이전 고려

**추천**: 먼저 Vercel KV부터 시작! 🚀
