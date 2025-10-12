-- ========================================
-- SNL (Stock News Letter) Database Schema
-- Supabase PostgreSQL
-- ========================================

-- 1. 캐시 테이블
CREATE TABLE IF NOT EXISTS cache (
  key VARCHAR(255) PRIMARY KEY,
  value JSONB NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 캐시 만료 시간으로 인덱스
CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache(expires_at);

-- 캐시 키로 검색 최적화
CREATE INDEX IF NOT EXISTS idx_cache_key_pattern ON cache(key text_pattern_ops);

-- ========================================

-- 2. 이메일 구독 테이블
CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  ticker VARCHAR(10) NOT NULL,
  email VARCHAR(255) NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(ticker, email)
);

-- 티커별 구독자 조회 최적화
CREATE INDEX IF NOT EXISTS idx_subscriptions_ticker ON subscriptions(ticker);

-- 이메일별 구독 조회 최적화
CREATE INDEX IF NOT EXISTS idx_subscriptions_email ON subscriptions(email);

-- 활성 구독만 필터링
CREATE INDEX IF NOT EXISTS idx_subscriptions_active ON subscriptions(active);

-- ========================================

-- 3. 주식 분석 히스토리 테이블
CREATE TABLE IF NOT EXISTS stock_analyses (
  id SERIAL PRIMARY KEY,
  ticker VARCHAR(10) NOT NULL,
  current_price DECIMAL(12, 2),
  decision VARCHAR(20),
  confidence INTEGER,
  pe_ratio DECIMAL(10, 2),
  market_cap BIGINT,
  revenue_growth_yoy DECIMAL(10, 2),
  net_margin DECIMAL(10, 2),
  full_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 티커별 히스토리 조회
CREATE INDEX IF NOT EXISTS idx_analyses_ticker ON stock_analyses(ticker);

-- 최신 분석 조회 최적화
CREATE INDEX IF NOT EXISTS idx_analyses_created ON stock_analyses(created_at DESC);

-- 티커 + 날짜 복합 인덱스
CREATE INDEX IF NOT EXISTS idx_analyses_ticker_date ON stock_analyses(ticker, created_at DESC);

-- ========================================

-- 4. SEC 공시 추적 테이블
CREATE TABLE IF NOT EXISTS sec_filings (
  id SERIAL PRIMARY KEY,
  ticker VARCHAR(10) NOT NULL,
  filing_type VARCHAR(10) NOT NULL,
  filing_date DATE NOT NULL,
  filing_url TEXT,
  description TEXT,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(ticker, filing_type, filing_date)
);

-- 티커별 공시 조회
CREATE INDEX IF NOT EXISTS idx_filings_ticker ON sec_filings(ticker);

-- 미처리 공시 조회
CREATE INDEX IF NOT EXISTS idx_filings_processed ON sec_filings(processed);

-- 공시 날짜로 정렬
CREATE INDEX IF NOT EXISTS idx_filings_date ON sec_filings(filing_date DESC);

-- ========================================

-- 5. 사용 통계 테이블 (optional)
CREATE TABLE IF NOT EXISTS usage_stats (
  id SERIAL PRIMARY KEY,
  ticker VARCHAR(10),
  action VARCHAR(50), -- 'search', 'subscribe', 'analysis'
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 티커별 인기도 분석
CREATE INDEX IF NOT EXISTS idx_stats_ticker ON usage_stats(ticker);

-- 날짜별 통계
CREATE INDEX IF NOT EXISTS idx_stats_date ON usage_stats(created_at DESC);

-- ========================================

-- Row Level Security (RLS) 설정
-- 공개 읽기, 서버만 쓰기

-- 캐시 테이블 RLS
ALTER TABLE cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "캐시 읽기 허용" ON cache
  FOR SELECT TO public
  USING (true);

CREATE POLICY "캐시 쓰기 - 서비스 롤만" ON cache
  FOR ALL TO service_role
  USING (true);

-- 구독 테이블 RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "구독 읽기 허용" ON subscriptions
  FOR SELECT TO public
  USING (true);

CREATE POLICY "구독 추가 허용" ON subscriptions
  FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "구독 수정 - 본인만" ON subscriptions
  FOR UPDATE TO public
  USING (true);

-- 분석 히스토리 RLS
ALTER TABLE stock_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "분석 읽기 허용" ON stock_analyses
  FOR SELECT TO public
  USING (true);

CREATE POLICY "분석 쓰기 - 서비스 롤만" ON stock_analyses
  FOR ALL TO service_role
  USING (true);

-- ========================================

-- 함수: 만료된 캐시 자동 정리
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- 함수: 티커별 최신 분석 가져오기
CREATE OR REPLACE FUNCTION get_latest_analysis(p_ticker VARCHAR)
RETURNS TABLE (
  ticker VARCHAR,
  current_price DECIMAL,
  decision VARCHAR,
  confidence INTEGER,
  created_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sa.ticker,
    sa.current_price,
    sa.decision,
    sa.confidence,
    sa.created_at
  FROM stock_analyses sa
  WHERE sa.ticker = p_ticker
  ORDER BY sa.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 함수: 인기 종목 Top 10
CREATE OR REPLACE FUNCTION get_popular_stocks(days INTEGER DEFAULT 7)
RETURNS TABLE (
  ticker VARCHAR,
  search_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    us.ticker,
    COUNT(*) as search_count
  FROM usage_stats us
  WHERE 
    us.ticker IS NOT NULL
    AND us.created_at > NOW() - INTERVAL '1 day' * days
  GROUP BY us.ticker
  ORDER BY search_count DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- ========================================

-- 초기 데이터 설정 (optional)

-- 인기 종목 사전 캐시 워밍 트리거를 위한 테이블
CREATE TABLE IF NOT EXISTS popular_tickers (
  ticker VARCHAR(10) PRIMARY KEY,
  name VARCHAR(100),
  warm_cache BOOLEAN DEFAULT true,
  last_warmed TIMESTAMP
);

-- 기본 인기 종목
INSERT INTO popular_tickers (ticker, name) VALUES
  ('NVDA', 'NVIDIA'),
  ('AAPL', 'Apple'),
  ('TSLA', 'Tesla'),
  ('MSFT', 'Microsoft'),
  ('GOOGL', 'Google'),
  ('AMZN', 'Amazon'),
  ('META', 'Meta'),
  ('AMD', 'AMD')
ON CONFLICT (ticker) DO NOTHING;

-- ========================================

-- 뷰: 활성 구독 요약
CREATE OR REPLACE VIEW active_subscriptions_summary AS
SELECT 
  ticker,
  COUNT(*) as subscriber_count,
  MAX(created_at) as last_subscribed
FROM subscriptions
WHERE active = true
GROUP BY ticker
ORDER BY subscriber_count DESC;

-- 뷰: 최근 7일 분석 통계
CREATE OR REPLACE VIEW recent_analysis_stats AS
SELECT 
  ticker,
  COUNT(*) as analysis_count,
  AVG(confidence) as avg_confidence,
  MAX(created_at) as last_analyzed
FROM stock_analyses
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY ticker
ORDER BY analysis_count DESC;

-- ========================================

COMMENT ON TABLE cache IS '주식 분석 결과 캐시 저장 (30분 TTL)';
COMMENT ON TABLE subscriptions IS '사용자 이메일 구독 정보';
COMMENT ON TABLE stock_analyses IS '주식 분석 히스토리 (트렌드 분석용)';
COMMENT ON TABLE sec_filings IS 'SEC 공시 추적 (중복 알림 방지)';
COMMENT ON TABLE usage_stats IS '서비스 사용 통계 (인기 종목 파악)';
