import { NextRequest, NextResponse } from 'next/server';
import { SECDataService } from '@/lib/sec-service';
import { FinancialDataService } from '@/lib/financial-service';
import { AIAnalysisService } from '@/lib/ai-analysis-service';
import { NewsService } from '@/lib/news-service';
import { CacheService } from '@/lib/cache-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for warming up multiple stocks

// 인기 종목 리스트
const POPULAR_TICKERS = ['NVDA', 'AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN', 'META', 'AMD'];

export async function GET(request: NextRequest) {
  try {
    // Cron secret 검증
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET || 'your-secret-key'}`;
    
    if (authHeader !== expectedAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startTime = new Date();
    const results: any[] = [];

    console.log(`🔥 Starting cache warmup for ${POPULAR_TICKERS.length} stocks at ${startTime.toISOString()}`);

    const cacheService = new CacheService();
    const secService = new SECDataService();
    const financialService = new FinancialDataService();
    const aiService = new AIAnalysisService(process.env.OPENAI_API_KEY || '');
    const newsService = new NewsService();

    // 각 종목을 순차적으로 분석 (병렬 처리하면 API 제한 걸릴 수 있음)
    for (const ticker of POPULAR_TICKERS) {
      try {
        console.log(`📊 Warming up ${ticker}...`);

        // 기존 캐시가 아직 유효한지 확인 (1시간 이내면 스킵)
        const existingCache = await cacheService.getFullAnalysis(ticker);
        if (existingCache) {
          const cachedAt = new Date(existingCache.generatedAt);
          const ageMinutes = (Date.now() - cachedAt.getTime()) / (1000 * 60);
          
          if (ageMinutes < 60) {
            console.log(`⏭️  Skipping ${ticker} - cache still fresh (${ageMinutes.toFixed(1)} min old)`);
            results.push({
              ticker,
              status: 'skipped',
              reason: 'Cache still fresh',
              age_minutes: ageMinutes.toFixed(1),
            });
            continue;
          }
        }

        // 데이터 수집
        const [financialData, recentFilingsResult, news] = await Promise.all([
          financialService.getFinancialAnalysis(ticker),
          secService.hasNewFilings(ticker, 7),
          newsService.getNews(ticker, 5),
        ]);

        if (!financialData) {
          console.log(`❌ Failed to fetch financial data for ${ticker}`);
          results.push({
            ticker,
            status: 'failed',
            reason: 'Financial data fetch failed',
          });
          continue;
        }

        // AI 분석
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

        // 캐시 저장 (3시간)
        await cacheService.setFullAnalysis(ticker, result);

        console.log(`✅ Successfully warmed up ${ticker}`);
        results.push({
          ticker,
          status: 'success',
          decision: recommendation.decision,
          confidence: recommendation.confidence,
          price: financialData.currentPrice,
          cached_at: result.generatedAt,
        });

        // API 레이트 리밋 방지를 위한 딜레이 (1초)
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`❌ Error warming up ${ticker}:`, error);
        results.push({
          ticker,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const endTime = new Date();
    const duration = (endTime.getTime() - startTime.getTime()) / 1000;

    const summary = {
      success: true,
      warmup_time: startTime.toISOString(),
      duration_seconds: duration,
      total_stocks: POPULAR_TICKERS.length,
      successful: results.filter(r => r.status === 'success').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      failed: results.filter(r => r.status === 'failed' || r.status === 'error').length,
      results,
      next_warmup: new Date(startTime.getTime() + 3 * 60 * 60 * 1000).toISOString(), // 3시간 후
    };

    console.log(`🎉 Cache warmup completed in ${duration}s`);
    console.log(`✅ Success: ${summary.successful}, ⏭️  Skipped: ${summary.skipped}, ❌ Failed: ${summary.failed}`);

    return NextResponse.json(summary);

  } catch (error) {
    console.error('Cache warmup error:', error);
    return NextResponse.json({
      success: false,
      error: 'Warmup failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
