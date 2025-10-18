'use client';

import { useState } from 'react';

interface CryptoAnalysis {
  symbol: string;
  name: string;
  price: number;
  priceKRW: number;
  marketCap: string;
  marketCapKRW: string;
  rank: number;
  volume24h: string;
  volume24hKRW: string;
  high24h: number;
  low24h: number;
  change24h: number;
  change7d: number;
  change30d: number;
  circulatingSupply: string;
  totalSupply: string;
  maxSupply: string | null;
  ath: number;
  athChange: number;
  athDate: string;
  dominance: number | null;
  fearGreedIndex: number | null;
  technicalIndicators: {
    rsi: number | null;
    trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    support: number | null;
    resistance: number | null;
  };
  recommendation: {
    decision: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
    confidence: number;
    reasoning: string;
    keyPoints: string[];
    risks: string[];
    targetPrice: number | null;
    timeHorizon: string;
  };
  generatedAt: string;
  fromCache: boolean;
  cachedAt?: string;
}

export default function CryptoPage() {
  const [analysis, setAnalysis] = useState<CryptoAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchSymbol, setSearchSymbol] = useState('');

  // 인기 코인
  const popularCoins = [
    { symbol: 'BTC', name: '비트코인', emoji: '₿' },
    { symbol: 'ETH', name: '이더리움', emoji: 'Ξ' },
    { symbol: 'DOGE', name: '도지코인', emoji: '🐕' },
    { symbol: 'XRP', name: '리플', emoji: '💧' },
    { symbol: 'ADA', name: '카르다노', emoji: '🔷' },
    { symbol: 'SOL', name: '솔라나', emoji: '◎' },
    { symbol: 'MATIC', name: '폴리곤', emoji: '⬡' },
    { symbol: 'DOT', name: '폴카닷', emoji: '●' },
  ];

  const handleSearch = async (symbol: string) => {
    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const response = await fetch(`/api/crypto/${symbol}`);
      
      if (!response.ok) {
        throw new Error('코인 데이터를 가져올 수 없습니다.');
      }

      const data = await response.json();
      setAnalysis(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getDecisionText = (decision: string) => {
    switch (decision) {
      case 'STRONG_BUY': return '적극 매수 추천';
      case 'BUY': return '매수 추천';
      case 'HOLD': return '보유 권장';
      case 'SELL': return '매도 고려';
      case 'STRONG_SELL': return '즉시 매도';
      default: return '보유 권장';
    }
  };

  const getDecisionColor = (decision: string) => {
    switch (decision) {
      case 'STRONG_BUY': return 'text-green-600 bg-green-50';
      case 'BUY': return 'text-green-600 bg-green-50';
      case 'HOLD': return 'text-yellow-600 bg-yellow-50';
      case 'SELL': return 'text-red-600 bg-red-50';
      case 'STRONG_SELL': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getTrendEmoji = (trend: string) => {
    switch (trend) {
      case 'BULLISH': return '📈';
      case 'BEARISH': return '📉';
      default: return '➡️';
    }
  };

  const getFearGreedText = (index: number | null) => {
    if (!index) return null;
    if (index <= 25) return { text: '극단적 공포', color: 'text-red-600', emoji: '😱' };
    if (index <= 45) return { text: '공포', color: 'text-orange-600', emoji: '😰' };
    if (index <= 55) return { text: '중립', color: 'text-gray-600', emoji: '😐' };
    if (index <= 75) return { text: '탐욕', color: 'text-green-600', emoji: '😃' };
    return { text: '극단적 탐욕', color: 'text-green-700', emoji: '🤑' };
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* 헤더 */}
      <header className="bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <h1 className="text-3xl sm:text-4xl font-bold">🪙 CNL</h1>
          <p className="text-purple-100 mt-1 text-sm sm:text-base">Crypto News Letter - 암호화폐 분석</p>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full">
        {/* 검색 섹션 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">코인 검색</h2>
          
          <div className="flex gap-2 mb-6">
            <input
              type="text"
              value={searchSymbol}
              onChange={(e) => setSearchSymbol(e.target.value.toUpperCase())}
              onKeyPress={(e) => e.key === 'Enter' && searchSymbol && handleSearch(searchSymbol)}
              placeholder="BTC, ETH, DOGE..."
              className="flex-1 px-4 py-3 border-2 border-purple-200 rounded-xl focus:outline-none focus:border-purple-500 text-lg"
            />
            <button
              onClick={() => searchSymbol && handleSearch(searchSymbol)}
              disabled={!searchSymbol || loading}
              className="px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '분석 중...' : '분석'}
            </button>
          </div>

          {/* 인기 코인 버튼 */}
          <div className="space-y-2">
            <p className="text-sm text-gray-600 font-medium">🔥 인기 코인</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {popularCoins.map((coin) => (
                <button
                  key={coin.symbol}
                  onClick={() => handleSearch(coin.symbol)}
                  disabled={loading}
                  className="px-4 py-2 bg-gradient-to-r from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100 rounded-lg text-sm font-medium text-gray-700 transition-all disabled:opacity-50"
                >
                  {coin.emoji} {coin.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 로딩 */}
        {loading && (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-600"></div>
            <p className="mt-4 text-gray-600 font-medium">암호화폐 분석 중...</p>
            <p className="text-sm text-gray-500 mt-2">실시간 데이터 수집 및 AI 분석 중입니다</p>
          </div>
        )}

        {/* 에러 */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-600 font-semibold">❌ {error}</p>
            <p className="text-sm text-red-500 mt-2">심볼을 확인하고 다시 시도해주세요.</p>
          </div>
        )}

        {/* 분석 결과 */}
        {analysis && (
          <div className="space-y-6">
            {/* 기본 정보 카드 */}
            <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl shadow-xl p-6 sm:p-8 text-white">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-3xl sm:text-4xl font-bold">{analysis.name}</h2>
                  <p className="text-purple-100 text-lg mt-1">{analysis.symbol}</p>
                  <p className="text-purple-200 text-sm mt-1">순위 #{analysis.rank}</p>
                </div>
                {analysis.fromCache && (
                  <span className="px-3 py-1 bg-white/20 rounded-lg text-sm font-medium">
                    캐시됨 ⚡
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-purple-200 text-sm">현재가 (USD)</p>
                  <p className="text-3xl font-bold">${analysis.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</p>
                </div>
                <div>
                  <p className="text-purple-200 text-sm">현재가 (KRW)</p>
                  <p className="text-3xl font-bold">₩{analysis.priceKRW.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-6">
                <div className="bg-white/10 rounded-xl p-3">
                  <p className="text-purple-200 text-xs mb-1">24시간</p>
                  <p className={`text-lg font-bold ${analysis.change24h >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                    {analysis.change24h >= 0 ? '▲' : '▼'} {Math.abs(analysis.change24h).toFixed(2)}%
                  </p>
                </div>
                <div className="bg-white/10 rounded-xl p-3">
                  <p className="text-purple-200 text-xs mb-1">7일</p>
                  <p className={`text-lg font-bold ${analysis.change7d >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                    {analysis.change7d >= 0 ? '▲' : '▼'} {Math.abs(analysis.change7d).toFixed(2)}%
                  </p>
                </div>
                <div className="bg-white/10 rounded-xl p-3">
                  <p className="text-purple-200 text-xs mb-1">30일</p>
                  <p className={`text-lg font-bold ${analysis.change30d >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                    {analysis.change30d >= 0 ? '▲' : '▼'} {Math.abs(analysis.change30d).toFixed(2)}%
                  </p>
                </div>
              </div>

              {/* 데이터 시간 */}
              {analysis.generatedAt && (
                <div className="mt-4 pt-4 border-t border-white/20">
                  <p className="text-purple-200 text-sm">
                    🕐 분석 기준 시간: {new Date(analysis.generatedAt).toLocaleString('ko-KR', { 
                      year: 'numeric', 
                      month: '2-digit', 
                      day: '2-digit', 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              )}
            </div>

            {/* AI 투자 의견 */}
            <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
              <h3 className="text-2xl font-bold mb-4 text-gray-800">🤖 AI 투자 분석</h3>
              
              <div className="flex items-center gap-4 mb-6">
                <div className={`px-6 py-3 rounded-xl font-bold text-lg ${getDecisionColor(analysis.recommendation.decision)}`}>
                  {getDecisionText(analysis.recommendation.decision)}
                </div>
                <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-semibold">
                  신뢰도 {analysis.recommendation.confidence}%
                </div>
                <div className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg">
                  {analysis.recommendation.timeHorizon}
                </div>
              </div>

              {analysis.recommendation.targetPrice && (
                <div className="mb-6 p-4 bg-purple-50 rounded-xl">
                  <p className="text-sm text-purple-700 font-medium mb-1">목표가</p>
                  <p className="text-2xl font-bold text-purple-900">
                    ${analysis.recommendation.targetPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              )}

              <div className="prose max-w-none">
                <p className="text-gray-700 leading-relaxed mb-6 text-lg">
                  {analysis.recommendation.reasoning}
                </p>

                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-bold text-green-700 mb-3 flex items-center gap-2">
                      <span className="text-2xl">✅</span> 핵심 포인트
                    </h4>
                    <ul className="space-y-2">
                      {analysis.recommendation.keyPoints.map((point, idx) => (
                        <li key={idx} className="text-gray-700 flex items-start gap-2">
                          <span className="text-green-500 mt-1">•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-bold text-red-700 mb-3 flex items-center gap-2">
                      <span className="text-2xl">⚠️</span> 리스크
                    </h4>
                    <ul className="space-y-2">
                      {analysis.recommendation.risks.map((risk, idx) => (
                        <li key={idx} className="text-gray-700 flex items-start gap-2">
                          <span className="text-red-500 mt-1">•</span>
                          <span>{risk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* 시장 지표 */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl shadow p-5">
                <p className="text-sm text-gray-600 mb-1">시가총액 (USD)</p>
                <p className="text-2xl font-bold text-gray-800">${analysis.marketCap}</p>
                <p className="text-xs text-gray-500 mt-1">₩{analysis.marketCapKRW}</p>
              </div>

              <div className="bg-white rounded-xl shadow p-5">
                <p className="text-sm text-gray-600 mb-1">24시간 거래량</p>
                <p className="text-2xl font-bold text-gray-800">${analysis.volume24h}</p>
                <p className="text-xs text-gray-500 mt-1">₩{analysis.volume24hKRW}</p>
              </div>

              <div className="bg-white rounded-xl shadow p-5">
                <p className="text-sm text-gray-600 mb-1">24시간 최고/최저</p>
                <p className="text-lg font-bold text-green-600">${analysis.high24h.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                <p className="text-lg font-bold text-red-600">${analysis.low24h.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              </div>

              <div className="bg-white rounded-xl shadow p-5">
                <p className="text-sm text-gray-600 mb-1">유통 공급량</p>
                <p className="text-xl font-bold text-gray-800">{analysis.circulatingSupply}</p>
                <p className="text-xs text-gray-500 mt-1">{analysis.symbol}</p>
              </div>

              <div className="bg-white rounded-xl shadow p-5">
                <p className="text-sm text-gray-600 mb-1">최대 공급량</p>
                <p className="text-xl font-bold text-gray-800">{analysis.maxSupply || '무제한 ♾️'}</p>
                <p className="text-xs text-gray-500 mt-1">{analysis.symbol}</p>
              </div>

              <div className="bg-white rounded-xl shadow p-5">
                <p className="text-sm text-gray-600 mb-1">역대 최고가</p>
                <p className="text-xl font-bold text-gray-800">${analysis.ath.toLocaleString('en-US')}</p>
                <p className={`text-sm font-semibold mt-1 ${analysis.athChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ATH 대비 {analysis.athChange.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">{analysis.athDate}</p>
              </div>
            </div>

            {/* 기술적 지표 & 시장 심리 */}
            <div className="grid sm:grid-cols-2 gap-6">
              {/* 기술적 지표 */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold mb-4 text-gray-800">📊 기술적 지표</h3>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-600">RSI (상대강도지수)</span>
                      <span className="font-bold text-gray-800">
                        {analysis.technicalIndicators.rsi?.toFixed(1) || 'N/A'}
                      </span>
                    </div>
                    {analysis.technicalIndicators.rsi && (
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            analysis.technicalIndicators.rsi > 70 ? 'bg-red-500' : 
                            analysis.technicalIndicators.rsi < 30 ? 'bg-green-500' : 
                            'bg-yellow-500'
                          }`}
                          style={{ width: `${analysis.technicalIndicators.rsi}%` }}
                        />
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {analysis.technicalIndicators.rsi && analysis.technicalIndicators.rsi > 70 ? '과매수 구간' : 
                       analysis.technicalIndicators.rsi && analysis.technicalIndicators.rsi < 30 ? '과매도 구간' : '중립'}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 mb-2">추세</p>
                    <p className="text-2xl font-bold">
                      {getTrendEmoji(analysis.technicalIndicators.trend)} {analysis.technicalIndicators.trend}
                    </p>
                  </div>

                  {analysis.technicalIndicators.support && (
                    <div>
                      <p className="text-sm text-gray-600">지지선</p>
                      <p className="text-lg font-bold text-green-600">
                        ${analysis.technicalIndicators.support.toFixed(2)}
                      </p>
                    </div>
                  )}

                  {analysis.technicalIndicators.resistance && (
                    <div>
                      <p className="text-sm text-gray-600">저항선</p>
                      <p className="text-lg font-bold text-red-600">
                        ${analysis.technicalIndicators.resistance.toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* 시장 심리 */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold mb-4 text-gray-800">🎭 시장 심리</h3>
                
                {analysis.fearGreedIndex !== null && (
                  <div className="mb-6">
                    <p className="text-sm text-gray-600 mb-2">공포-탐욕 지수</p>
                    <div className="flex items-center gap-3">
                      <p className="text-4xl font-bold text-gray-800">{analysis.fearGreedIndex}</p>
                      <div>
                        <p className={`text-xl font-bold ${getFearGreedText(analysis.fearGreedIndex)?.color}`}>
                          {getFearGreedText(analysis.fearGreedIndex)?.emoji} {getFearGreedText(analysis.fearGreedIndex)?.text}
                        </p>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 mt-3">
                      <div 
                        className={`h-3 rounded-full ${
                          analysis.fearGreedIndex <= 25 ? 'bg-red-500' :
                          analysis.fearGreedIndex <= 45 ? 'bg-orange-500' :
                          analysis.fearGreedIndex <= 55 ? 'bg-gray-500' :
                          analysis.fearGreedIndex <= 75 ? 'bg-green-500' :
                          'bg-green-600'
                        }`}
                        style={{ width: `${analysis.fearGreedIndex}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      0 = 극단적 공포, 100 = 극단적 탐욕
                    </p>
                  </div>
                )}

                {analysis.dominance !== null && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">비트코인 도미넌스</p>
                    <p className="text-3xl font-bold text-orange-600">{analysis.dominance.toFixed(2)}%</p>
                    <p className="text-xs text-gray-500 mt-1">전체 암호화폐 시장에서 BTC 비중</p>
                  </div>
                )}

                <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-yellow-800 font-medium">
                    ⚠️ 암호화폐는 변동성이 매우 큽니다. 투자 전 충분한 조사와 리스크 관리가 필요합니다.
                  </p>
                </div>
              </div>
            </div>

            {/* 데이터 출처 */}
            <div className="text-center text-sm text-gray-500 py-4">
              <p>데이터 출처: CoinGecko API, Alternative.me</p>
              <p className="mt-1">본 분석은 투자 권유가 아닌 참고 자료입니다.</p>
            </div>
          </div>
        )}
      </main>

      {/* 푸터 */}
      <footer className="bg-gray-900 text-white py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-lg font-semibold mb-2">🪙 CNL - Crypto News Letter</p>
          <p className="text-gray-400 text-sm">AI 기반 암호화폐 투자 분석 서비스</p>
          <p className="text-gray-500 text-xs mt-4">
            © 2025 CNL. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
