import { NextRequest, NextResponse } from 'next/server';
import { SECDataService } from '@/lib/sec-service';
import { FinancialDataService } from '@/lib/financial-service';
import { AIAnalysisService } from '@/lib/ai-analysis-service';
import { NewsService } from '@/lib/news-service';
import { CacheService } from '@/lib/cache-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 30; // Set max duration to 30 seconds for faster timeout

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const ticker = params.ticker?.toUpperCase();

  if (!ticker) {
    return NextResponse.json({ error: 'Ticker parameter is required' }, { status: 400 });
  }

  try {
    const cacheService = new CacheService();

    // 🚀 캐시 확인
    const cachedData = await cacheService.getFullAnalysis(ticker);
    if (cachedData) {
      const cacheAge = Math.floor((Date.now() - new Date(cachedData.generatedAt).getTime()) / 1000 / 60);
      console.log(`✅ [${ticker}] Cache hit (${cacheAge}분 경과)`);
      return NextResponse.json({
        ...cachedData,
        fromCache: true,
        cachedAt: cachedData.generatedAt,
      });
    }

    console.log(`❌ [${ticker}] Cache miss - 새로운 분석 시작`);

    const secService = new SECDataService();
    const financialService = new FinancialDataService();
    const aiService = new AIAnalysisService(process.env.OPENAI_API_KEY || '');
    const newsService = new NewsService();

    // Gather essential data only (optimized for speed)
    const [financialData, recentFilingsResult, news] = await Promise.all([
      financialService.getFinancialAnalysis(ticker),
      secService.hasNewFilings(ticker, 7), // Last 7 days
      newsService.getNews(ticker, 5), // Reduced from 10 to 5 for faster loading
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

    const result = {
      ticker,
      financialData,
      recommendation,
      recentFilings: recentFilingsResult.filings,
      news,
      generatedAt: new Date().toISOString(),
      fromCache: false,
    };

    // 💾 캐시 저장 (3시간 TTL)
    await cacheService.setFullAnalysis(ticker, result);
    console.log(`💾 [${ticker}] 캐시 저장 완료 (3시간 유효)`);

    return NextResponse.json(result);
  } catch (error) {
    console.error(`Error analyzing ${ticker}:`, error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
