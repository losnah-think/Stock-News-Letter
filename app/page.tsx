'use client';

import { useState } from 'react';

interface StockSuggestion {
  ticker: string;
  name: string;
}

const POPULAR_STOCKS: StockSuggestion[] = [
  { ticker: 'NVDA', name: '엔비디아' },
  { ticker: 'AAPL', name: '애플' },
  { ticker: 'TSLA', name: '테슬라' },
  { ticker: 'MSFT', name: '마이크로소프트' },
  { ticker: 'GOOGL', name: '구글' },
  { ticker: 'AMZN', name: '아마존' },
  { ticker: 'META', name: '메타' },
  { ticker: 'AMD', name: 'AMD' },
];

interface AnalysisResult {
  ticker: string;
  currentPrice: number;
  decision: string;
  confidence: number;
  reasoning: string;
  keyPoints: string[];
  risks: string[];
  opportunities: string[];
  targetPrice?: number;
  revenueGrowthYoY: number;
  revenueGrowthQoQ: number;
  netIncomeGrowthYoY: number;
  netIncomeGrowthQoQ: number;
  netMargin: number;
  grossMargin: number;
  operatingMargin: number;
  pe: number;
  forwardPE: number;
  marketCap: number;
  roe: number;
  debtToEquity: number;
  epsGrowthYoY: number;
  news?: NewsArticle[];
  generatedAt?: string;
  fromCache?: boolean;
  cachedAt?: string;
}

interface NewsArticle {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  summary?: string;
}

export default function Home() {
  const [ticker, setTicker] = useState('');
  const [entryPrice, setEntryPrice] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState(false);

  const handleSearch = async () => {
    if (!ticker.trim()) {
      setError('티커를 입력해주세요');
      return;
    }

    setLoading(true);
    setError('');
    setAnalysis(null);

    try {
      const response = await fetch(`/api/stock/${ticker.toUpperCase()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '분석 실패');
      }

      setAnalysis({
        ticker: data.ticker,
        currentPrice: data.financialData.currentPrice,
        decision: data.recommendation.decision,
        confidence: data.recommendation.confidence,
        reasoning: data.recommendation.reasoning,
        keyPoints: data.recommendation.keyPoints || [],
        risks: data.recommendation.risks || [],
        opportunities: data.recommendation.opportunities || [],
        targetPrice: data.recommendation.targetPrice,
        revenueGrowthYoY: data.financialData.revenueGrowthYoY,
        revenueGrowthQoQ: data.financialData.revenueGrowthQoQ,
        netIncomeGrowthYoY: data.financialData.netIncomeGrowthYoY,
        netIncomeGrowthQoQ: data.financialData.netIncomeGrowthQoQ,
        netMargin: data.financialData.netMargin,
        grossMargin: data.financialData.grossMargin,
        operatingMargin: data.financialData.operatingMargin,
        pe: data.financialData.pe,
        forwardPE: data.financialData.forwardPE,
        marketCap: data.financialData.marketCap,
        roe: data.financialData.roe,
        debtToEquity: data.financialData.debtToEquity,
        epsGrowthYoY: data.financialData.epsGrowthYoY,
        news: data.news || [],
        generatedAt: data.generatedAt,
        fromCache: data.fromCache,
        cachedAt: data.cachedAt,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '분석 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!email.trim() || !ticker.trim()) {
      alert('티커와 이메일을 입력해주세요');
      return;
    }

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: ticker.toUpperCase(), email }),
      });

      if (response.ok) {
        setEmailSuccess(true);
        setTimeout(() => setEmailSuccess(false), 3000);
      }
    } catch (err) {
      alert('구독 신청 실패');
    }
  };

  const calculateProfit = () => {
    if (!analysis || !entryPrice) return null;
    const entry = parseFloat(entryPrice);
    if (isNaN(entry)) return null;

    const current = analysis.currentPrice;
    const profitAmount = current - entry;
    const profitPercent = ((profitAmount / entry) * 100);

    return {
      amount: profitAmount,
      percent: profitPercent,
      isProfit: profitAmount >= 0,
    };
  };

  const profit = calculateProfit();

  const getDecisionColor = (decision: string) => {
    switch (decision) {
      case 'STRONG_BUY': return 'text-green-600 bg-green-50';
      case 'BUY': return 'text-green-500 bg-green-50';
      case 'HOLD': return 'text-yellow-600 bg-yellow-50';
      case 'SELL': return 'text-red-500 bg-red-50';
      case 'STRONG_SELL': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getDecisionText = (decision: string) => {
    switch (decision) {
      case 'STRONG_BUY': return '적극 매수 권장';
      case 'BUY': return '매수 추천';
      case 'HOLD': return '보유 권장';
      case 'SELL': return '매도 고려';
      case 'STRONG_SELL': return '적극 매도 권장';
      default: return decision;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-300 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">📈 SNL</h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">Stock News Letter - AI 기반 실시간 주식 분석</p>
            </div>
            <div className="flex gap-3 items-center">
              <a 
                href="/crypto" 
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                🪙 코인 분석
              </a>
              <div className="text-xs sm:text-sm text-gray-500 hidden sm:block">
                Powered by GPT-4
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Search Section */}
        <div className="mb-8 sm:mb-12">
          <label className="block text-sm sm:text-base font-semibold text-gray-900 mb-3">
            관심있는 주식의 티커를 입력하세요
          </label>
          
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <input
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="예: NVDA"
              className="flex-1 px-4 py-3 border border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none text-base sm:text-lg text-gray-900 bg-white"
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="w-full sm:w-auto px-6 sm:px-8 py-3 bg-black text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? '분석 중...' : '분석'}
            </button>
          </div>

          {/* Popular Stocks */}
          <div className="flex flex-wrap gap-2">
            {POPULAR_STOCKS.map((stock) => (
              <button
                key={stock.ticker}
                onClick={() => {
                  setTicker(stock.ticker);
                  setError('');
                }}
                className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm border border-gray-400 rounded-full hover:border-gray-600 hover:bg-gray-100 transition-colors text-gray-800 bg-white font-medium"
              >
                {stock.name} ({stock.ticker})
              </button>
            ))}
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Analysis Result */}
        {analysis && (
          <div className="space-y-4 sm:space-y-6">
            {/* Main Info Card */}
            <div className="border border-gray-300 rounded-xl p-4 sm:p-8 bg-white shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                    {analysis.ticker}
                  </h2>
                  <div className="text-3xl sm:text-4xl font-bold text-gray-900">
                    ${analysis.currentPrice?.toFixed(2) || 'N/A'}
                  </div>
                </div>
                <div className={`px-4 py-2 rounded-lg font-bold text-sm sm:text-base ${getDecisionColor(analysis.decision)} self-start`}>
                  {getDecisionText(analysis.decision)}
                </div>
              </div>

              {/* Entry Price Calculator */}
              <div className="mb-6 p-4 bg-gray-100 rounded-lg border border-gray-300">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  내 진입가
                </label>
                <input
                  type="number"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(e.target.value)}
                  placeholder="진입가를 입력하세요"
                  className="w-full px-4 py-2 border border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none text-gray-900 bg-white"
                />
                
                {profit && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">예상 수익</span>
                      <div className="text-right">
                        <div className={`text-lg sm:text-xl font-bold ${profit.isProfit ? 'text-green-600' : 'text-red-600'}`}>
                          {profit.isProfit ? '+' : ''}{profit.amount.toFixed(2)} USD
                        </div>
                        <div className={`text-xs sm:text-sm ${profit.isProfit ? 'text-green-600' : 'text-red-600'}`}>
                          {profit.isProfit ? '+' : ''}{profit.percent.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Key Metrics Grid - 주요 재무 지표 */}
              <div className="mb-6">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3">📊 주요 재무 지표</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  
                  {/* P/E 비율 */}
                  <div className="p-3 sm:p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="text-xs font-semibold text-purple-900 mb-1 flex items-center justify-between">
                      <span>P/E 비율</span>
                      <span className="text-[10px] text-purple-600">📈 밸류에이션</span>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-purple-900 mb-1">
                      {analysis.pe ? analysis.pe.toFixed(1) : 'N/A'}
                    </div>
                    <div className="text-[10px] text-purple-700">업종 평균과 비교 필요</div>
                  </div>
                  
                  {/* Forward P/E */}
                  <div className="p-3 sm:p-4 bg-violet-50 rounded-lg border border-violet-200">
                    <div className="text-xs font-semibold text-violet-900 mb-1 flex items-center justify-between">
                      <span>Forward P/E</span>
                      <span className="text-[10px] text-violet-600">🔮 미래가치</span>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-violet-900 mb-1">
                      {analysis.forwardPE ? analysis.forwardPE.toFixed(1) : 'N/A'}
                    </div>
                    <div className="text-[10px] text-violet-700">미래 실적 기대치</div>
                  </div>
                  
                  {/* 시가총액 */}
                  <div className="p-3 sm:p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                    <div className="text-xs font-semibold text-indigo-900 mb-1 flex items-center justify-between">
                      <span>시가총액</span>
                      <span className="text-[10px] text-indigo-600">💰 규모</span>
                    </div>
                    <div className="text-lg sm:text-xl font-bold text-indigo-900 mb-1">
                      {analysis.marketCap ? `$${(analysis.marketCap / 1e9).toFixed(1)}B` : 'N/A'}
                    </div>
                    <div className="text-[10px] text-indigo-700">기업 가치 총액</div>
                  </div>
                  
                  {/* AI 신뢰도 */}
                  <div className="p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-xs font-semibold text-blue-900 mb-1 flex items-center justify-between">
                      <span>AI 신뢰도</span>
                      <span className="text-[10px] text-blue-600">🤖 분석</span>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-blue-900 mb-1">{analysis.confidence}%</div>
                    <div className="text-[10px] text-blue-700">투자의견 확신도</div>
                  </div>
                  
                  {/* 매출 성장 (YoY) */}
                  <div className="p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-xs font-semibold text-green-900 mb-1 flex items-center justify-between">
                      <span>매출 성장 (YoY)</span>
                      <span className="text-[10px] text-green-600">📈 성장성</span>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-green-900 mb-1">
                      {analysis.revenueGrowthYoY != null ? `${analysis.revenueGrowthYoY > 0 ? '+' : ''}${analysis.revenueGrowthYoY.toFixed(1)}%` : 'N/A'}
                    </div>
                    <div className="text-[10px] text-green-700">전년 동기 대비</div>
                  </div>
                  
                  {/* 매출 성장 (QoQ) */}
                  <div className="p-3 sm:p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                    <div className="text-xs font-semibold text-emerald-900 mb-1 flex items-center justify-between">
                      <span>매출 성장 (QoQ)</span>
                      <span className="text-[10px] text-emerald-600">📊 분기성장</span>
                    </div>
                    <div className="text-lg sm:text-xl font-bold text-emerald-900 mb-1">
                      {analysis.revenueGrowthQoQ != null ? `${analysis.revenueGrowthQoQ > 0 ? '+' : ''}${analysis.revenueGrowthQoQ.toFixed(1)}%` : 'N/A'}
                    </div>
                    <div className="text-[10px] text-emerald-700">직전 분기 대비</div>
                  </div>
                  
                  {/* 순이익 성장 (YoY) */}
                  <div className="p-3 sm:p-4 bg-teal-50 rounded-lg border border-teal-200">
                    <div className="text-xs font-semibold text-teal-900 mb-1 flex items-center justify-between">
                      <span>순이익 성장 (YoY)</span>
                      <span className="text-[10px] text-teal-600">💵 수익성</span>
                    </div>
                    <div className="text-lg sm:text-xl font-bold text-teal-900 mb-1">
                      {analysis.netIncomeGrowthYoY != null ? `${analysis.netIncomeGrowthYoY > 0 ? '+' : ''}${analysis.netIncomeGrowthYoY.toFixed(1)}%` : 'N/A'}
                    </div>
                    <div className="text-[10px] text-teal-700">전년 동기 대비</div>
                  </div>
                  
                  {/* 순이익 성장 (QoQ) */}
                  <div className="p-3 sm:p-4 bg-cyan-50 rounded-lg border border-cyan-200">
                    <div className="text-xs font-semibold text-cyan-900 mb-1 flex items-center justify-between">
                      <span>순이익 성장 (QoQ)</span>
                      <span className="text-[10px] text-cyan-600">💰 분기수익</span>
                    </div>
                    <div className="text-lg sm:text-xl font-bold text-cyan-900 mb-1">
                      {analysis.netIncomeGrowthQoQ != null ? `${analysis.netIncomeGrowthQoQ > 0 ? '+' : ''}${analysis.netIncomeGrowthQoQ.toFixed(1)}%` : 'N/A'}
                    </div>
                    <div className="text-[10px] text-cyan-700">직전 분기 대비</div>
                  </div>
                  
                  {/* EPS 성장 */}
                  <div className="p-3 sm:p-4 bg-lime-50 rounded-lg border border-lime-200">
                    <div className="text-xs font-semibold text-lime-900 mb-1 flex items-center justify-between">
                      <span>EPS 성장 (YoY)</span>
                      <span className="text-[10px] text-lime-600">📊 주당순이익</span>
                    </div>
                    <div className="text-lg sm:text-xl font-bold text-lime-900 mb-1">
                      {analysis.epsGrowthYoY != null ? `${analysis.epsGrowthYoY > 0 ? '+' : ''}${analysis.epsGrowthYoY.toFixed(1)}%` : 'N/A'}
                    </div>
                    <div className="text-[10px] text-lime-700">주주 가치 증가율</div>
                  </div>
                  
                  {/* 매출총이익률 */}
                  <div className="p-3 sm:p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="text-xs font-semibold text-amber-900 mb-1 flex items-center justify-between">
                      <span>매출총이익률</span>
                      <span className="text-[10px] text-amber-600">💎 원가효율</span>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-amber-900 mb-1">
                      {analysis.grossMargin != null ? `${analysis.grossMargin.toFixed(1)}%` : 'N/A'}
                    </div>
                    <div className="text-[10px] text-amber-700">매출-원가 마진</div>
                  </div>
                  
                  {/* 영업이익률 */}
                  <div className="p-3 sm:p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="text-xs font-semibold text-yellow-900 mb-1 flex items-center justify-between">
                      <span>영업이익률</span>
                      <span className="text-[10px] text-yellow-600">🏭 영업효율</span>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-yellow-900 mb-1">
                      {analysis.operatingMargin != null ? `${analysis.operatingMargin.toFixed(1)}%` : 'N/A'}
                    </div>
                    <div className="text-[10px] text-yellow-700">핵심 사업 수익성</div>
                  </div>
                  
                  {/* 순이익률 */}
                  <div className="p-3 sm:p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="text-xs font-semibold text-orange-900 mb-1 flex items-center justify-between">
                      <span>순이익률</span>
                      <span className="text-[10px] text-orange-600">✨ 최종수익</span>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-orange-900 mb-1">
                      {analysis.netMargin != null ? `${analysis.netMargin.toFixed(1)}%` : 'N/A'}
                    </div>
                    <div className="text-[10px] text-orange-700">세후 순이익 비율</div>
                  </div>
                  
                  {/* ROE */}
                  <div className="p-3 sm:p-4 bg-rose-50 rounded-lg border border-rose-200">
                    <div className="text-xs font-semibold text-rose-900 mb-1 flex items-center justify-between">
                      <span>ROE</span>
                      <span className="text-[10px] text-rose-600">👥 자본효율</span>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-rose-900 mb-1">
                      {analysis.roe != null ? `${analysis.roe.toFixed(1)}%` : 'N/A'}
                    </div>
                    <div className="text-[10px] text-rose-700">자기자본이익률</div>
                  </div>
                  
                  {/* 부채비율 */}
                  <div className="p-3 sm:p-4 bg-pink-50 rounded-lg border border-pink-200">
                    <div className="text-xs font-semibold text-pink-900 mb-1 flex items-center justify-between">
                      <span>부채비율</span>
                      <span className="text-[10px] text-pink-600">⚖️ 재무건전성</span>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-pink-900 mb-1">
                      {analysis.debtToEquity != null ? analysis.debtToEquity.toFixed(2) : 'N/A'}
                    </div>
                    <div className="text-[10px] text-pink-700">낮을수록 안정적</div>
                  </div>
                  
                </div>
                
                {/* 지표 설명 */}
                <div className="mt-4 p-3 bg-gray-100 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-700 leading-relaxed">
                    <strong className="text-gray-900">💡 지표 해석 가이드:</strong><br/>
                    • <strong>YoY (Year-over-Year)</strong>: 전년 동기 대비 성장률 - 장기 트렌드 파악<br/>
                    • <strong>QoQ (Quarter-over-Quarter)</strong>: 직전 분기 대비 성장률 - 최근 모멘텀 확인<br/>
                    • <strong>마진율</strong>: 높을수록 수익성 우수 (업종별 차이 고려 필요)<br/>
                    • <strong>ROE</strong>: 15% 이상이면 우수, 자본 대비 수익 창출 능력<br/>
                    • <strong>부채비율</strong>: 업종마다 다르지만 일반적으로 1.0 이하가 안정적
                  </p>
                </div>
              </div>

              {analysis.targetPrice && (
                <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-900">목표 주가</span>
                    <span className="text-lg sm:text-xl font-bold text-blue-900">${analysis.targetPrice.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* Data Source & Timestamp */}
              <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                <p className="text-xs text-gray-500">
                  📊 데이터 출처: Yahoo Finance API | 분석: OpenAI GPT-4 | 공시: SEC EDGAR
                </p>
                {analysis.generatedAt && (
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-gray-700">
                      🕐 분석 기준 시간: {new Date(analysis.generatedAt).toLocaleString('ko-KR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                      })}
                    </p>
                    {analysis.fromCache && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded">
                        캐시됨 ⚡
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Analysis Details */}
            <div className="border border-gray-300 rounded-xl p-4 sm:p-8 bg-white shadow-sm">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">분석 요약</h3>
              <p className="text-sm sm:text-base text-gray-800 leading-relaxed mb-6">
                {analysis.reasoning}
              </p>

              <div className="space-y-4 sm:space-y-6">
                {/* Key Points */}
                {analysis.keyPoints.length > 0 && (
                  <div>
                    <h4 className="text-sm sm:text-base font-bold text-gray-900 mb-3">✅ 핵심 강점</h4>
                    <ul className="space-y-2">
                      {analysis.keyPoints.map((point, idx) => (
                        <li key={idx} className="text-xs sm:text-sm text-gray-800 pl-3 sm:pl-4 border-l-3 border-green-500 font-medium">
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Risks */}
                {analysis.risks.length > 0 && (
                  <div>
                    <h4 className="text-sm sm:text-base font-bold text-gray-900 mb-3">⚠️ 주요 리스크</h4>
                    <ul className="space-y-2">
                      {analysis.risks.map((risk, idx) => (
                        <li key={idx} className="text-xs sm:text-sm text-gray-800 pl-3 sm:pl-4 border-l-3 border-red-500 font-medium">
                          {risk}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Opportunities */}
                {analysis.opportunities.length > 0 && (
                  <div>
                    <h4 className="text-sm sm:text-base font-bold text-gray-900 mb-3">🎯 성장 기회</h4>
                    <ul className="space-y-2">
                      {analysis.opportunities.map((opp, idx) => (
                        <li key={idx} className="text-xs sm:text-sm text-gray-800 pl-3 sm:pl-4 border-l-3 border-blue-500 font-medium">
                          {opp}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* News Section */}
            {analysis.news && analysis.news.length > 0 && (
              <div className="border border-gray-300 rounded-xl p-4 sm:p-8 bg-white shadow-sm">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">📰 최신 뉴스</h3>
                <div className="space-y-3 sm:space-y-4">
                  {(() => {
                    // 중복 제거: 제목이 비슷한 뉴스 필터링
                    const uniqueNews = analysis.news.reduce((acc: NewsArticle[], current) => {
                      const isDuplicate = acc.some(item => {
                        const similarity = current.title.toLowerCase().split(' ').filter(word => 
                          item.title.toLowerCase().includes(word) && word.length > 3
                        ).length;
                        return similarity > 3; // 3개 이상의 단어가 겹치면 중복으로 간주
                      });
                      if (!isDuplicate) {
                        acc.push(current);
                      }
                      return acc;
                    }, []);

                    return uniqueNews.slice(0, 5).map((article, idx) => (
                      <a
                        key={idx}
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-3 sm:p-4 border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all"
                      >
                        <div className="flex items-start justify-between gap-3 sm:gap-4">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-1 hover:text-blue-600 line-clamp-2">
                              {article.title}
                            </h4>
                            {article.summary && (
                              <p className="text-xs sm:text-sm text-gray-700 mb-2 line-clamp-2">
                                {article.summary}
                              </p>
                            )}
                            <div className="flex items-center gap-2 sm:gap-3 text-xs text-gray-600">
                              <span className="font-medium">{article.source}</span>
                              <span>•</span>
                              <span>{new Date(article.publishedAt).toLocaleDateString('ko-KR')}</span>
                            </div>
                          </div>
                          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </div>
                      </a>
                    ));
                  })()}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    📰 뉴스 출처: Yahoo Finance RSS Feed
                  </p>
                </div>
              </div>
            )}

            {/* Email Subscription */}
            <div className="border border-gray-300 rounded-xl p-4 sm:p-8 bg-blue-50 shadow-sm">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2">
                {analysis.ticker} 공시 알림 받기
              </h3>
              <p className="text-xs sm:text-sm text-gray-800 mb-4 font-medium">
                새로운 공시가 나올 때마다 이메일로 분석 리포트를 받아보세요
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="이메일 주소"
                  className="flex-1 px-4 py-3 border border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none text-gray-900 bg-white text-sm sm:text-base"
                />
                <button
                  onClick={handleSubscribe}
                  className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold whitespace-nowrap shadow-sm"
                >
                  알림 받기
                </button>
              </div>

              {emailSuccess && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                  ✓ 구독이 완료되었습니다!
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!analysis && !loading && !error && (
          <div className="text-center py-12 sm:py-20">
            <div className="text-5xl sm:text-6xl mb-4">📊</div>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
              주식 분석을 시작하세요
            </h3>
            <p className="text-sm sm:text-base text-gray-700">
              티커를 입력하거나 위의 종목을 선택해주세요
            </p>
          </div>
        )}
      </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-300 bg-white mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 text-center text-xs sm:text-sm text-gray-700">
          <p className="font-medium">본 분석은 정보 제공 목적으로만 제공되며 투자 권유가 아닙니다.</p>
          <p className="mt-1">투자 결정 시 반드시 본인의 판단과 추가 조사를 병행하시기 바랍니다.</p>
          <p className="mt-2 text-gray-500">© 2025 SNL - Stock News Letter</p>
        </div>
      </footer>
    </div>
  );
}
