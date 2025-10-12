import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@/lib/email-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ticker, email } = body;

    if (!ticker || !email) {
      return NextResponse.json(
        { error: '티커와 이메일이 필요합니다' },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: '유효한 이메일 주소를 입력해주세요' },
        { status: 400 }
      );
    }

    // Send confirmation email
    const emailService = new EmailService();
    const subject = `${ticker} 공시 알림 구독 완료`;
    const content = `
# ${ticker} 공시 알림 구독 완료

안녕하세요!

**${ticker}** 종목의 공시 알림 구독이 완료되었습니다.

## 구독 정보
- **종목**: ${ticker}
- **이메일**: ${email}
- **발송 시기**: 새로운 SEC 공시 발생 시 (실시간)

새로운 공시(10-K, 10-Q, 8-K 등)가 나올 때마다 다음 내용을 받아보실 수 있습니다:
- 📋 공시 내용 요약
- 🤖 AI 기반 투자 판단 (매수/보유/매도)
- 📊 재무제표 핵심 지표 분석
- 📈 분기별 실적 추이

구독해주셔서 감사합니다!

---

*구독을 취소하시려면 이 이메일에 회신해주세요.*
    `;

    await emailService.sendNewsletter(email, subject, content);

    return NextResponse.json({
      success: true,
      message: '구독이 완료되었습니다',
      ticker,
      email,
    });
  } catch (error) {
    console.error('구독 처리 중 오류:', error);
    return NextResponse.json(
      { error: '구독 처리 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
