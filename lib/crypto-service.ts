/**
 * 암호화폐 데이터 서비스
 * CoinGecko API 사용
 */

import axios from 'axios';

interface CryptoData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d: number;
  price_change_percentage_30d: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number | null;
  ath: number;
  ath_change_percentage: number;
  ath_date: string;
  atl: number;
  atl_change_percentage: number;
  atl_date: string;
}

interface CryptoMarketData {
  prices: [number, number][];
  market_caps: [number, number][];
  total_volumes: [number, number][];
}

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
}

export class CryptoDataService {
  private baseUrl = 'https://api.coingecko.com/api/v3';
  private usdToKrw = 1350; // 환율 (실시간으로 가져오거나 고정값 사용)

  // 심볼을 CoinGecko ID로 매핑
  private symbolToId: { [key: string]: string } = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'DOGE': 'dogecoin',
    'XRP': 'ripple',
    'ADA': 'cardano',
    'SOL': 'solana',
    'MATIC': 'matic-network',
    'DOT': 'polkadot',
    'SHIB': 'shiba-inu',
    'AVAX': 'avalanche-2',
    'LINK': 'chainlink',
    'UNI': 'uniswap',
    'LTC': 'litecoin',
    'BCH': 'bitcoin-cash',
    'ATOM': 'cosmos',
    'ETC': 'ethereum-classic',
    'XLM': 'stellar',
    'ALGO': 'algorand',
    'VET': 'vechain',
    'ICP': 'internet-computer',
  };

  /**
   * 환율 가져오기 (USD to KRW)
   */
  private async getExchangeRate(): Promise<number> {
    try {
      const response = await axios.get(`${this.baseUrl}/simple/price`, {
        params: {
          ids: 'usd',
          vs_currencies: 'krw'
        }
      });
      return response.data.usd?.krw || 1350;
    } catch (error) {
      console.error('환율 조회 실패:', error);
      return 1350; // 기본 환율
    }
  }

  /**
   * 암호화폐 상세 데이터 가져오기
   */
  async getCryptoData(symbol: string): Promise<CryptoAnalysis> {
    const coinId = this.symbolToId[symbol.toUpperCase()] || symbol.toLowerCase();
    
    try {
      // 환율 가져오기
      this.usdToKrw = await this.getExchangeRate();

      // 코인 데이터 가져오기
      const response = await axios.get(`${this.baseUrl}/coins/${coinId}`, {
        params: {
          localization: false,
          tickers: false,
          community_data: false,
          developer_data: false,
          sparkline: true
        }
      });

      const data = response.data;
      const marketData = data.market_data;

      // 기술적 지표 계산
      const technicalIndicators = this.calculateTechnicalIndicators(
        marketData.current_price.usd,
        marketData.high_24h.usd,
        marketData.low_24h.usd,
        marketData.price_change_percentage_7d,
        marketData.price_change_percentage_30d
      );

      // 시장 지배율 계산 (비트코인만)
      let dominance = null;
      if (symbol.toUpperCase() === 'BTC') {
        const globalData = await this.getGlobalData();
        dominance = globalData?.bitcoin_dominance || null;
      }

      return {
        symbol: data.symbol.toUpperCase(),
        name: data.name,
        price: marketData.current_price.usd,
        priceKRW: marketData.current_price.usd * this.usdToKrw,
        marketCap: this.formatLargeNumber(marketData.market_cap.usd),
        marketCapKRW: this.formatLargeNumber(marketData.market_cap.usd * this.usdToKrw),
        rank: marketData.market_cap_rank,
        volume24h: this.formatLargeNumber(marketData.total_volume.usd),
        volume24hKRW: this.formatLargeNumber(marketData.total_volume.usd * this.usdToKrw),
        high24h: marketData.high_24h.usd,
        low24h: marketData.low_24h.usd,
        change24h: marketData.price_change_percentage_24h || 0,
        change7d: marketData.price_change_percentage_7d || 0,
        change30d: marketData.price_change_percentage_30d || 0,
        circulatingSupply: this.formatLargeNumber(marketData.circulating_supply),
        totalSupply: this.formatLargeNumber(marketData.total_supply),
        maxSupply: marketData.max_supply ? this.formatLargeNumber(marketData.max_supply) : null,
        ath: marketData.ath.usd,
        athChange: marketData.ath_change_percentage.usd,
        athDate: new Date(marketData.ath_date.usd).toLocaleDateString('ko-KR'),
        dominance,
        fearGreedIndex: null, // 별도 API로 가져와야 함
        technicalIndicators
      };
    } catch (error: any) {
      console.error(`암호화폐 데이터 조회 실패 (${symbol}):`, error.message);
      throw new Error(`${symbol} 데이터를 가져올 수 없습니다.`);
    }
  }

  /**
   * 글로벌 시장 데이터 가져오기
   */
  private async getGlobalData(): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/global`);
      return response.data.data;
    } catch (error) {
      console.error('글로벌 데이터 조회 실패:', error);
      return null;
    }
  }

  /**
   * 기술적 지표 계산 (간단한 버전)
   */
  private calculateTechnicalIndicators(
    currentPrice: number,
    high24h: number,
    low24h: number,
    change7d: number,
    change30d: number
  ) {
    // RSI 간단 계산 (실제로는 14일 데이터 필요)
    let rsi: number | null = null;
    if (change7d > 10) {
      rsi = 70 + (change7d - 10) * 2; // 과매수
    } else if (change7d < -10) {
      rsi = 30 + (change7d + 10) * 2; // 과매도
    } else {
      rsi = 50 + change7d * 2; // 중립
    }
    rsi = Math.min(100, Math.max(0, rsi));

    // 추세 판단
    let trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    if (change7d > 5 && change30d > 10) {
      trend = 'BULLISH';
    } else if (change7d < -5 && change30d < -10) {
      trend = 'BEARISH';
    }

    // 지지선/저항선 (24시간 기준)
    const support = low24h * 0.98;
    const resistance = high24h * 1.02;

    return {
      rsi,
      trend,
      support,
      resistance
    };
  }

  /**
   * 큰 숫자 포맷팅
   */
  private formatLargeNumber(num: number): string {
    if (num >= 1e12) {
      return `${(num / 1e12).toFixed(2)}T`;
    } else if (num >= 1e9) {
      return `${(num / 1e9).toFixed(2)}B`;
    } else if (num >= 1e6) {
      return `${(num / 1e6).toFixed(2)}M`;
    } else if (num >= 1e3) {
      return `${(num / 1e3).toFixed(2)}K`;
    }
    return num.toFixed(2);
  }

  /**
   * 공포-탐욕 지수 가져오기 (Alternative.me API)
   */
  async getFearGreedIndex(): Promise<number | null> {
    try {
      const response = await axios.get('https://api.alternative.me/fng/');
      return parseInt(response.data.data[0].value);
    } catch (error) {
      console.error('공포-탐욕 지수 조회 실패:', error);
      return null;
    }
  }

  /**
   * 암호화폐 뉴스 가져오기 (CoinGecko 없음, 대체 API 필요)
   */
  async getCryptoNews(symbol: string): Promise<any[]> {
    // CryptoCompare 또는 다른 뉴스 API 사용
    // 여기서는 간단히 빈 배열 반환
    return [];
  }

  /**
   * 여러 암호화폐 한번에 가져오기
   */
  async getMultipleCryptos(symbols: string[]): Promise<any[]> {
    const ids = symbols.map(s => this.symbolToId[s.toUpperCase()] || s.toLowerCase());
    
    try {
      const response = await axios.get(`${this.baseUrl}/coins/markets`, {
        params: {
          vs_currency: 'usd',
          ids: ids.join(','),
          order: 'market_cap_desc',
          sparkline: false,
          price_change_percentage: '24h,7d,30d'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('다중 암호화폐 조회 실패:', error);
      return [];
    }
  }
}
