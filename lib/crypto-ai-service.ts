/**
 * 암호화폐 AI 분석 서비스
 * OpenAI를 활용한 코인 투자 분석
 */

import OpenAI from 'openai';

interface CryptoAIAnalysis {
  decision: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
  confidence: number;
  reasoning: string;
  keyPoints: string[];
  risks: string[];
  targetPrice: number | null;
  timeHorizon: string;
}

export class CryptoAIService {
  private openai: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY가 설정되지 않았습니다.');
    }
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * 암호화폐 투자 분석
   */
  async analyzeCrypto(cryptoData: any): Promise<CryptoAIAnalysis> {
    const prompt = this.buildCryptoPrompt(cryptoData);

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `당신은 암호화폐 전문 투자 분석가입니다. 
데이터를 기반으로 객관적이고 신중한 투자 의견을 제시합니다.
한국어로 답변하며, 투자자가 이해하기 쉽게 설명합니다.
암호화폐는 변동성이 크므로 리스크를 명확히 강조합니다.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      });

      const content = response.choices[0].message.content || '';
      return this.parseAIResponse(content);
    } catch (error: any) {
      console.error('AI 분석 실패:', error.message);
      throw new Error('AI 분석을 수행할 수 없습니다.');
    }
  }

  /**
   * 프롬프트 생성
   */
  private buildCryptoPrompt(data: any): string {
    return `
다음 암호화폐에 대한 투자 분석을 해주세요:

# 기본 정보
- 코인: ${data.name} (${data.symbol})
- 현재가: $${data.price.toFixed(2)} (₩${data.priceKRW.toLocaleString('ko-KR')})
- 시가총액: $${data.marketCap} (순위: ${data.rank}위)
- 24시간 거래량: $${data.volume24h}

# 가격 변동
- 24시간: ${data.change24h.toFixed(2)}%
- 7일: ${data.change7d.toFixed(2)}%
- 30일: ${data.change30d.toFixed(2)}%
- 24시간 최고: $${data.high24h.toFixed(2)}
- 24시간 최저: $${data.low24h.toFixed(2)}

# 공급량
- 유통 공급량: ${data.circulatingSupply}
- 총 공급량: ${data.totalSupply}
- 최대 공급량: ${data.maxSupply || '무제한'}

# 역사적 데이터
- 역대 최고가: $${data.ath.toFixed(2)} (${data.athDate})
- ATH 대비: ${data.athChange.toFixed(2)}%

# 기술적 지표
- RSI: ${data.technicalIndicators.rsi?.toFixed(1) || 'N/A'}
- 추세: ${data.technicalIndicators.trend}
- 지지선: $${data.technicalIndicators.support?.toFixed(2) || 'N/A'}
- 저항선: $${data.technicalIndicators.resistance?.toFixed(2) || 'N/A'}

${data.dominance ? `# 시장 지배율\n- 비트코인 도미넌스: ${data.dominance.toFixed(2)}%\n` : ''}

다음 형식으로 분석해주세요:

DECISION: [STRONG_BUY/BUY/HOLD/SELL/STRONG_SELL]
CONFIDENCE: [0-100 숫자만]
REASONING: [2-3문장으로 핵심 투자 의견]

KEY_POINTS:
- [강점 1]
- [강점 2]
- [강점 3]

RISKS:
- [리스크 1]
- [리스크 2]
- [리스크 3]

TARGET_PRICE: [숫자만, 없으면 NULL]
TIME_HORIZON: [단기(1-7일)/중기(1-3개월)/장기(6개월+)]

**중요**: 
1. 암호화폐는 매우 변동성이 크므로 신중한 의견을 제시하세요.
2. 투자 권유가 아닌 분석 의견임을 명확히 하세요.
3. 리스크를 반드시 강조하세요.
4. 한국 투자자 관점에서 설명하세요.
`;
  }

  /**
   * AI 응답 파싱
   */
  private parseAIResponse(content: string): CryptoAIAnalysis {
    const lines = content.split('\n').filter(line => line.trim());
    
    let decision: any = 'HOLD';
    let confidence = 50;
    let reasoning = '';
    let keyPoints: string[] = [];
    let risks: string[] = [];
    let targetPrice: number | null = null;
    let timeHorizon = '중기';

    let currentSection = '';

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('DECISION:')) {
        const value = trimmed.replace('DECISION:', '').trim();
        if (['STRONG_BUY', 'BUY', 'HOLD', 'SELL', 'STRONG_SELL'].includes(value)) {
          decision = value;
        }
      } else if (trimmed.startsWith('CONFIDENCE:')) {
        const value = parseInt(trimmed.replace('CONFIDENCE:', '').trim());
        if (!isNaN(value)) {
          confidence = Math.min(100, Math.max(0, value));
        }
      } else if (trimmed.startsWith('REASONING:')) {
        reasoning = trimmed.replace('REASONING:', '').trim();
        currentSection = 'reasoning';
      } else if (trimmed.startsWith('KEY_POINTS:')) {
        currentSection = 'keyPoints';
      } else if (trimmed.startsWith('RISKS:')) {
        currentSection = 'risks';
      } else if (trimmed.startsWith('TARGET_PRICE:')) {
        const value = trimmed.replace('TARGET_PRICE:', '').trim();
        if (value !== 'NULL' && value !== 'N/A') {
          const parsed = parseFloat(value.replace(/[^0-9.]/g, ''));
          if (!isNaN(parsed)) {
            targetPrice = parsed;
          }
        }
      } else if (trimmed.startsWith('TIME_HORIZON:')) {
        timeHorizon = trimmed.replace('TIME_HORIZON:', '').trim();
      } else if (trimmed.startsWith('-')) {
        const point = trimmed.substring(1).trim();
        if (currentSection === 'keyPoints') {
          keyPoints.push(point);
        } else if (currentSection === 'risks') {
          risks.push(point);
        }
      } else if (currentSection === 'reasoning' && trimmed) {
        reasoning += ' ' + trimmed;
      }
    }

    return {
      decision,
      confidence,
      reasoning: reasoning || '분석 데이터를 기반으로 한 의견입니다.',
      keyPoints: keyPoints.length > 0 ? keyPoints : ['추가 분석 필요'],
      risks: risks.length > 0 ? risks : ['높은 변동성', '규제 리스크'],
      targetPrice,
      timeHorizon
    };
  }

  /**
   * 여러 코인 비교 분석
   */
  async compareCoins(coins: any[]): Promise<string> {
    const prompt = `
다음 암호화폐들을 비교 분석해주세요:

${coins.map((coin, idx) => `
${idx + 1}. ${coin.name} (${coin.symbol})
   - 현재가: $${coin.price}
   - 24시간 변동: ${coin.change24h}%
   - 시가총액: $${coin.marketCap}
`).join('\n')}

투자자가 알아야 할 핵심 비교 포인트를 3-5개 문장으로 요약해주세요.
어떤 코인이 어떤 상황에 적합한지 설명해주세요.
`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: '암호화폐 비교 분석 전문가입니다. 간결하고 명확하게 비교합니다.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 800
      });

      return response.choices[0].message.content || '비교 분석을 수행할 수 없습니다.';
    } catch (error: any) {
      console.error('비교 분석 실패:', error.message);
      return '비교 분석을 수행할 수 없습니다.';
    }
  }
}
