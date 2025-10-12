import axios from 'axios';

export interface SECFiling {
  ticker: string;
  filingType: string;
  filingDate: string;
  reportDate: string;
  description: string;
  url: string;
}

export interface FinancialData {
  ticker: string;
  revenue: number;
  revenueGrowth: number;
  netIncome: number;
  netIncomeGrowth: number;
  grossMargin: number;
  operatingMargin: number;
  eps: number;
  epsGrowth: number;
  assets: number;
  liabilities: number;
  equity: number;
  debtToEquity: number;
  currentRatio: number;
  reportPeriod: string;
}

export class SECDataService {
  private baseUrl = 'https://www.sec.gov';
  private headers = {
    'User-Agent': 'Stock Newsletter Bot contact@example.com',
  };

  /**
   * Get recent SEC filings for a ticker
   */
  async getRecentFilings(ticker: string, count: number = 10): Promise<SECFiling[]> {
    try {
      const url = `${this.baseUrl}/cgi-bin/browse-edgar?action=getcompany&CIK=${ticker}&type=&dateb=&owner=exclude&count=${count}&output=atom`;
      
      const response = await axios.get(url, { headers: this.headers });
      const filings = this.parseFilingsFromXML(response.data, ticker);
      
      return filings;
    } catch (error) {
      console.error(`Error fetching SEC filings for ${ticker}:`, error);
      return [];
    }
  }

  /**
   * Get specific filing types (10-K, 10-Q, 8-K)
   */
  async getFilingsByType(ticker: string, filingType: string, count: number = 5): Promise<SECFiling[]> {
    try {
      const url = `${this.baseUrl}/cgi-bin/browse-edgar?action=getcompany&CIK=${ticker}&type=${filingType}&dateb=&owner=exclude&count=${count}&output=atom`;
      
      const response = await axios.get(url, { headers: this.headers });
      const filings = this.parseFilingsFromXML(response.data, ticker);
      
      return filings;
    } catch (error) {
      console.error(`Error fetching ${filingType} filings for ${ticker}:`, error);
      return [];
    }
  }

  /**
   * Get latest 10-K (Annual Report)
   */
  async getLatest10K(ticker: string): Promise<SECFiling | null> {
    const filings = await this.getFilingsByType(ticker, '10-K', 1);
    return filings.length > 0 ? filings[0] : null;
  }

  /**
   * Get latest 10-Q (Quarterly Report)
   */
  async getLatest10Q(ticker: string): Promise<SECFiling | null> {
    const filings = await this.getFilingsByType(ticker, '10-Q', 1);
    return filings.length > 0 ? filings[0] : null;
  }

  /**
   * Get recent 8-K (Current Events)
   */
  async getRecent8K(ticker: string, count: number = 5): Promise<SECFiling[]> {
    return await this.getFilingsByType(ticker, '8-K', count);
  }

  /**
   * Parse filings from SEC XML response
   */
  private parseFilingsFromXML(xml: string, ticker: string): SECFiling[] {
    const filings: SECFiling[] = [];
    
    try {
      // Simple regex parsing for XML entries
      const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
      const titleRegex = /<title>(.*?)<\/title>/;
      const linkRegex = /<link.*?href="(.*?)"/;
      const updatedRegex = /<updated>(.*?)<\/updated>/;
      const summaryRegex = /<summary.*?>(.*?)<\/summary>/;
      
      let match;
      while ((match = entryRegex.exec(xml)) !== null) {
        const entry = match[1];
        
        const titleMatch = entry.match(titleRegex);
        const linkMatch = entry.match(linkRegex);
        const updatedMatch = entry.match(updatedRegex);
        const summaryMatch = entry.match(summaryRegex);
        
        if (titleMatch && linkMatch && updatedMatch) {
          const title = titleMatch[1];
          const filingTypeMatch = title.match(/^([\w-]+)/);
          
          filings.push({
            ticker,
            filingType: filingTypeMatch ? filingTypeMatch[1] : 'Unknown',
            filingDate: updatedMatch[1].split('T')[0],
            reportDate: updatedMatch[1].split('T')[0],
            description: summaryMatch ? summaryMatch[1].replace(/<[^>]*>/g, '').trim() : title,
            url: this.baseUrl + linkMatch[1],
          });
        }
      }
    } catch (error) {
      console.error('Error parsing SEC filings XML:', error);
    }
    
    return filings;
  }

  /**
   * Check if there are new filings in the last N days
   */
  async hasNewFilings(ticker: string, daysAgo: number = 1): Promise<{ hasNew: boolean; filings: SECFiling[] }> {
    const filings = await this.getRecentFilings(ticker, 20);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
    
    const newFilings = filings.filter(filing => {
      const filingDate = new Date(filing.filingDate);
      return filingDate >= cutoffDate;
    });
    
    return {
      hasNew: newFilings.length > 0,
      filings: newFilings,
    };
  }
}
