import OpenAI from 'openai';
import { FinancialAnalysis } from './financial-service';
import { SECFiling } from './sec-service';

export interface InvestmentRecommendation {
  ticker: string;
  decision: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
  confidence: number; // 0-100
  reasoning: string;
  keyPoints: string[];
  risks: string[];
  opportunities: string[];
  targetPrice?: number;
  timeHorizon: string;
}

export class AIAnalysisService {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Analyze financial data and SEC filings to provide investment recommendation
   */
  async analyzeStock(
    ticker: string,
    financialData: FinancialAnalysis,
    recentFilings: SECFiling[]
  ): Promise<InvestmentRecommendation> {
    const prompt = this.buildAnalysisPrompt(ticker, financialData, recentFilings);

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini', // Faster and cheaper than gpt-4-turbo-preview
        messages: [
          {
            role: 'system',
            content: `당신은 펀더멘털 분석, SEC 공시 해석, 투자 전략에 전문성을 갖춘 전문 금융 애널리스트입니다. 
            데이터 기반의 객관적인 분석을 제공하며 장기 가치 투자 원칙에 중점을 둡니다. 
            항상 강세장과 약세장 시나리오를 모두 고려하세요. 모든 답변은 한국어로 작성해주세요.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1500, // Reduced from 2000 for faster response
      });

      const analysis = response.choices[0].message.content || '';
      return this.parseAIResponse(ticker, analysis, financialData);
    } catch (error) {
      console.error('Error in AI analysis:', error);
      return this.getFallbackRecommendation(ticker, financialData);
    }
  }

  /**
   * Build comprehensive analysis prompt
   */
  private buildAnalysisPrompt(
    ticker: string,
    financial: FinancialAnalysis,
    filings: SECFiling[]
  ): string {
    const filingsText = filings.length > 0 
      ? filings.map(f => `- ${f.filingType} filed on ${f.filingDate}: ${f.description}`).join('\n')
      : 'No recent filings in the past 24 hours';

    return `
다음 주식을 분석하고 투자 추천을 제공해주세요:

**종목: ${ticker}**

**현재 밸류에이션:**
- 현재가: $${financial.currentPrice.toFixed(2)}
- 시가총액: $${(financial.marketCap / 1e9).toFixed(2)}B
- P/E 비율: ${financial.pe.toFixed(2)}
- Forward P/E: ${financial.forwardPE.toFixed(2)}
- PEG 비율: ${financial.pegRatio.toFixed(2)}

**성장 지표:**
- 매출 성장률 (QoQ): ${financial.revenueGrowthQoQ.toFixed(2)}%
- 매출 성장률 (YoY): ${financial.revenueGrowthYoY.toFixed(2)}%
- 순이익 성장률 (QoQ): ${financial.netIncomeGrowthQoQ.toFixed(2)}%
- 순이익 성장률 (YoY): ${financial.netIncomeGrowthYoY.toFixed(2)}%
- EPS 성장률 (YoY): ${financial.epsGrowthYoY.toFixed(2)}%

**수익성:**
- 매출총이익률: ${financial.grossMargin.toFixed(2)}%
- 영업이익률: ${financial.operatingMargin.toFixed(2)}%
- 순이익률: ${financial.netMargin.toFixed(2)}%
- 자기자본이익률 (ROE): ${financial.roe.toFixed(2)}%

**재무 건전성:**
- 부채비율: ${financial.debtToEquity.toFixed(2)}
- 유동비율: ${financial.currentRatio.toFixed(2)}

**분기별 매출 추이 (최근 4분기):**
${financial.quarterlyData.map((q, i) => 
  `Q${i+1} (${q.period}): $${(q.revenue / 1e9).toFixed(2)}B`
).join('\n')}

**최근 SEC 공시:**
${filingsText}

다음 JSON 형식으로 종합적인 분석을 제공해주세요 (모든 내용은 한국어로):
{
  "decision": "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL",
  "confidence": 85,
  "reasoning": "추천 이유에 대한 상세한 설명 (2-3 문단, 한국어로)",
  "keyPoints": ["핵심 포인트 1", "핵심 포인트 2", "핵심 포인트 3"],
  "risks": ["리스크 1", "리스크 2", "리스크 3"],
  "opportunities": ["기회 요인 1", "기회 요인 2"],
  "targetPrice": 150.00,
  "timeHorizon": "6-12개월"
}

다음 사항을 고려해주세요:
1. 매출 및 실적 성장 궤적
2. 업계 대비 수익성 마진
3. 재무제표 건전성
4. 성장률 대비 밸류에이션 (P/E, PEG)
5. 최근 SEC 공시 및 주요 이벤트
6. 회사에 영향을 미치는 거시 경제 트렌드
`;
  }

  /**
   * Parse AI response into structured recommendation
   */
  private parseAIResponse(
    ticker: string,
    aiResponse: string,
    financial: FinancialAnalysis
  ): InvestmentRecommendation {
    try {
      // Extract JSON from response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          ticker,
          decision: parsed.decision || 'HOLD',
          confidence: parsed.confidence || 50,
          reasoning: parsed.reasoning || aiResponse,
          keyPoints: parsed.keyPoints || [],
          risks: parsed.risks || [],
          opportunities: parsed.opportunities || [],
          targetPrice: parsed.targetPrice,
          timeHorizon: parsed.timeHorizon || '6-12 months',
        };
      }
    } catch (error) {
      console.error('Error parsing AI response:', error);
    }

    // Fallback to simple parsing
    return this.getFallbackRecommendation(ticker, financial, aiResponse);
  }

  /**
   * Generate fallback recommendation based on simple metrics
   */
  private getFallbackRecommendation(
    ticker: string,
    financial: FinancialAnalysis,
    reasoning?: string
  ): InvestmentRecommendation {
    let score = 0;
    const keyPoints: string[] = [];
    const risks: string[] = [];

    // Score based on growth
    if (financial.revenueGrowthYoY > 15) {
      score += 20;
      keyPoints.push(`강력한 매출 성장률: ${financial.revenueGrowthYoY.toFixed(1)}% YoY`);
    } else if (financial.revenueGrowthYoY < 0) {
      score -= 20;
      risks.push('매출 감소세');
    }

    // Score based on profitability
    if (financial.netMargin > 15) {
      score += 15;
      keyPoints.push(`높은 수익성: 순이익률 ${financial.netMargin.toFixed(1)}%`);
    }

    // Score based on valuation
    if (financial.pe > 0 && financial.pe < 25) {
      score += 15;
      keyPoints.push(`합리적인 밸류에이션: P/E ${financial.pe.toFixed(1)}`);
    } else if (financial.pe > 50) {
      score -= 10;
      risks.push('높은 밸류에이션');
    }

    // Score based on financial health
    if (financial.debtToEquity < 0.5) {
      score += 10;
      keyPoints.push('탄탄한 재무구조');
    } else if (financial.debtToEquity > 2) {
      score -= 15;
      risks.push('높은 부채 수준');
    }

    // Determine decision
    let decision: InvestmentRecommendation['decision'];
    if (score >= 40) decision = 'STRONG_BUY';
    else if (score >= 20) decision = 'BUY';
    else if (score >= -10) decision = 'HOLD';
    else if (score >= -30) decision = 'SELL';
    else decision = 'STRONG_SELL';

    return {
      ticker,
      decision,
      confidence: Math.min(Math.abs(score) + 30, 100),
      reasoning: reasoning || `펀더멘털 분석 결과, ${ticker}는 ${score}점을 기록했습니다. ${
        decision === 'STRONG_BUY' || decision === 'BUY' 
          ? '긍정적인 성장 지표와 재무 건전성을 보이고 있습니다.' 
          : decision === 'HOLD'
          ? '안정적이나 추가 관찰이 필요합니다.'
          : '주의가 필요한 상황입니다.'
      }`,
      keyPoints,
      risks,
      opportunities: ['시장 확대 가능성', '제품 혁신 기회'],
      timeHorizon: '6-12개월',
    };
  }

  /**
   * Generate human-readable summary for email
   */
  generateEmailSummary(
    ticker: string,
    financial: FinancialAnalysis,
    recommendation: InvestmentRecommendation,
    filings: SECFiling[]
  ): string {
    const emoji = {
      'STRONG_BUY': '🚀',
      'BUY': '📈',
      'HOLD': '⏸️',
      'SELL': '📉',
      'STRONG_SELL': '🔴'
    }[recommendation.decision];

    return `
# ${ticker} 일일 분석 리포트 ${emoji}

## 투자 추천: ${recommendation.decision}
**신뢰도:** ${recommendation.confidence}%  
**투자 기간:** ${recommendation.timeHorizon}

---

## 요약

${recommendation.reasoning}

---

## 주요 지표

| 지표 | 값 |
|--------|-------|
| 현재가 | $${financial.currentPrice.toFixed(2)} |
| 시가총액 | $${(financial.marketCap / 1e9).toFixed(2)}B |
| P/E 비율 | ${financial.pe.toFixed(2)} |
| 매출 성장률 (YoY) | ${financial.revenueGrowthYoY.toFixed(2)}% |
| 순이익률 | ${financial.netMargin.toFixed(2)}% |
| ROE | ${financial.roe.toFixed(2)}% |
| 부채비율 | ${financial.debtToEquity.toFixed(2)} |

---

## ✅ 핵심 강점

${recommendation.keyPoints.map(point => `- ${point}`).join('\n')}

---

## ⚠️ 주요 리스크

${recommendation.risks.map(risk => `- ${risk}`).join('\n')}

---

## 🎯 성장 기회

${recommendation.opportunities.map(opp => `- ${opp}`).join('\n')}

${recommendation.targetPrice ? `\n**목표 주가:** $${recommendation.targetPrice.toFixed(2)}\n` : ''}

---

## 최근 SEC 공시

${filings.length > 0 
  ? filings.map(f => `- **${f.filingType}** (${f.filingDate}): ${f.description.substring(0, 100)}...`).join('\n')
  : '최근 24시간 내 신규 공시 없음'
}

---

## 분기별 실적 추이

${financial.quarterlyData.map((q, i) => 
  `**Q${i+1}** (${q.period}): $${(q.revenue / 1e9).toFixed(2)}B | 순이익: $${(q.netIncome / 1e6).toFixed(0)}M`
).join('\n')}

---

*본 분석은 정보 제공 목적으로만 제공되며 투자 권유가 아닙니다. 투자 결정 시 반드시 본인의 판단과 추가 조사를 병행하시기 바랍니다.*
    `.trim();
  }
}
