/**
 * 암호화폐 캐시 워밍 API
 * 
 * 인기 암호화폐를 사전에 분석하여 캐시에 저장
 * Vercel Cron: 매 3시간마다 실행
 */

import { NextRequest, NextResponse } from 'next/server';
import { CryptoDataService } from '@/lib/crypto-service';
import { CryptoAIService } from '@/lib/crypto-ai-service';
import { CacheService } from '@/lib/cache-service';

export const maxDuration = 300; // 5분

const CRON_SECRET = process.env.CRON_SECRET;

// 인기 암호화폐 목록
const POPULAR_CRYPTOS = [
  'BTC',    // 비트코인
  'ETH',    // 이더리움
  'DOGE',   // 도지코인
  'XRP',    // 리플
  'SOL',    // 솔라나
  'ADA',    // 카르다노
];

export async function GET(request: NextRequest) {
  // Cron secret 검증
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  const results: any[] = [];

  console.log(`\n🔥 암호화폐 캐시 워밍 시작: ${new Date().toISOString()}`);
  console.log(`🪙 대상 코인: ${POPULAR_CRYPTOS.join(', ')}\n`);

  const cryptoService = new CryptoDataService();
  const aiService = new CryptoAIService();
  const cacheService = new CacheService();

  for (const symbol of POPULAR_CRYPTOS) {
    try {
      console.log(`📊 ${symbol} 워밍업 중...`);

      // 기존 캐시 확인
      const existing = await cacheService.get(`crypto:${symbol}:full`);
      
      if (existing) {
        const cachedAt = new Date(existing.generatedAt);
        const now = new Date();
        const ageMinutes = (now.getTime() - cachedAt.getTime()) / 1000 / 60;

        // 1시간 이내 캐시가 있으면 스킵
        if (ageMinutes < 60) {
          console.log(`⏭️  ${symbol} 스킵 - 캐시 ${ageMinutes.toFixed(1)}분 경과`);
          results.push({
            symbol,
            status: 'skipped',
            reason: `Cache ${ageMinutes.toFixed(1)} min old`
          });
          continue;
        }
      }

      // 암호화폐 데이터 가져오기
      const cryptoData = await cryptoService.getCryptoData(symbol);
      
      // 공포-탐욕 지수 (한 번만)
      if (symbol === 'BTC') {
        const fearGreedIndex = await cryptoService.getFearGreedIndex();
        cryptoData.fearGreedIndex = fearGreedIndex;
      }

      // AI 분석
      const recommendation = await aiService.analyzeCrypto(cryptoData);

      // 결과 조합
      const result = {
        ...cryptoData,
        recommendation,
        generatedAt: new Date().toISOString(),
        fromCache: false
      };

      // 캐시 저장
      await cacheService.setFullAnalysis(`crypto:${symbol}`, result);

      console.log(`✅ ${symbol} 워밍업 완료 - ${recommendation.decision} (${recommendation.confidence}%)`);

      results.push({
        symbol,
        status: 'success',
        decision: recommendation.decision,
        confidence: recommendation.confidence,
        price: cryptoData.price,
        cached_at: result.generatedAt
      });

      // API Rate Limit 방지 (1초 대기)
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error: any) {
      console.error(`❌ ${symbol} 워밍업 실패:`, error.message);
      results.push({
        symbol,
        status: 'failed',
        error: error.message
      });
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  const successful = results.filter(r => r.status === 'success').length;
  const skipped = results.filter(r => r.status === 'skipped').length;
  const failed = results.filter(r => r.status === 'failed').length;

  console.log(`\n🎉 암호화폐 캐시 워밍 완료 - ${duration}초 소요`);
  console.log(`✅ 성공: ${successful}, ⏭️  스킵: ${skipped}, ❌ 실패: ${failed}\n`);

  return NextResponse.json({
    success: true,
    warmup_time: new Date().toISOString(),
    duration_seconds: parseFloat(duration),
    total_cryptos: POPULAR_CRYPTOS.length,
    successful,
    skipped,
    failed,
    results,
    next_warmup: new Date(Date.now() + 3 * 3600 * 1000).toISOString()
  });
}
