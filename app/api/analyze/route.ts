import { NextRequest, NextResponse } from 'next/server';
import { SECDataService } from '@/lib/sec-service';
import { FinancialDataService } from '@/lib/financial-service';
import { AIAnalysisService } from '@/lib/ai-analysis-service';
import { EmailService } from '@/lib/email-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Vercel max duration

export async function GET(request: NextRequest) {
  try {
    // Check if today is Sunday (0 = Sunday, 6 = Saturday)
    const today = new Date();
    const dayOfWeek = today.getDay();
    
    if (dayOfWeek === 0) {
      return NextResponse.json({ 
        success: false,
        message: '일요일에는 분석을 실행하지 않습니다.',
        dayOfWeek: '일요일'
      });
    }

    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET || 'your-secret-key'}`;
    
    // Simple auth check for cron jobs
    if (authHeader !== expectedAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tickers = (process.env.STOCK_TICKERS || 'NVDA').split(',').map(t => t.trim());
    const results = [];

    for (const ticker of tickers) {
      try {
        console.log(`Analyzing ${ticker}...`);
        const result = await analyzeStock(ticker);
        results.push(result);
      } catch (error) {
        console.error(`Error analyzing ${ticker}:`, error);
        results.push({ ticker, error: 'Analysis failed' });
      }
    }

    return NextResponse.json({ 
      success: true, 
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in daily analysis:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

async function analyzeStock(ticker: string) {
  // Initialize services
  const secService = new SECDataService();
  const financialService = new FinancialDataService();
  const aiService = new AIAnalysisService(process.env.OPENAI_API_KEY || '');
  const emailService = new EmailService();

  // Gather data
  console.log(`Fetching data for ${ticker}...`);
  const [financialData, recentFilingsResult] = await Promise.all([
    financialService.getFinancialAnalysis(ticker),
    secService.hasNewFilings(ticker, 1) // Check last 24 hours
  ]);

  if (!financialData) {
    throw new Error(`Failed to fetch financial data for ${ticker}`);
  }

  // Get AI analysis
  console.log(`Analyzing ${ticker} with AI...`);
  const recommendation = await aiService.analyzeStock(
    ticker,
    financialData,
    recentFilingsResult.filings
  );

  // Generate email content
  const emailContent = aiService.generateEmailSummary(
    ticker,
    financialData,
    recommendation,
    recentFilingsResult.filings
  );

  // Send email
  const emailTo = process.env.NOTIFICATION_EMAIL || '';
  if (emailTo) {
    const subject = `📊 ${ticker} 일일 분석 리포트 - ${recommendation.decision} (${new Date().toLocaleDateString('ko-KR')})`;
    await emailService.sendNewsletter(emailTo, subject, emailContent);
    console.log(`Email sent for ${ticker}`);
  }

  return {
    ticker,
    decision: recommendation.decision,
    confidence: recommendation.confidence,
    currentPrice: financialData.currentPrice,
    revenueGrowthYoY: financialData.revenueGrowthYoY,
    newFilings: recentFilingsResult.hasNew,
    emailSent: !!emailTo,
  };
}
