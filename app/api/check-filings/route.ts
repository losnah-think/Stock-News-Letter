import { NextRequest, NextResponse } from 'next/server';
import { SECDataService } from '@/lib/sec-service';
import { FinancialDataService } from '@/lib/financial-service';
import { AIAnalysisService } from '@/lib/ai-analysis-service';
import { EmailService } from '@/lib/email-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    // Check if today is Sunday
    const today = new Date();
    const dayOfWeek = today.getDay();
    
    if (dayOfWeek === 0) {
      return NextResponse.json({ 
        success: false,
        message: '일요일에는 체크하지 않습니다.',
      });
    }

    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET || 'your-secret-key'}`;
    
    if (authHeader !== expectedAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tickers = (process.env.STOCK_TICKERS || 'NVDA').split(',').map(t => t.trim());
    const allResults = [];
    const tickersWithFilings = [];

    // 모든 종목 체크
    for (const ticker of tickers) {
      try {
        console.log(`Checking filings for ${ticker}...`);
        const result = await checkFilings(ticker);
        allResults.push(result);
        
        if (result.hasNewFilings) {
          tickersWithFilings.push(result);
        }
      } catch (error) {
        console.error(`Error checking ${ticker}:`, error);
        allResults.push({ ticker, error: 'Check failed' });
      }
    }

    // ⚠️ 공시가 있을 때만 이메일 발송
    if (tickersWithFilings.length > 0) {
      console.log(`📧 ${tickersWithFilings.length}개 종목에 새로운 공시 발견! 통합 이메일 발송 중...`);
      await sendConsolidatedEmail(tickersWithFilings);
    } else {
      console.log('✅ 새로운 공시 없음 - 이메일 발송 안 함');
    }

    return NextResponse.json({ 
      success: true, 
      results: allResults,
      emailSent: tickersWithFilings.length > 0,
      tickersWithNewFilings: tickersWithFilings.map(t => t.ticker),
      message: tickersWithFilings.length > 0 
        ? `${tickersWithFilings.length}개 종목 공시 발견 - 이메일 발송 완료` 
        : '새로운 공시 없음 - 이메일 발송 안 함',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in filing check:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

async function checkFilings(ticker: string) {
  const secService = new SECDataService();
  const financialService = new FinancialDataService();
  const aiService = new AIAnalysisService(process.env.OPENAI_API_KEY || '');

  // Check for new filings in the last 3 hours
  console.log(`Checking for new filings for ${ticker}...`);
  const recentFilingsResult = await secService.hasNewFilings(ticker, 0.125); // 3 hours

  if (!recentFilingsResult.hasNew) {
    console.log(`No new filings for ${ticker}`);
    return {
      ticker,
      hasNewFilings: false,
      message: '새로운 공시 없음',
    };
  }

  console.log(`New filings found for ${ticker}!`);

  // Get financial data and analyze
  const financialData = await financialService.getFinancialAnalysis(ticker);

  if (!financialData) {
    throw new Error(`Failed to fetch financial data for ${ticker}`);
  }

  // Get AI analysis
  const recommendation = await aiService.analyzeStock(
    ticker,
    financialData,
    recentFilingsResult.filings
  );

  return {
    ticker,
    hasNewFilings: true,
    filings: recentFilingsResult.filings,
    financialData,
    recommendation,
  };
}

async function sendConsolidatedEmail(tickersData: any[]) {
  const emailService = new EmailService();
  const aiService = new AIAnalysisService(process.env.OPENAI_API_KEY || '');

  // 통합 이메일 컨텐츠 생성
  let consolidatedContent = `
# 📊 SNL 일일 공시 리포트

**${new Date().toLocaleDateString('ko-KR')}**

오늘 ${tickersData.length}개 종목에서 새로운 공시가 발견되었습니다.

---

`;

  // 각 종목별 요약 추가
  for (const data of tickersData) {
    const emailContent = aiService.generateEmailSummary(
      data.ticker,
      data.financialData,
      data.recommendation,
      data.filings
    );
    
    consolidatedContent += emailContent + '\n\n---\n\n';
  }

  consolidatedContent += `
**📋 요약**

${tickersData.map(d => `- **${d.ticker}**: ${d.recommendation.decision} (신뢰도 ${d.recommendation.confidence}%)`).join('\n')}

---

*본 리포트는 SNL(Stock News Letter)에서 자동으로 생성되었습니다.*
  `;

  // 이메일 발송
  const emailTo = process.env.NOTIFICATION_EMAIL || '';
  if (emailTo) {
    const tickerList = tickersData.map(d => d.ticker).join(', ');
    const subject = `🚨 SNL 일일 공시 리포트 - ${tickerList} (${new Date().toLocaleDateString('ko-KR')})`;
    await emailService.sendNewsletter(emailTo, subject, consolidatedContent);
    console.log(`Consolidated email sent for: ${tickerList}`);
  }
}
