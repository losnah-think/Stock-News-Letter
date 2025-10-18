/**
 * 암호화폐 분석 API
 * GET /api/crypto/[symbol]
 */

import { NextRequest, NextResponse } from 'next/server';
import { CryptoDataService } from '@/lib/crypto-service';
import { CryptoAIService } from '@/lib/crypto-ai-service';
import { CacheService } from '@/lib/cache-service';

export const maxDuration = 30;

export async function GET(
  request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  const symbol = params.symbol.toUpperCase();

  console.log(`\n🪙 암호화폐 분석 요청: ${symbol}`);

  try {
    // 캐시 확인
    const cacheService = new CacheService();
    const cachedData = await cacheService.getFullAnalysis(`crypto:${symbol}`);

    if (cachedData) {
      console.log(`✅ 캐시 히트: crypto:${symbol}`);
      return NextResponse.json({
        ...cachedData,
        fromCache: true,
        cachedAt: new Date().toISOString()
      });
    }

    console.log(`❌ 캐시 미스: crypto:${symbol} - 새로운 분석 시작`);

    // 1. 암호화폐 데이터 가져오기
    const cryptoService = new CryptoDataService();
    const cryptoData = await cryptoService.getCryptoData(symbol);

    console.log(`📊 ${symbol} 데이터 조회 완료`);

    // 2. 공포-탐욕 지수 가져오기
    const fearGreedIndex = await cryptoService.getFearGreedIndex();
    cryptoData.fearGreedIndex = fearGreedIndex;

    // 3. AI 분석
    const aiService = new CryptoAIService();
    const recommendation = await aiService.analyzeCrypto(cryptoData);

    console.log(`🤖 AI 분석 완료: ${recommendation.decision} (${recommendation.confidence}%)`);

    // 결과 조합
    const result = {
      ...cryptoData,
      recommendation,
      generatedAt: new Date().toISOString(),
      fromCache: false
    };

    // 캐시 저장 (3시간)
    await cacheService.setFullAnalysis(`crypto:${symbol}`, result);
    console.log(`💾 캐시 저장 완료: crypto:${symbol}`);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error(`❌ 암호화폐 분석 실패 (${symbol}):`, error.message);
    return NextResponse.json(
      { 
        error: '암호화폐 분석 실패',
        message: error.message,
        symbol 
      },
      { status: 500 }
    );
  }
}
