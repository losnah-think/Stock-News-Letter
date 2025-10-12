import axios from 'axios';

export interface NewsArticle {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  summary?: string;
}

export class NewsService {
  /**
   * Get recent news for a ticker from multiple sources
   */
  async getNews(ticker: string, limit: number = 5): Promise<NewsArticle[]> {
    try {
      // Using Yahoo Finance RSS feed as a free option
      const yahooNews = await this.getYahooNews(ticker, limit);
      return yahooNews;
    } catch (error) {
      console.error(`Error fetching news for ${ticker}:`, error);
      return [];
    }
  }

  /**
   * Get news from Yahoo Finance
   */
  private async getYahooNews(ticker: string, limit: number): Promise<NewsArticle[]> {
    try {
      const url = `https://finance.yahoo.com/rss/headline?s=${ticker}`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const news: NewsArticle[] = [];
      const xml = response.data;

      // Simple regex parsing for RSS
      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      const titleRegex = /<title><!\[CDATA\[(.*?)\]\]><\/title>/;
      const linkRegex = /<link>(.*?)<\/link>/;
      const pubDateRegex = /<pubDate>(.*?)<\/pubDate>/;
      const descriptionRegex = /<description><!\[CDATA\[(.*?)\]\]><\/description>/;

      let match;
      let count = 0;

      while ((match = itemRegex.exec(xml)) !== null && count < limit) {
        const item = match[1];
        
        const titleMatch = item.match(titleRegex);
        const linkMatch = item.match(linkRegex);
        const pubDateMatch = item.match(pubDateRegex);
        const descriptionMatch = item.match(descriptionRegex);

        if (titleMatch && linkMatch && pubDateMatch) {
          news.push({
            title: titleMatch[1].trim(),
            url: linkMatch[1].trim(),
            source: 'Yahoo Finance',
            publishedAt: new Date(pubDateMatch[1]).toISOString(),
            summary: descriptionMatch ? descriptionMatch[1].replace(/<[^>]*>/g, '').trim().substring(0, 200) : undefined,
          });
          count++;
        }
      }

      return news;
    } catch (error) {
      console.error('Error fetching Yahoo news:', error);
      
      // Fallback: Return mock news structure
      return this.getMockNews(ticker);
    }
  }

  /**
   * Fallback mock news when API fails
   */
  private getMockNews(ticker: string): NewsArticle[] {
    return [
      {
        title: `${ticker} 최신 뉴스를 불러올 수 없습니다`,
        url: `https://finance.yahoo.com/quote/${ticker}/news`,
        source: 'Yahoo Finance',
        publishedAt: new Date().toISOString(),
        summary: '뉴스를 확인하려면 Yahoo Finance를 방문하세요.',
      },
    ];
  }

  /**
   * Get company-specific news from SEC filings
   */
  async getFilingNews(ticker: string): Promise<NewsArticle[]> {
    // This would integrate with SEC EDGAR RSS feeds
    // For now, return empty array
    return [];
  }
}
