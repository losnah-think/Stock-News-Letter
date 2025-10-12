import { NextRequest, NextResponse } from 'next/server';
import { SECDataService } from '@/lib/sec-service';
import { FinancialDataService } from '@/lib/financial-service';
import { AIAnalysisService } from '@/lib/ai-analysis-service';
import { NewsService } from '@/lib/news-service';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const ticker = params.ticker?.toUpperCase();

  if (!ticker) {
    return NextResponse.json({ error: 'Ticker parameter is required' }, { status: 400 });
  }

  try {
    const secService = new SECDataService();
    const financialService = new FinancialDataService();
    const aiService = new AIAnalysisService(process.env.OPENAI_API_KEY || '');
    const newsService = new NewsService();

    // Gather all data including news
    const [financialData, recentFilingsResult, latest10K, latest10Q, news] = await Promise.all([
      financialService.getFinancialAnalysis(ticker),
      secService.hasNewFilings(ticker, 7), // Last 7 days
      secService.getLatest10K(ticker),
      secService.getLatest10Q(ticker),
      newsService.getNews(ticker, 10), // Get 10 latest news
    ]);

    if (!financialData) {
      return NextResponse.json({ error: 'Failed to fetch financial data' }, { status: 500 });
    }

    // Get AI recommendation
    const recommendation = await aiService.analyzeStock(
      ticker,
      financialData,
      recentFilingsResult.filings
    );

    // Generate summary
    const summary = aiService.generateEmailSummary(
      ticker,
      financialData,
      recommendation,
      recentFilingsResult.filings
    );

    return NextResponse.json({
      ticker,
      financialData,
      recommendation,
      recentFilings: recentFilingsResult.filings,
      latest10K,
      latest10Q,
      news, // Add news to response
      summary,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`Error analyzing ${ticker}:`, error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
