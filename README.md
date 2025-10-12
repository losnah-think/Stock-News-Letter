# Stock Newsletter - AI 주식 분석 시스템

매일 아침 관심 있는 주식의 공시, 재무제표, AI 분석 리포트를 자동으로 받아보세요!

## 🚀 주요 기능

- **SEC 공시 자동 수집**: 10-K, 10-Q, 8-K 등 주요 공시 실시간 모니터링
- **재무제표 분석**: 매출, 순이익, 성장률 등 핵심 지표 추적
- **AI 투자 판단**: GPT-4 기반 전문가 수준의 투자 추천
- **매일 아침 알림**: 설정한 시간에 자동으로 이메일 발송

## 📋 요구사항

- Node.js 18.x 이상
- OpenAI API Key (GPT-4 사용)
- Gmail 계정 (알림용)

## ⚙️ 설치 및 설정

### 1. 프로젝트 클론 및 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

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

### 3. 로컬 개발 서버 실행

```bash
npm run dev
```

http://localhost:3000 에서 확인할 수 있습니다.

## 🌐 Vercel 배포

### 1. GitHub에 푸시

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

### 2. Vercel에 배포

1. [Vercel](https://vercel.com)에 로그인
2. "New Project" 클릭
3. GitHub 레포지토리 선택
4. Environment Variables에 `.env.local`의 모든 변수 입력
5. "Deploy" 클릭

### 3. Cron Job 자동 실행

`vercel.json` 파일이 이미 설정되어 있어 매일 오전 0시 (UTC)에 자동으로 분석이 실행됩니다.

한국 시간 오전 9시로 변경하려면 `vercel.json`의 `schedule`을 수정하세요:

```json
{
  "crons": [
    {
      "path": "/api/analyze",
      "schedule": "0 0 * * *"
    }
  ]
}
```

크론 표현식:
- `0 0 * * *`: 매일 오전 0시 (UTC) = 오전 9시 (KST)
- `0 9 * * *`: 매일 오전 9시 (UTC) = 오후 6시 (KST)

## 📡 API 엔드포인트

### 특정 종목 분석

```bash
GET /api/stock/NVDA
```

응답 예시:
```json
{
  "ticker": "NVDA",
  "financialData": { ... },
  "recommendation": {
    "decision": "BUY",
    "confidence": 85,
    "reasoning": "...",
    "keyPoints": [...],
    "risks": [...],
    "targetPrice": 150.00
  },
  "recentFilings": [...],
  "summary": "..."
}
```

### 일일 자동 분석 (Cron)

```bash
GET /api/analyze
Header: Authorization: Bearer YOUR_CRON_SECRET
```

## 🎯 사용 예시

### 1. NVIDIA (NVDA) 분석 받기

환경 변수에 설정:
```
STOCK_TICKERS=NVDA
```

매일 아침 다음과 같은 내용을 이메일로 받습니다:
- 최신 주가 및 시가총액
- 매출/순이익 성장률 (QoQ, YoY)
- 수익성 지표 (마진율, ROE)
- AI 기반 투자 판단 (매수/보유/매도)
- 최근 SEC 공시 요약
- 분기별 실적 추이

### 2. 여러 종목 모니터링

```
STOCK_TICKERS=NVDA,TSLA,AAPL,MSFT
```

각 종목별로 개별 분석 리포트를 받습니다.

## 🔧 커스터마이징

### AI 프롬프트 수정

`lib/ai-analysis-service.ts`의 `buildAnalysisPrompt` 함수를 수정하여 분석 스타일을 변경할 수 있습니다.

### 이메일 템플릿 변경

`lib/email-service.ts`의 `wrapInEmailTemplate` 함수에서 HTML 템플릿을 수정할 수 있습니다.

### 크론 스케줄 변경

`vercel.json`의 `schedule` 값을 수정하여 실행 시간을 변경할 수 있습니다.

## 📊 분석 항목

### 재무제표 지표
- 매출 성장률 (QoQ, YoY)
- 순이익 성장률 (QoQ, YoY)
- EPS 성장률
- 매출총이익률
- 영업이익률
- 순이익률
- 자기자본이익률 (ROE)
- 부채비율
- 유동비율

### SEC 공시
- 10-K (연간 보고서)
- 10-Q (분기 보고서)
- 8-K (주요 사건 보고)

### AI 분석
- 투자 판단 (강력매수/매수/보유/매도/강력매도)
- 신뢰도 점수
- 핵심 강점
- 잠재 리스크
- 성장 기회
- 목표 주가 (선택사항)

## 🛡️ 보안

- API 키는 절대 GitHub에 커밋하지 마세요
- `.env.local` 파일은 `.gitignore`에 포함되어 있습니다
- Vercel 환경 변수를 사용하여 안전하게 관리하세요
- `CRON_SECRET`을 설정하여 무단 API 호출을 방지하세요

## 📝 라이선스

MIT License

## 🤝 기여

이슈와 PR은 언제나 환영합니다!

## ⚠️ 면책 조항

이 도구는 정보 제공 목적으로만 사용됩니다. 투자 결정을 내리기 전에 항상 자체 조사를 수행하시고, 필요한 경우 전문 재무 고문과 상담하세요.

## 📧 문의

문제가 있거나 질문이 있으시면 GitHub Issues를 통해 문의해주세요.

---

**Happy Investing! 📈**
