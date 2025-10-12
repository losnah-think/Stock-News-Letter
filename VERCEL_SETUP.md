# 🚀 Vercel 배포 가이드

## 1. Vercel 프로젝트 생성

1. [Vercel](https://vercel.com)에 로그인
2. **New Project** 클릭
3. GitHub 저장소 `losnah-think/Stock-News-Letter` 선택
4. **Import** 클릭

## 2. 환경 변수 설정

Vercel 프로젝트 설정에서 다음 환경 변수들을 추가하세요:

### 필수 환경 변수

```bash
# OpenAI API Key
OPENAI_API_KEY=your_openai_api_key_here

# Gmail 설정 (이메일 발송용)
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_gmail_app_password

# Cron Job 보안 키 (임의의 문자열)
CRON_SECRET=your_random_secret_key_here
```

### 선택사항 (Cron Job으로 자동 알림 받으려면)

Cron Job을 통해 특정 종목들을 자동으로 모니터링하고 싶다면 추가:

```bash
# 알림 받을 이메일 주소 (쉼표로 구분)
NOTIFICATION_EMAIL=chlrkfka111@naver.com,thor.choi@sotatek.com

# 모니터링할 주식 티커 (쉼표로 구분)
STOCK_TICKERS=NVDA,TSLA,AAPL
```

⚠️ **참고**: 웹사이트에서 개별 종목 검색 및 이메일 구독 기능을 사용할 수 있으므로, 위 환경 변수는 선택사항입니다.

### Gmail 앱 비밀번호 생성 방법

1. Google 계정 → **보안** → **2단계 인증** 활성화
2. **앱 비밀번호** 생성
3. 생성된 16자리 비밀번호를 `EMAIL_PASSWORD`에 입력

## 3. 배포

1. 환경 변수 설정 완료 후 **Deploy** 클릭
2. 배포 완료 후 프로젝트 URL 확인 (예: `https://your-project.vercel.app`)

## 4. Cron Job 설정 확인

배포 후 Vercel 대시보드에서:

1. **Settings** → **Cron Jobs** 메뉴 확인
2. `/api/check-filings` 엔드포인트가 **매일 1회** 실행되는지 확인
   - 스케줄: `0 9 * * 1-6` (월~토, 매일 오전 9시)
   - ⚠️ Vercel 무료 플랜(Hobby)은 하루 1회만 지원

## 5. 이메일 알림 작동 방식

### 자동 체크 스케줄
- **매일 오전 9시** 자동 실행
- **월요일 ~ 토요일**만 작동 (일요일 제외)
- Vercel 무료 플랜 제한으로 하루 1회만 체크

### 이메일 발송 조건
- ✅ **지난 24시간 내 공시가 있을 때만** 이메일 발송
- ❌ 공시가 없으면 조용히 체크만 하고 이메일 안 보냄
- 📧 여러 종목에 공시가 있을 경우 → **1개의 통합 이메일**로 발송

## 6. 테스트

### 수동 테스트 방법
배포 후 브라우저에서 다음 URL 접속:

```
https://your-project.vercel.app/api/check-filings
```

**헤더에 인증 추가 필요:**
```
Authorization: Bearer your_cron_secret_here
```

### 응답 예시
```json
{
  "success": true,
  "results": [
    {
      "ticker": "NVDA",
      "hasNewFilings": true,
      "filings": [...]
    },
    {
      "ticker": "TSLA",
      "hasNewFilings": false,
      "message": "새로운 공시 없음"
    }
  ],
  "emailSent": true,
  "tickersWithNewFilings": ["NVDA"],
  "message": "1개 종목 공시 발견 - 이메일 발송 완료",
  "timestamp": "2025-10-12T..."
}
```

## 7. 모니터링

### Vercel 로그 확인
1. Vercel 대시보드 → **Deployments**
2. 최근 배포 클릭 → **Functions** 탭
3. `/api/check-filings` 함수의 실행 로그 확인

### 주요 로그 메시지
- `✅ 새로운 공시 없음 - 이메일 발송 안 함`: 정상 작동 (공시 없음)
- `📧 N개 종목에 새로운 공시 발견! 통합 이메일 발송 중...`: 이메일 발송됨
- `일요일에는 체크하지 않습니다.`: 일요일 스킵됨

## 8. 주요 기능

### 📊 메인 페이지
- 주식 티커 검색 및 실시간 분석
- 진입가 입력 → 수익률 자동 계산
- AI 기반 투자 의견 (매수/보유/매도)
- 연관 뉴스 표시
- **개별 종목 이메일 구독 기능**

### 📧 이메일 알림
- 웹사이트에서 원하는 종목 검색 후 이메일 구독
- 또는 환경 변수로 자동 모니터링 설정 가능
- SEC 공시 발견 시 자동 발송
- GPT-4 기반 상세 분석
- 재무 지표 분석
- 투자 의견 및 신뢰도

### 🔍 사용 방법
1. **개별 구독**: 웹사이트에서 티커 검색 → 이메일 입력 → 구독
2. **자동 모니터링** (선택): 환경 변수로 `STOCK_TICKERS`, `NOTIFICATION_EMAIL` 설정

## 9. 문제 해결

### 이메일이 안 오는 경우
1. Gmail 앱 비밀번호 재확인
2. Vercel 환경 변수 설정 확인
3. Vercel Functions 로그에서 에러 확인
4. 실제로 새로운 공시가 있는지 확인

### Cron Job이 실행 안 되는 경우
1. Vercel 프로젝트가 Pro 플랜인지 확인 (무료 플랜도 지원되지만 제한 있음)
2. `vercel.json` 파일이 정상적으로 배포되었는지 확인
3. Vercel 대시보드에서 Cron Jobs 상태 확인

## 10. 추가 설정 (선택사항)

### 모니터링 종목 추가
`STOCK_TICKERS` 환경 변수에 티커 추가:
```
STOCK_TICKERS=NVDA,TSLA,AAPL,MSFT,GOOGL
```

### 알림 이메일 추가
`NOTIFICATION_EMAIL` 환경 변수에 이메일 추가:
```
NOTIFICATION_EMAIL=email1@example.com,email2@example.com,email3@example.com
```

---

## 🎉 완료!

배포가 완료되면:
- 웹사이트: `https://your-project.vercel.app`
- 자동 공시 체크: 매일 오전 9시 (월~토)
- 이메일 알림: 공시 발견 시 자동 발송

### 이메일 구독 방법
1. **개별 구독** (추천): 웹사이트에서 원하는 종목 검색 → 이메일 입력 → 구독 버튼 클릭
2. **자동 모니터링**: Vercel 환경 변수에 `STOCK_TICKERS`와 `NOTIFICATION_EMAIL` 설정

문제가 있으면 Vercel Functions 로그를 확인하세요!
