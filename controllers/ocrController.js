const { createClient } = require('@supabase/supabase-js');
const { extractSchedule } = require('../services/clovaOcr');
const { analyzeScheduleWithGemini } = require('../services/geminiService');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * POST /ocr/schedule
 * multipart/form-data:
 *   - photo        : 이미지 파일
 *   - user_uid     : UID
 *   - display_name : 이름(선택)
 *   - use_gemini   : Gemini 사용 여부 (선택, 기본값: true)
 *   - gemini_seed  : Gemini seed 값 (선택, 기본값: 12345)
 *   - gemini_temperature : Gemini temperature 값 (선택, 기본값: 0.1)
 *   - gemini_top_p : Gemini topP 값 (선택, 기본값: 0.3)
 *   - max_retries  : 최대 재시도 횟수 (선택, 기본값: 3)
 */
exports.handleOcr = async (req, res) => {
  const { 
    user_uid, 
    display_name, 
    use_gemini = 'true',
    gemini_seed = '42',
    gemini_temperature = '0.05',
    gemini_top_p = '0.3',
    max_retries = '5'
  } = req.body;
  
  if (!req.file || !user_uid) {
    // ✅ [1] 400 Bad Request 로깅
    logError({
      errorType: '400_BAD_REQUEST',
      location: 'ocrController.js:handleOcr',
      user_uid,
      display_name,
      statusCode: 400,
      message: '필수 파라미터 누락',
      extra: {
        hasFile: !!req.file,
        user_uid,
        display_name
      }
    });

    return res.status(400).json({
      error: '필수 파라미터 누락',
      required: ['photo', 'user_uid'],
      received: {
        hasFile: !!req.file,
        user_uid: !!user_uid,
        display_name: !!display_name,
        use_gemini: use_gemini,
        gemini_seed: gemini_seed,
        gemini_temperature: gemini_temperature,
        gemini_top_p: gemini_top_p
      }
    });
  }

  try {
    console.log(`🔍 OCR 처리 시작 - 사용자: ${user_uid}, 이름: ${display_name || '미지정'}, Gemini: ${use_gemini}`);
    console.log(`🔧 Gemini 파라미터 - seed: ${gemini_seed}, temperature: ${gemini_temperature}, topP: ${gemini_top_p}, maxRetries: ${max_retries}`);
    
    // 1) CLOVA OCR 호출
    const ocrData = await callClovaOcr(req.file.buffer);
    console.log(`✅ CLOVA OCR 완료 - 테이블 수: ${ocrData.images?.[0]?.tables?.length || 0}`);
    
    let events = [];
    
    // 2) 일정 분석 (Gemini 또는 기존 방식)
    if (use_gemini === 'true' && process.env.GEMINI_API_KEY) {
      console.log(`🤖 Gemini 2.5 Flash Lite로 일정 분석 중...`);
      events = await analyzeScheduleWithGemini(
        ocrData, 
        display_name || '', 
        2025, // year
        parseInt(gemini_seed),
        parseFloat(gemini_temperature),
        parseFloat(gemini_top_p),
        parseInt(max_retries)
      );
    } else {
      console.log(`📊 기존 방식으로 일정 분석 중...`);
      events = await extractSchedule(req.file.buffer, display_name || '');
    }
    
    console.log(`📅 파싱된 일정 수: ${events.length}`);

    if (!events.length) {
      return res.status(200).json({ 
        message: '파싱된 일정이 없습니다',
        inserted: 0, 
        schedules: [],
        analysis_method: use_gemini === 'true' ? 'gemini' : 'traditional',
        retry_info: use_gemini === 'true' ? {
          max_retries: parseInt(max_retries),
          retry_attempts: '재시도 과정은 서버 로그에서 확인 가능'
        } : null
      });
    }

    // 3) Supabase INSERT (source='ocr')
    const { data, error } = await supabase
      .from('appointments')
      .insert(events.map(e => ({
        user_uid,
        title     : e.title || e.position || '근무',
        start_time: `${e.date}T${e.start}:00+09`,
        end_time  : `${e.date}T${e.end}:00+09`,
        color     : null,
        source    : use_gemini === 'true' ? 'ocr_gemini' : 'ocr'
      })))
      .select();

    if (error) {
      console.error('❌ Supabase 저장 실패:', error);
      throw error;
    }

    console.log(`✅ ${events.length}개 일정 저장 완료`);
    
    // Flutter 앱에서 기대하는 형식으로 변환
    const formattedSchedules = events.map(e => ({
      date: e.date,
      start: e.start,
      end: e.end,
      title: e.title || e.position || '근무'
    }));
    
    res.status(201).json({
      message: '일정이 성공적으로 저장되었습니다',
      inserted: events.length,
      schedules: formattedSchedules,
      savedData: data,
      analysis_method: use_gemini === 'true' ? 'gemini' : 'traditional',
      retry_info: use_gemini === 'true' ? {
        max_retries: parseInt(max_retries),
        retry_attempts: '재시도 과정은 서버 로그에서 확인 가능'
      } : null
    });
    
  } catch (err) {
    console.error('❌ OCR 처리 중 오류:', err);
    res.status(500).json({ 
      error: 'OCR 처리 중 오류가 발생했습니다',
      details: err.message 
    });
  }
};

/**
 * CLOVA OCR API 호출 함수
 */
async function callClovaOcr(imgBuf) {
  const axios = require('axios');
  const { v4: uuid } = require('uuid');
  
  const { data } = await axios.post(
    process.env.CLOVA_URL,
    {
      version: 'V2',
      requestId: uuid(),
      timestamp: Date.now(),
      enableTableDetection: true,
      lang: 'ko',
      images: [{ name: 'upload', format: 'jpg', data: imgBuf.toString('base64') }],
    },
    {
      headers: {
        'X-OCR-SECRET': process.env.CLOVA_SECRET,
        'Content-Type': 'application/json',
      },
      timeout: 30000
    }
  );
  
  return data;
}

/**
 * GET /ocr/health
 * OCR 서비스 상태 확인
 */
exports.healthCheck = async (req, res) => {
  try {
    // 환경변수만 확인 (실제 API 호출 없음)
    const healthStatus = {
      status: 'healthy',
      clova: process.env.CLOVA_URL && process.env.CLOVA_SECRET ? 'configured' : 'not_configured',
      gemini: process.env.GEMINI_API_KEY ? 'configured' : 'not_configured',
      supabase: process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY ? 'configured' : 'not_configured',
      timestamp: new Date().toISOString()
    };
    
    // 모든 필수 환경변수가 설정되어 있는지 확인
    const allConfigured = healthStatus.clova === 'configured' && 
                         healthStatus.gemini === 'configured' && 
                         healthStatus.supabase === 'configured';
    
    if (allConfigured) {
      res.json(healthStatus);
    } else {
      res.status(503).json({
        ...healthStatus,
        status: 'unhealthy',
        error: '일부 환경변수가 설정되지 않았습니다'
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      clova: 'error',
      gemini: 'error',
      supabase: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
