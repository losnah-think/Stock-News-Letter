import yahooFinance from 'yahoo-finance2';

export interface QuarterlyFinancials {
  period: string;
  revenue: number;
  netIncome: number;
  eps: number;
  grossProfit: number;
  operatingIncome: number;
  totalAssets: number;
  totalLiabilities: number;
  stockholderEquity: number;
}

export interface FinancialAnalysis {
  ticker: string;
  currentPrice: number;
  marketCap: number;
  
  // Growth metrics
  revenueGrowthQoQ: number;
  revenueGrowthYoY: number;
  netIncomeGrowthQoQ: number;
  netIncomeGrowthYoY: number;
  epsGrowthYoY: number;
  
  // Profitability metrics
  grossMargin: number;
  operatingMargin: number;
  netMargin: number;
  roe: number; // Return on Equity
  
  // Health metrics
  debtToEquity: number;
  currentRatio: number;
  
  // Valuation
  pe: number;
  forwardPE: number;
  pegRatio: number;
  
  // Recent data
  quarterlyData: QuarterlyFinancials[];
  lastUpdated: string;
}

export class FinancialDataService {
  /**
   * Get comprehensive financial analysis for a ticker
   */
  async getFinancialAnalysis(ticker: string): Promise<FinancialAnalysis | null> {
    try {
      const [quote, financials, insights] = await Promise.all([
        yahooFinance.quote(ticker),
        yahooFinance.quoteSummary(ticker, {
          modules: ['financialData', 'defaultKeyStatistics', 'incomeStatementHistory', 
                    'incomeStatementHistoryQuarterly', 'balanceSheetHistory', 
                    'balanceSheetHistoryQuarterly', 'cashflowStatementHistory']
        }),
        yahooFinance.quoteSummary(ticker, {
          modules: ['earnings', 'earningsHistory']
        })
      ]);

      const financialData = financials.financialData;
      const keyStats = financials.defaultKeyStatistics;
      const incomeQuarterly = financials.incomeStatementHistoryQuarterly?.incomeStatementHistory || [];
      const balanceQuarterly = financials.balanceSheetHistoryQuarterly?.balanceSheetStatements || [];

      // Process quarterly data
      const quarterlyData = this.processQuarterlyData(incomeQuarterly, balanceQuarterly);

      // Calculate growth rates
      const { revenueGrowthQoQ, revenueGrowthYoY, netIncomeGrowthQoQ, netIncomeGrowthYoY, epsGrowthYoY } = 
        this.calculateGrowthRates(quarterlyData, insights.earnings);

      // Calculate margins
      const latest = quarterlyData[0];
      const grossMargin = latest ? (latest.grossProfit / latest.revenue) * 100 : 0;
      const operatingMargin = latest ? (latest.operatingIncome / latest.revenue) * 100 : 0;
      const netMargin = latest ? (latest.netIncome / latest.revenue) * 100 : 0;

      // Calculate health metrics
      const debtToEquity = latest ? (latest.totalLiabilities / latest.stockholderEquity) : 0;
      const roe = latest && latest.stockholderEquity > 0 ? 
        (latest.netIncome / latest.stockholderEquity) * 100 : 0;

      return {
        ticker,
        currentPrice: quote.regularMarketPrice || 0,
        marketCap: quote.marketCap || 0,
        
        revenueGrowthQoQ,
        revenueGrowthYoY,
        netIncomeGrowthQoQ,
        netIncomeGrowthYoY,
        epsGrowthYoY,
        
        grossMargin,
        operatingMargin,
        netMargin,
        roe,
        
        debtToEquity,
        currentRatio: financialData?.currentRatio || 0,
        
        pe: quote.trailingPE || 0,
        forwardPE: quote.forwardPE || 0,
        pegRatio: keyStats?.pegRatio || 0,
        
        quarterlyData,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`Error fetching financial data for ${ticker}:`, error);
      return null;
    }
  }

  /**
   * Process quarterly financial data
   */
  private processQuarterlyData(income: any[], balance: any[]): QuarterlyFinancials[] {
    const data: QuarterlyFinancials[] = [];

    for (let i = 0; i < Math.min(4, income.length); i++) {
      const incomeStmt = income[i];
      const balanceStmt = balance[i];

      if (incomeStmt) {
        data.push({
          period: incomeStmt.endDate?.toISOString().split('T')[0] || 'Unknown',
          revenue: incomeStmt.totalRevenue || 0,
          netIncome: incomeStmt.netIncome || 0,
          eps: 0, // Will be calculated separately
          grossProfit: incomeStmt.grossProfit || 0,
          operatingIncome: incomeStmt.operatingIncome || 0,
          totalAssets: balanceStmt?.totalAssets || 0,
          totalLiabilities: balanceStmt?.totalLiab || 0,
          stockholderEquity: balanceStmt?.totalStockholderEquity || 0,
        });
      }
    }

    return data;
  }

  /**
   * Calculate growth rates
   */
  private calculateGrowthRates(quarterly: QuarterlyFinancials[], earnings: any) {
    let revenueGrowthQoQ = 0;
    let revenueGrowthYoY = 0;
    let netIncomeGrowthQoQ = 0;
    let netIncomeGrowthYoY = 0;
    let epsGrowthYoY = 0;

    if (quarterly.length >= 2) {
      // Quarter over Quarter
      revenueGrowthQoQ = ((quarterly[0].revenue - quarterly[1].revenue) / quarterly[1].revenue) * 100;
      netIncomeGrowthQoQ = ((quarterly[0].netIncome - quarterly[1].netIncome) / quarterly[1].netIncome) * 100;
    }

    if (quarterly.length >= 4) {
      // Year over Year
      revenueGrowthYoY = ((quarterly[0].revenue - quarterly[3].revenue) / quarterly[3].revenue) * 100;
      netIncomeGrowthYoY = ((quarterly[0].netIncome - quarterly[3].netIncome) / quarterly[3].netIncome) * 100;
    }

    if (earnings?.earningsChart?.quarterly && earnings.earningsChart.quarterly.length >= 4) {
      const latestEPS = earnings.earningsChart.quarterly[0]?.actual || 0;
      const yearAgoEPS = earnings.earningsChart.quarterly[3]?.actual || 0;
      if (yearAgoEPS !== 0) {
        epsGrowthYoY = ((latestEPS - yearAgoEPS) / yearAgoEPS) * 100;
      }
    }

    return { revenueGrowthQoQ, revenueGrowthYoY, netIncomeGrowthQoQ, netIncomeGrowthYoY, epsGrowthYoY };
  }

  /**
   * Get historical price data
   */
  async getHistoricalPrices(ticker: string, daysAgo: number = 365) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      const result = await yahooFinance.historical(ticker, {
        period1: startDate,
        period2: endDate,
        interval: '1d'
      });

      return result;
    } catch (error) {
      console.error(`Error fetching historical prices for ${ticker}:`, error);
      return [];
    }
  }
}
