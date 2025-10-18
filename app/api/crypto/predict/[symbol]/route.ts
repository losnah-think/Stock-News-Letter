/**
 * 코인 가격 예측 API
 * GET /api/crypto/predict/[symbol]
 * 
 * ⚠️ 재미로만 보세요! 정확하지 않을 수 있음!
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

  console.log(`\n🔮 가격 예측 요청: ${symbol}`);

  try {
    const cacheService = new CacheService();
    
    // 캐시 확인 (1시간)
    const cacheKey = `crypto:${symbol}:prediction`;
    const cached = await cacheService.get(cacheKey);
    
    if (cached) {
      console.log(`✅ 예측 캐시 히트: ${symbol}`);
      return NextResponse.json({
        ...cached,
        fromCache: true
      });
    }

    console.log(`❌ 예측 캐시 미스 - 새로운 예측 생성`);

    const cryptoService = new CryptoDataService();
    const aiService = new CryptoAIService();

    // 코인 데이터 가져오기
    const cryptoData = await cryptoService.getCryptoData(symbol);
    
    // 공포-탐욕 지수
    if (symbol === 'BTC') {
      const fearGreedIndex = await cryptoService.getFearGreedIndex();
      cryptoData.fearGreedIndex = fearGreedIndex;
    }

    // AI 가격 예측
    const prediction = await aiService.predictPrice(cryptoData);

    console.log(`🔮 ${symbol} 예측 완료`);
    console.log(`   1일 후: $${prediction.day1.price.toFixed(6)} (${prediction.day1.change > 0 ? '+' : ''}${prediction.day1.change.toFixed(2)}%)`);
    console.log(`   7일 후: $${prediction.day7.price.toFixed(6)} (${prediction.day7.change > 0 ? '+' : ''}${prediction.day7.change.toFixed(2)}%)`);
    console.log(`  30일 후: $${prediction.day30.price.toFixed(6)} (${prediction.day30.change > 0 ? '+' : ''}${prediction.day30.change.toFixed(2)}%)`);

    const result = {
      symbol,
      name: cryptoData.name,
      currentPrice: cryptoData.price,
      prediction,
      generatedAt: new Date().toISOString()
    };

    // 캐시 저장 (1시간)
    await cacheService.set(cacheKey, result, 3600);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error(`❌ 가격 예측 실패 (${symbol}):`, error.message);
    return NextResponse.json(
      { 
        error: '가격 예측 실패',
        message: error.message,
        symbol 
      },
      { status: 500 }
    );
  }
}
