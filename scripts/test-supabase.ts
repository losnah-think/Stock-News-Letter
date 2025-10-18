/**
 * Supabase 연결 및 캐시 테스트 스크립트
 * 
 * 실행 방법:
 * npx tsx scripts/test-supabase.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// .env.local 로드
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSupabase() {
  console.log('🔍 Supabase 연결 테스트 시작...\n');

  try {
    // 1. 캐시 테이블 존재 확인
    console.log('1️⃣ 캐시 테이블 확인...');
    const { data: tables, error: tableError } = await supabase
      .from('cache')
      .select('*')
      .limit(1);

    if (tableError) {
      console.error('❌ 캐시 테이블 없음:', tableError.message);
      console.log('📝 Supabase Dashboard에서 schema.sql을 실행하세요!');
      console.log('   https://supabase.com/dashboard/project/ebuogvnrfcuibhuqfyqd/editor/sql');
      return;
    }

    console.log('✅ 캐시 테이블 존재\n');

    // 2. 테스트 데이터 삽입
    console.log('2️⃣ 테스트 캐시 데이터 삽입...');
    const testKey = `test:${Date.now()}`;
    const testValue = {
      ticker: 'TEST',
      price: 100.50,
      timestamp: new Date().toISOString()
    };
    const expiresAt = new Date(Date.now() + 3600 * 1000); // 1시간 후

    const { error: insertError } = await supabase
      .from('cache')
      .upsert({
        key: testKey,
        value: testValue,
        expires_at: expiresAt.toISOString()
      });

    if (insertError) {
      console.error('❌ 삽입 실패:', insertError.message);
      return;
    }

    console.log('✅ 테스트 데이터 삽입 성공');
    console.log(`   Key: ${testKey}`);
    console.log(`   Expires: ${expiresAt.toLocaleString('ko-KR')}\n`);

    // 3. 데이터 읽기
    console.log('3️⃣ 캐시 데이터 읽기...');
    const { data: readData, error: readError } = await supabase
      .from('cache')
      .select('*')
      .eq('key', testKey)
      .single();

    if (readError) {
      console.error('❌ 읽기 실패:', readError.message);
      return;
    }

    console.log('✅ 캐시 데이터 읽기 성공');
    console.log('   Value:', readData.value);
    console.log('   Created:', new Date(readData.created_at).toLocaleString('ko-KR'), '\n');

    // 4. 전체 캐시 목록 확인
    console.log('4️⃣ 전체 캐시 목록...');
    const { data: allCache, error: listError } = await supabase
      .from('cache')
      .select('key, created_at, expires_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (listError) {
      console.error('❌ 목록 조회 실패:', listError.message);
      return;
    }

    console.log(`✅ 현재 ${allCache?.length || 0}개의 캐시 항목 존재`);
    if (allCache && allCache.length > 0) {
      console.log('\n최근 캐시 항목:');
      allCache.forEach((item, idx) => {
        const isExpired = new Date(item.expires_at) < new Date();
        console.log(`   ${idx + 1}. ${item.key} ${isExpired ? '(만료됨 ⏰)' : '(유효 ✅)'}`);
      });
    }

    // 5. 만료된 캐시 정리
    console.log('\n5️⃣ 만료된 캐시 정리...');
    const { error: deleteError } = await supabase
      .from('cache')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (deleteError) {
      console.error('❌ 정리 실패:', deleteError.message);
    } else {
      console.log('✅ 만료된 캐시 정리 완료\n');
    }

    // 6. 통계
    const { count } = await supabase
      .from('cache')
      .select('*', { count: 'exact', head: true });

    console.log('\n📊 최종 통계:');
    console.log(`   활성 캐시: ${count || 0}개`);
    console.log(`   테스트 시간: ${new Date().toLocaleString('ko-KR')}`);
    console.log('\n✅ 모든 테스트 완료! Supabase가 정상 작동합니다. 🎉\n');

  } catch (error) {
    console.error('❌ 예기치 않은 오류:', error);
  }
}

// 실행
testSupabase();
