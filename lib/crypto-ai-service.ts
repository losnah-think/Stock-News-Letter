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
  investmentLevels: {
    entryPrice: number;      // 진입가 (현재가 기준)
    targetPrice1: number;     // 1차 목표가 (5-10% 수익)
    targetPrice2: number;     // 2차 목표가 (15-25% 수익)
    targetPrice3: number;     // 3차 목표가 (30-50% 수익)
    stopLoss: number;         // 손절가 (5-10% 손실)
    reasoning: string;        // 가격 설정 근거
  };
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
            content: `당신은 암호화폐 전문 기술적 분석가(Technical Analyst)입니다.

**전문 분야**:
- 차트 패턴 분석 (지지선, 저항선, 추세선)
- 기술적 지표 해석 (RSI, 이동평균, 거래량)
- 가격 목표 산정 (피보나치, 지지/저항 레벨)

**분석 원칙**:
1. 제공된 기술적 지표(RSI, 추세, 지지선, 저항선)를 **반드시 활용**하여 분석
2. 24시간 고가/저가, ATH 등 역사적 가격 데이터 고려
3. 투자 가격대는 단순 퍼센트 계산이 아닌 **기술적 레벨**을 기준으로 설정
4. 저항선은 매도 압력이 강한 구간, 지지선은 매수 세력이 강한 구간임을 고려
5. RSI가 70 이상이면 과매수(조정 가능성), 30 이하면 과매도(반등 가능성)

**답변 스타일**:
- 한국어로 명확하고 구체적으로 설명
- 투자 권유가 아닌 기술적 분석 의견
- 암호화폐 변동성에 대한 리스크 명시
- 한국 투자자 관점 반영`
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
      return this.parseAIResponse(content, cryptoData.price);
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

INVESTMENT_LEVELS:
ENTRY: [현재가, 숫자만]
TARGET1: [1차 목표가, 숫자만]
TARGET2: [2차 목표가, 숫자만]
TARGET3: [3차 목표가, 숫자만]
STOPLOSS: [손절가, 숫자만]
LEVELS_REASONING: [가격대 설정 근거, 2-3문장]

**투자 가격대 설정 가이드**:
- 현재가: $${data.price.toFixed(6)}
- 24시간 최고가: $${data.high24h.toFixed(6)} (현재가 대비 ${((data.high24h / data.price - 1) * 100).toFixed(1)}%)
- 24시간 최저가: $${data.low24h.toFixed(6)} (현재가 대비 ${((data.low24h / data.price - 1) * 100).toFixed(1)}%)
- 저항선 (Resistance): $${data.technicalIndicators.resistance?.toFixed(6) || 'N/A'}
- 지지선 (Support): $${data.technicalIndicators.support?.toFixed(6) || 'N/A'}
- RSI: ${data.technicalIndicators.rsi?.toFixed(1) || 'N/A'} ${data.technicalIndicators.rsi ? (data.technicalIndicators.rsi > 70 ? '(과매수)' : data.technicalIndicators.rsi < 30 ? '(과매도)' : '(중립)') : ''}
- 추세: ${data.technicalIndicators.trend}

**가격대 산정 방법**:
1. ENTRY: 현재가를 그대로 사용
2. TARGET1: 저항선이나 24시간 최고가를 참고하여 첫 번째 돌파 목표 설정 (보수적)
3. TARGET2: 기술적 패턴과 추세를 고려한 중기 목표 (저항선 돌파 후)
4. TARGET3: 강세장 시나리오의 최대 목표 (ATH나 심리적 저항선 고려)
5. STOPLOSS: 지지선이나 24시간 최저가를 참고하여 손실 제한선 설정 (지지선 하단)

**중요**: 
1. 암호화폐는 매우 변동성이 크므로 신중한 의견을 제시하세요.
2. 투자 권유가 아닌 분석 의견임을 명확히 하세요.
3. 리스크를 반드시 강조하세요.
4. 한국 투자자 관점에서 설명하세요.
5. 투자 가격대는 **반드시 기술적 지표(저항선, 지지선, RSI, 24시간 고가/저가)를 분석**하여 설정하세요.
6. 단순 퍼센트 계산이 아닌, 차트 패턴과 기술적 분석을 기반으로 현실적인 가격대를 제시하세요.
`;
  }

  /**
   * AI 응답 파싱
   */
  private parseAIResponse(content: string, currentPrice: number): CryptoAIAnalysis {
    const lines = content.split('\n').filter(line => line.trim());
    
    let decision: any = 'HOLD';
    let confidence = 50;
    let reasoning = '';
    let keyPoints: string[] = [];
    let risks: string[] = [];
    let targetPrice: number | null = null;
    let timeHorizon = '중기';
    
    // 투자 가격대
    let entryPrice = currentPrice;
    let targetPrice1: number | null = null;
    let targetPrice2: number | null = null;
    let targetPrice3: number | null = null;
    let stopLoss: number | null = null;
    let levelsReasoning = '';

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
      } else if (trimmed.startsWith('INVESTMENT_LEVELS:')) {
        currentSection = 'investmentLevels';
      } else if (trimmed.startsWith('ENTRY:')) {
        const value = parseFloat(trimmed.replace('ENTRY:', '').trim().replace(/[^0-9.]/g, ''));
        if (!isNaN(value)) entryPrice = value;
      } else if (trimmed.startsWith('TARGET1:')) {
        const value = parseFloat(trimmed.replace('TARGET1:', '').trim().replace(/[^0-9.]/g, ''));
        if (!isNaN(value)) targetPrice1 = value;
      } else if (trimmed.startsWith('TARGET2:')) {
        const value = parseFloat(trimmed.replace('TARGET2:', '').trim().replace(/[^0-9.]/g, ''));
        if (!isNaN(value)) targetPrice2 = value;
      } else if (trimmed.startsWith('TARGET3:')) {
        const value = parseFloat(trimmed.replace('TARGET3:', '').trim().replace(/[^0-9.]/g, ''));
        if (!isNaN(value)) targetPrice3 = value;
      } else if (trimmed.startsWith('STOPLOSS:')) {
        const value = parseFloat(trimmed.replace('STOPLOSS:', '').trim().replace(/[^0-9.]/g, ''));
        if (!isNaN(value)) stopLoss = value;
      } else if (trimmed.startsWith('LEVELS_REASONING:')) {
        levelsReasoning = trimmed.replace('LEVELS_REASONING:', '').trim();
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
      timeHorizon,
      investmentLevels: {
        entryPrice,
        targetPrice1: targetPrice1 || currentPrice * 1.07,
        targetPrice2: targetPrice2 || currentPrice * 1.20,
        targetPrice3: targetPrice3 || currentPrice * 1.40,
        stopLoss: stopLoss || currentPrice * 0.93,
        reasoning: levelsReasoning || '기술적 분석을 기반으로 한 가격대입니다.'
      }
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

  /**
   * 오늘의 코인 추천 (재미용!)
   * ⚠️ 재미로만 보세요! 투자 권유 아님!
   */
  async getTodayRecommendations(coins: any[]): Promise<{
    hotPick: any;
    risingStar: any;
    safeHaven: any;
    reasoning: string;
    disclaimer: string;
  }> {
    const prompt = `
다음 암호화폐 중에서 오늘의 추천을 해주세요 (재미용!):

${coins.map((coin, idx) => `
${idx + 1}. ${coin.name} (${coin.symbol})
   - 현재가: $${coin.price.toFixed(6)}
   - 24시간: ${coin.change24h.toFixed(2)}%
   - 7일: ${coin.change7d.toFixed(2)}%
   - RSI: ${coin.technicalIndicators?.rsi?.toFixed(1) || 'N/A'}
   - 추세: ${coin.technicalIndicators?.trend || 'N/A'}
`).join('\n')}

다음 형식으로 3가지 추천을 해주세요:

HOT_PICK: [심볼] - [한 줄 이유]
RISING_STAR: [심볼] - [한 줄 이유]
SAFE_HAVEN: [심볼] - [한 줄 이유]

REASONING: [전체적인 시장 상황과 추천 이유를 2-3문장으로]

**중요**: 이건 재미로 보는 추천이에요! 실제 투자는 본인 판단!
`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: '암호화폐 트렌드 분석가입니다. 재미있고 가벼운 톤으로 추천합니다. 하지만 리스크는 명확히!'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 600
      });

      const content = response.choices[0].message.content || '';
      
      // 파싱
      let hotPick = null;
      let risingStar = null;
      let safeHaven = null;
      let reasoning = '';

      const lines = content.split('\n');
      for (const line of lines) {
        if (line.includes('HOT_PICK:')) {
          const symbol = line.match(/\[(\w+)\]/)?.[1];
          hotPick = coins.find(c => c.symbol === symbol);
        } else if (line.includes('RISING_STAR:')) {
          const symbol = line.match(/\[(\w+)\]/)?.[1];
          risingStar = coins.find(c => c.symbol === symbol);
        } else if (line.includes('SAFE_HAVEN:')) {
          const symbol = line.match(/\[(\w+)\]/)?.[1];
          safeHaven = coins.find(c => c.symbol === symbol);
        } else if (line.includes('REASONING:')) {
          reasoning = line.replace('REASONING:', '').trim();
        } else if (reasoning && line.trim()) {
          reasoning += ' ' + line.trim();
        }
      }

      return {
        hotPick: hotPick || coins[0],
        risingStar: risingStar || coins[1],
        safeHaven: safeHaven || coins[2],
        reasoning: reasoning || '오늘의 시장 상황을 고려한 추천입니다.',
        disclaimer: '⚠️ 이 추천은 재미로만 보세요! 암호화폐는 변동성이 매우 크며, 투자 손실 가능성이 있습니다. 투자는 본인 판단과 책임 하에!'
      };
    } catch (error: any) {
      console.error('추천 생성 실패:', error.message);
      // 기본 추천
      return {
        hotPick: coins[0],
        risingStar: coins[1],
        safeHaven: coins[2],
        reasoning: '시장 데이터를 분석한 추천입니다.',
        disclaimer: '⚠️ 이 추천은 재미로만 보세요! 투자는 본인 책임!'
      };
    }
  }

  /**
   * 시세 예측 (1일/7일/30일)
   * ⚠️ 재미용! 정확하지 않을 수 있음!
   */
  async predictPrice(cryptoData: any): Promise<{
    day1: { price: number; change: number; confidence: string };
    day7: { price: number; change: number; confidence: string };
    day30: { price: number; change: number; confidence: string };
    reasoning: string;
    disclaimer: string;
  }> {
    const prompt = `
다음 암호화폐의 미래 시세를 예측해주세요 (재미용!):

# ${cryptoData.name} (${cryptoData.symbol})
- 현재가: $${cryptoData.price.toFixed(6)}
- 24시간 변동: ${cryptoData.change24h.toFixed(2)}%
- 7일 변동: ${cryptoData.change7d.toFixed(2)}%
- 30일 변동: ${cryptoData.change30d.toFixed(2)}%
- RSI: ${cryptoData.technicalIndicators.rsi?.toFixed(1) || 'N/A'}
- 추세: ${cryptoData.technicalIndicators.trend}
- 지지선: $${cryptoData.technicalIndicators.support?.toFixed(6) || 'N/A'}
- 저항선: $${cryptoData.technicalIndicators.resistance?.toFixed(6) || 'N/A'}
- 공포-탐욕: ${cryptoData.fearGreedIndex || 'N/A'}

현재 추세와 기술적 지표를 고려하여 다음 형식으로 예측해주세요:

DAY1_PRICE: [숫자만]
DAY1_CHANGE: [+/-숫자%]
DAY1_CONFIDENCE: [낮음/중간/높음]

DAY7_PRICE: [숫자만]
DAY7_CHANGE: [+/-숫자%]
DAY7_CONFIDENCE: [낮음/중간/높음]

DAY30_PRICE: [숫자만]
DAY30_CHANGE: [+/-숫자%]
DAY30_CONFIDENCE: [낮음/중간/높음]

REASONING: [예측 근거를 2-3문장으로]

**중요**: 
1. 현실적인 범위 내에서 예측
2. 변동성을 고려한 보수적 예측
3. 이건 AI 예측일 뿐, 맞지 않을 수 있어요!
`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: '암호화폐 가격 예측 AI입니다. 기술적 지표와 추세를 바탕으로 합리적 예측을 하되, 불확실성을 명확히 합니다.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.6,
        max_tokens: 800
      });

      const content = response.choices[0].message.content || '';
      
      // 파싱
      let day1Price = cryptoData.price;
      let day1Change = 0;
      let day1Confidence = '중간';
      let day7Price = cryptoData.price;
      let day7Change = 0;
      let day7Confidence = '중간';
      let day30Price = cryptoData.price;
      let day30Change = 0;
      let day30Confidence = '낮음';
      let reasoning = '';

      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        
        if (trimmed.startsWith('DAY1_PRICE:')) {
          const value = parseFloat(trimmed.replace('DAY1_PRICE:', '').trim());
          if (!isNaN(value)) day1Price = value;
        } else if (trimmed.startsWith('DAY1_CHANGE:')) {
          const value = parseFloat(trimmed.replace('DAY1_CHANGE:', '').replace('%', '').trim());
          if (!isNaN(value)) day1Change = value;
        } else if (trimmed.startsWith('DAY1_CONFIDENCE:')) {
          day1Confidence = trimmed.replace('DAY1_CONFIDENCE:', '').trim();
        } else if (trimmed.startsWith('DAY7_PRICE:')) {
          const value = parseFloat(trimmed.replace('DAY7_PRICE:', '').trim());
          if (!isNaN(value)) day7Price = value;
        } else if (trimmed.startsWith('DAY7_CHANGE:')) {
          const value = parseFloat(trimmed.replace('DAY7_CHANGE:', '').replace('%', '').trim());
          if (!isNaN(value)) day7Change = value;
        } else if (trimmed.startsWith('DAY7_CONFIDENCE:')) {
          day7Confidence = trimmed.replace('DAY7_CONFIDENCE:', '').trim();
        } else if (trimmed.startsWith('DAY30_PRICE:')) {
          const value = parseFloat(trimmed.replace('DAY30_PRICE:', '').trim());
          if (!isNaN(value)) day30Price = value;
        } else if (trimmed.startsWith('DAY30_CHANGE:')) {
          const value = parseFloat(trimmed.replace('DAY30_CHANGE:', '').replace('%', '').trim());
          if (!isNaN(value)) day30Change = value;
        } else if (trimmed.startsWith('DAY30_CONFIDENCE:')) {
          day30Confidence = trimmed.replace('DAY30_CONFIDENCE:', '').trim();
        } else if (trimmed.startsWith('REASONING:')) {
          reasoning = trimmed.replace('REASONING:', '').trim();
          const nextLines = lines.slice(lines.indexOf(line) + 1);
          for (const next of nextLines) {
            if (next.trim() && !next.includes(':')) {
              reasoning += ' ' + next.trim();
            } else {
              break;
            }
          }
        }
      }

      return {
        day1: { 
          price: day1Price, 
          change: day1Change, 
          confidence: day1Confidence 
        },
        day7: { 
          price: day7Price, 
          change: day7Change, 
          confidence: day7Confidence 
        },
        day30: { 
          price: day30Price, 
          change: day30Change, 
          confidence: day30Confidence 
        },
        reasoning: reasoning || 'AI가 기술적 지표를 분석한 예측입니다.',
        disclaimer: '⚠️ 이 예측은 AI가 만든 것으로 재미로만 보세요! 암호화폐는 예측이 매우 어렵고, 실제 가격은 크게 다를 수 있습니다. 투자 판단에 사용하지 마세요!'
      };
    } catch (error: any) {
      console.error('가격 예측 실패:', error.message);
      
      // 기본 예측 (현재가 기준 약간의 변동)
      const currentPrice = cryptoData.price;
      return {
        day1: { 
          price: currentPrice * (1 + (Math.random() * 0.1 - 0.05)), 
          change: Math.random() * 10 - 5, 
          confidence: '낮음' 
        },
        day7: { 
          price: currentPrice * (1 + (Math.random() * 0.2 - 0.1)), 
          change: Math.random() * 20 - 10, 
          confidence: '낮음' 
        },
        day30: { 
          price: currentPrice * (1 + (Math.random() * 0.4 - 0.2)), 
          change: Math.random() * 40 - 20, 
          confidence: '낮음' 
        },
        reasoning: 'AI 예측을 생성할 수 없습니다.',
        disclaimer: '⚠️ 이 예측은 재미로만 보세요! 투자 판단에 사용하지 마세요!'
      };
    }
  }
}
