/**
 * 오늘의 코인 추천 API
 * GET /api/crypto/recommendations
 * 
 * ⚠️ 재미로만 보세요! 투자 권유 아님!
 */

import { NextRequest, NextResponse } from 'next/server';
import { CryptoDataService } from '@/lib/crypto-service';
import { CryptoAIService } from '@/lib/crypto-ai-service';
import { CacheService } from '@/lib/cache-service';

export const maxDuration = 60;

// 추천 대상 코인
const RECOMMENDATION_COINS = ['BTC', 'ETH', 'DOGE', 'XRP', 'SOL', 'ADA'];

export async function GET(request: NextRequest) {
  console.log(`\n🎯 오늘의 코인 추천 요청`);

  try {
    const cacheService = new CacheService();
    
    // 캐시 확인 (30분)
    const cacheKey = 'crypto:recommendations:today';
    const cached = await cacheService.get(cacheKey);
    
    if (cached) {
      console.log(`✅ 추천 캐시 히트`);
      return NextResponse.json({
        ...cached,
        fromCache: true
      });
    }

    console.log(`❌ 추천 캐시 미스 - 새로운 추천 생성`);

    const cryptoService = new CryptoDataService();
    const aiService = new CryptoAIService();

    // 코인 데이터 가져오기
    const coinsData = await cryptoService.getMultipleCryptos(RECOMMENDATION_COINS);
    
    if (!coinsData || coinsData.length === 0) {
      throw new Error('코인 데이터를 가져올 수 없습니다.');
    }

    // 간단한 기술적 지표 추가
    const enrichedCoins = coinsData.map((coin: any) => ({
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      price: coin.current_price,
      change24h: coin.price_change_percentage_24h || 0,
      change7d: coin.price_change_percentage_7d_in_currency || 0,
      marketCap: `${(coin.market_cap / 1e9).toFixed(2)}B`,
      technicalIndicators: {
        rsi: coin.price_change_percentage_7d_in_currency 
          ? 50 + (coin.price_change_percentage_7d_in_currency * 2)
          : 50,
        trend: coin.price_change_percentage_7d_in_currency > 5 ? 'BULLISH' 
             : coin.price_change_percentage_7d_in_currency < -5 ? 'BEARISH' 
             : 'NEUTRAL'
      }
    }));

    // AI 추천 생성
    const recommendations = await aiService.getTodayRecommendations(enrichedCoins);

    console.log(`🎉 추천 생성 완료`);
    console.log(`🔥 Hot Pick: ${recommendations.hotPick.symbol}`);
    console.log(`⭐ Rising Star: ${recommendations.risingStar.symbol}`);
    console.log(`🛡️ Safe Haven: ${recommendations.safeHaven.symbol}`);

    const result = {
      ...recommendations,
      generatedAt: new Date().toISOString(),
      coins: enrichedCoins
    };

    // 캐시 저장 (1시간)
    await cacheService.set(cacheKey, result, 3600);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error(`❌ 추천 생성 실패:`, error.message);
    return NextResponse.json(
      { 
        error: '추천을 생성할 수 없습니다.',
        message: error.message 
      },
      { status: 500 }
    );
  }
}
