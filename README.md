# Stock Newsletter - AI # 📈 Stock Newsletter (SNL)

주식 공시 모니터링 및 AI 분석 자동화 시스템

**3시간 캐### 3. 환경 변수 설정

`.env.example`을 복사하여 `.env.local` 파일을 생성하고 다음 값들을 입력하세요:

```bash
cp .env.example .env.local
```

필수 환경 변수:
```env
# OpenAI
OPENAI_API_KEY=your-openai-api-key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Email (Gmail)
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-gmail-app-password

# Configuration
NOTIFICATION_EMAIL=recipient@example.com
STOCK_TICKERS=NVDA,TSLA,AAPL
CRON_SECRET=your-random-secret-key
```

### 4. 로컬 개발 서버 실행 99% 비용 절감 💰**

매일 아침 관심 있는 주식의 공시, 재무제표, AI 분석 리포트를 자동으로 받아보세요!

## ✨ 주요 기능

### 🚀 성능 최적화
- **3시간 간격 자동 캐싱**: 인기 8종목 사전 분석
- **20배 빠른 응답**: 평균 0.5초 (기존 10초)
- **99% 비용 절감**: 1000명 사용 시 $20 → $0.16
- **실시간 데이터 시간 표시**: "🕐 분석 기준 시간: 2025-10-12 09:00"
- **캐시 상태 표시**: 녹색 "캐시됨 ⚡" 배지

### 📊 주식 분석
- **14가지 핵심 지표**: P/E, 매출 성장률, 마진, ROE 등
- **YoY/QoQ 비교**: 전년 대비, 전분기 대비 증감 분석
- **AI 투자 의견**: GPT-4o-mini 기반 권장 의견
- **실시간 뉴스**: 야후 파이낸스 RSS 통합

### 📧 공시 모니터링
- **SEC 공시 체크**: 10-K, 10-Q, 8-K
- **자동 이메일**: 공시 발생 시 즉시 알림
- **월-토 09:00 스케줄**: 매일 자동 체크

### 💾 데이터베이스
- **Supabase 연동**: PostgreSQL 기반 캐싱
- **3시간 TTL**: 최적의 신선도와 성능 균형
- **스마트 스킵**: 1시간 내 캐시는 재사용

## 🎯 성능 & 비용

### Before (캐싱 없음)
```
매 요청마다:
- 응답 시간: 8-12초
- OpenAI 비용: $0.02/요청
- 100명 사용: $2.00/일
```

### After (3시간 사전 캐싱)
```
하루 8번 자동 캐싱:
- 첫 요청: 8-12초 (캐시 생성)
- 이후 요청: 0.3-0.5초 ⚡
- OpenAI 비용: $0.16/일 (8종목)
- 사용자 수 무관! 💰
```

### 비용 절감 효과

| 사용자/일 | 캐싱 없음 | 3시간 캐싱 | 절감률 |
|----------|----------|-----------|--------|
| 10명 | $0.20 | $0.16 | 20% |
| 100명 | $2.00 | $0.16 | **92%** 💰 |
| 1000명 | $20.00 | $0.16 | **99.2%** 💰💰💰 |

**📚 자세한 내용**: [CACHE_WARMUP.md](./CACHE_WARMUP.md)

## 📋 요구사항

- Node.js 18.x 이상
- OpenAI API Key (GPT-4o-mini 사용)
- Supabase 계정 (데이터베이스 캐싱)
- Gmail 계정 (알림용)

## ⚙️ 설치 및 설정

### 1. 프로젝트 클론 및 의존성 설치

```bash
git clone https://github.com/losnah-think/Stock-News-Letter.git
cd Stock-News-Letter
npm install
```

### 2. Supabase 설정

1. [Supabase](https://supabase.com) 계정 생성
2. 새 프로젝트 생성
3. SQL Editor에서 `supabase/schema.sql` 실행
4. Settings → API에서 URL과 anon key 복사

**📚 자세한 가이드**: [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)

### 3. 환경 변수 설정

`.env.example`을 복사하여 `.env.local` 파일을 생성하고 다음 값들을 입력하세요:

```bash
cp .env.example .env.local
```

필수 환경 변수:
- `OPENAI_API_KEY`: OpenAI API 키 (https://platform.openai.com/api-keys)
- `EMAIL_USER`: Gmail 주소
- `EMAIL_PASSWORD`: Gmail 앱 비밀번호 (https://myaccount.google.com/apppasswords)
- `NOTIFICATION_EMAIL`: 알림을 받을 이메일 주소
- `STOCK_TICKERS`: 모니터링할 주식 티커 (쉼표로 구분, 예: NVDA,TSLA,AAPL)
- `CRON_SECRET`: API 보안을 위한 비밀 키 (임의의 문자열)

### 4. 로컬 개발 서버 실행

```bash
npm run dev
```

http://localhost:3000 에서 확인할 수 있습니다.

**테스트해보기**:
1. NVDA 검색 → 8-12초 소요 (첫 요청)
2. 다시 NVDA 검색 → 0.3초 소요 ⚡ (캐시됨 표시)
3. 분석 기준 시간 확인

## 🌐 Vercel 배포

### 1. GitHub에 푸시

```bash
git add .
git commit -m "feat: Add cache warmup system"
git push
```

### 2. Vercel에서 Supabase 연동

1. [Vercel](https://vercel.com) 프로젝트 대시보드
2. Storage → Connect Database → Supabase
3. 자동으로 환경 변수 설정됨

### 3. 추가 환경 변수 설정

Vercel Dashboard → Settings → Environment Variables:
```
OPENAI_API_KEY=...
EMAIL_USER=...
EMAIL_PASSWORD=...
NOTIFICATION_EMAIL=...
STOCK_TICKERS=NVDA,AAPL,TSLA,MSFT
CRON_SECRET=...
```

### 4. Cron Job 자동 실행

`vercel.json`에 2개의 Cron Job이 설정되어 있습니다:

```json
{
  "crons": [
    {
      "path": "/api/cache/warmup",
      "schedule": "0 */3 * * *"  // 3시간마다 캐시 워밍
    },
    {
      "path": "/api/check-filings",
      "schedule": "0 9 * * 1-6"   // 월-토 9시 공시 체크
    }
  ]
}
```

**실행 시간 (한국 시간)**:
- 캐시 워밍: 0시, 3시, 6시, 9시, 12시, 15시, 18시, 21시
- 공시 체크: 월-토 오전 9시

**📚 배포 가이드**: [VERCEL_SETUP.md](./VERCEL_SETUP.md)

## 📡 API 엔드포인트

### 특정 종목 분석 (캐싱 지원)

```bash
GET /api/stock/NVDA
```

응답 예시:
```json
{
  "ticker": "NVDA",
  "price": 450.25,
  "pe": 65.5,
  "marketCap": "1.1T",
  "revenueGrowthYoY": 265.28,
  "revenueGrowthQoQ": 18.35,
  "recommendation": {
    "decision": "BUY",
    "confidence": 85,
    "reasoning": "강력한 AI 수요로 폭발적 성장...",
    "keyPoints": ["데이터센터 매출 3배 증가", "..."],
    "risks": ["밸류에이션 부담", "..."]
  },
  "generatedAt": "2025-10-12T09:00:00Z",
  "fromCache": true,
  "cachedAt": "2025-10-12T09:00:15Z"
}
```

### 캐시 워밍 (Cron Job)

```bash
GET /api/cache/warmup
Header: Authorization: Bearer YOUR_CRON_SECRET
```

응답:
```json
{
  "success": true,
  "total_stocks": 8,
  "successful": 8,
  "skipped": 0,
  "failed": 0,
  "duration_seconds": 95.2,
  "next_warmup": "2025-10-12T12:00:00Z"
}
```

### 공시 체크 및 이메일 발송 (Cron Job)

```bash
GET /api/check-filings
Header: Authorization: Bearer YOUR_CRON_SECRET
```

## 🎯 사용 시나리오

### 시나리오 1: 빠른 조회 경험

```
사용자 A (09:05): NVDA 검색
  ↓ 캐시 워밍이 09:00에 이미 완료됨
  ↓ 0.3초만에 응답! ⚡
  ✓ 사용자 만족도 UP

사용자 B (09:30): NVDA 검색
  ↓ 동일한 캐시 사용
  ↓ 0.3초만에 응답! ⚡
  ✓ OpenAI 비용 절감
```

### 시나리오 2: 이메일 알림

```
10-Q 공시 발생 (NVDA)
  ↓
다음날 09:00 공시 체크
  ↓
자동 분석 + 이메일 발송
  ↓
"NVDA 10-Q 공시 분석 보고서" 수신
```

### 시나리오 3: 비인기 종목

```
사용자: COIN 검색
  ↓ 캐시 없음 (인기 8종목 아님)
  ↓ 실시간 분석 8-12초
  ↓ 3시간 캐시 저장
  ↓ 이후 3시간은 0.3초 응답
```

## 🔧 커스터마이징

### 인기 종목 변경

`app/api/cache/warmup/route.ts`:
```typescript
const POPULAR_TICKERS = [
  'NVDA', 'AAPL', 'TSLA', 'MSFT',  // 기존
  'NFLX', 'COIN', 'PLTR'           // 추가
];
```

### 캐시 시간 조정

`lib/cache-service.ts`:
```typescript
async setFullAnalysis(ticker: string, data: any) {
  return this.set(
    `stock:${ticker}:full`, 
    data, 
    7200  // 3시간 → 2시간
  );
}
```

### Cron 주기 변경

`vercel.json`:
```json
{
  "schedule": "0 */6 * * *"  // 3시간 → 6시간
}
```

## 📊 분석 지표

### 14가지 핵심 재무 지표
1. **P/E Ratio**: 주가수익비율
2. **Forward P/E**: 예상 P/E
3. **Market Cap**: 시가총액
4. **Revenue Growth YoY**: 전년 대비 매출 성장률
5. **Revenue Growth QoQ**: 전분기 대비 매출 성장률
6. **Net Income Growth YoY**: 전년 대비 순이익 성장률
7. **Net Income Growth QoQ**: 전분기 대비 순이익 성장률
8. **EPS Growth**: 주당순이익 성장률
9. **Gross Margin**: 매출총이익률
10. **Operating Margin**: 영업이익률
11. **Net Margin**: 순이익률
12. **ROE**: 자기자본이익률
13. **Debt-to-Equity**: 부채비율
14. **Current Price**: 현재 주가

### SEC 공시 모니터링
- **10-K**: 연간 보고서 (실적, 리스크, 경영진 분석)
- **10-Q**: 분기 보고서 (분기별 실적)
- **8-K**: 주요 사건 보고 (M&A, CEO 변경, 실적 발표 등)

### AI 투자 분석
- **투자 의견**: 매수 추천 / 보유 권장 / 매도 고려
- **신뢰도**: 0-100 점수
- **핵심 포인트**: 투자 근거 3-5개
- **리스크**: 잠재적 위험 요소
- **추천 이유**: 상세 설명

## 🛡️ 보안

- API 키는 절대 GitHub에 커밋하지 마세요
- `.env.local` 파일은 `.gitignore`에 포함되어 있습니다
- Vercel 환경 변수를 사용하여 안전하게 관리하세요
- `CRON_SECRET`을 설정하여 무단 API 호출을 방지하세요
- Supabase RLS (Row Level Security) 정책 활성화

## � 문서

- **[CACHE_WARMUP.md](./CACHE_WARMUP.md)**: 사전 캐싱 시스템 상세 가이드
- **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)**: Supabase 데이터베이스 설정
- **[VERCEL_SETUP.md](./VERCEL_SETUP.md)**: Vercel 배포 및 Cron Job 설정
- **[DATABASE_GUIDE.md](./DATABASE_GUIDE.md)**: 데이터베이스 스키마 및 쿼리
- **[PERFORMANCE.md](./PERFORMANCE.md)**: 성능 최적화 전략

## 🐛 문제 해결

### Cron이 실행 안 됨
```bash
# Vercel Dashboard 확인
1. Settings → Cron Jobs → 스케줄 확인
2. Deployments → Functions → 로그 확인
3. CRON_SECRET 환경 변수 설정 확인
```

### 캐시가 저장 안 됨
```sql
-- Supabase SQL Editor에서 확인
SELECT * FROM cache WHERE key LIKE 'stock:%';

-- 테이블 없으면 생성
-- supabase/schema.sql 실행
```

### OpenAI 비용이 높음
```typescript
// 1. 인기 종목 수 줄이기
const POPULAR_TICKERS = ['NVDA', 'AAPL']; // 8개 → 2개

// 2. Cron 주기 늘리기
"schedule": "0 */6 * * *"  // 3시간 → 6시간

// 3. 캐시 TTL 늘리기
setFullAnalysis(..., 21600)  // 3시간 → 6시간
```

### 분석이 느림
```bash
# 1. 캐시 확인
curl https://your-domain.vercel.app/api/stock/NVDA
# → fromCache: true 확인

# 2. 수동 캐시 워밍
curl -X GET https://your-domain.vercel.app/api/cache/warmup \
  -H "Authorization: Bearer $CRON_SECRET"

# 3. Supabase 연결 확인
# Vercel → Storage → Supabase 연동 상태 확인
```

## �📝 라이선스

MIT License

## 🤝 기여

이슈와 PR은 언제나 환영합니다!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## ⚠️ 면책 조항

이 도구는 정보 제공 목적으로만 사용됩니다. 투자 결정을 내리기 전에 항상 자체 조사를 수행하시고, 필요한 경우 전문 재무 고문과 상담하세요.

AI 분석 결과는 참고용이며, 투자 손실에 대한 책임은 투자자 본인에게 있습니다.

## 📧 문의

문제가 있거나 질문이 있으시면 GitHub Issues를 통해 문의해주세요.

**Repository**: https://github.com/losnah-think/Stock-News-Letter

---

**Made with ❤️ for Smart Investors | Happy Investing! 📈**
