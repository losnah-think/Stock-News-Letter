/**
 * Supabase DB 활동 유지 스크립트
 * 
 * 매일 자동으로 DB에 활동을 유발하여 "inactive" 상태 방지
 * 
 * 실행 방법:
 * npx tsx scripts/keep-alive.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// .env.local 로드
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function keepAlive() {
  try {
    const timestamp = new Date().toISOString();
    
    console.log(`⏰ ${new Date().toLocaleString('ko-KR')} - Keep-alive 시작`);

    // 1. Heartbeat 데이터 저장
    const heartbeatKey = 'system:heartbeat';
    const { error: heartbeatError } = await supabase
      .from('cache')
      .upsert({
        key: heartbeatKey,
        value: { 
          timestamp,
          message: 'SNL system is alive',
          uptime: process.uptime()
        },
        expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString() // 24시간
      });

    if (heartbeatError) {
      console.error('❌ Heartbeat 저장 실패:', heartbeatError.message);
    } else {
      console.log('✅ Heartbeat 저장 성공');
    }

    // 2. 캐시 통계 조회
    const { count, error: countError } = await supabase
      .from('cache')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ 캐시 통계 조회 실패:', countError.message);
    } else {
      console.log(`📊 현재 캐시: ${count || 0}개`);
    }

    // 3. 만료된 캐시 정리
    const { error: cleanupError } = await supabase
      .from('cache')
      .delete()
      .lt('expires_at', timestamp);

    if (cleanupError) {
      console.error('❌ 캐시 정리 실패:', cleanupError.message);
    } else {
      console.log('🧹 만료된 캐시 정리 완료');
    }

    // 4. 사용 통계 기록 (optional)
    const { error: statsError } = await supabase
      .from('usage_stats')
      .insert({
        action: 'keep_alive',
        ticker: null,
        ip_address: null,
        user_agent: 'SNL-KeepAlive-Script'
      });

    if (statsError && !statsError.message.includes('does not exist')) {
      console.error('⚠️ 통계 기록 실패:', statsError.message);
    }

    console.log('✅ Keep-alive 완료\n');

  } catch (error) {
    console.error('❌ Keep-alive 오류:', error);
  }
}

// 실행
keepAlive();
