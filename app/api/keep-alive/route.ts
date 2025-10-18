/**
 * Keep-Alive API Endpoint
 * 
 * Vercel Cron으로 매일 실행하여 Supabase DB 활동 유지
 * 
 * Cron Schedule: 매일 자정 (KST 09:00)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 최대 실행 시간 30초
export const maxDuration = 30;

// Cron secret 검증
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  // Cron secret 검증
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const timestamp = new Date().toISOString();

    console.log(`⏰ [${timestamp}] Keep-alive started`);

    // 1. Heartbeat 저장
    const heartbeatKey = 'system:heartbeat';
    const { error: heartbeatError } = await supabase
      .from('cache')
      .upsert({
        key: heartbeatKey,
        value: { 
          timestamp,
          message: 'SNL system is alive',
          cron_trigger: true
        },
        expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString()
      });

    if (heartbeatError) {
      console.error('❌ Heartbeat failed:', heartbeatError.message);
    }

    // 2. 캐시 통계
    const { count } = await supabase
      .from('cache')
      .select('*', { count: 'exact', head: true });

    // 3. 만료된 캐시 정리
    const { error: cleanupError } = await supabase
      .from('cache')
      .delete()
      .lt('expires_at', timestamp);

    if (cleanupError) {
      console.error('❌ Cleanup failed:', cleanupError.message);
    }

    // 4. 사용 통계 기록 (테이블 없어도 무시)
    try {
      await supabase
        .from('usage_stats')
        .insert({
          action: 'keep_alive',
          user_agent: 'Vercel-Cron'
        });
    } catch (statsError) {
      // usage_stats 테이블 없어도 무시
    }

    console.log(`✅ Keep-alive completed. Active cache: ${count || 0}`);

    return NextResponse.json({
      success: true,
      timestamp,
      active_cache_count: count || 0,
      message: 'Database activity recorded'
    });

  } catch (error: any) {
    console.error('❌ Keep-alive error:', error);
    return NextResponse.json(
      { 
        error: 'Keep-alive failed',
        message: error.message 
      },
      { status: 500 }
    );
  }
}
