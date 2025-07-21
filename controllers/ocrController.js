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
 */
exports.handleOcr = async (req, res) => {
  const { user_uid, display_name, use_gemini = 'true' } = req.body;
  
  if (!req.file || !user_uid) {
    return res.status(400).json({ 
      error: '필수 파라미터 누락', 
      required: ['photo', 'user_uid'],
      received: {
        hasFile: !!req.file,
        user_uid: !!user_uid,
        display_name: !!display_name,
        use_gemini: use_gemini
      }
    });
  }

  try {
    console.log(`🔍 OCR 처리 시작 - 사용자: ${user_uid}, 이름: ${display_name || '미지정'}, Gemini: ${use_gemini}`);
    
    // 1) CLOVA OCR 호출
    const ocrData = await callClovaOcr(req.file.buffer);
    console.log(`✅ CLOVA OCR 완료 - 테이블 수: ${ocrData.images?.[0]?.tables?.length || 0}`);
    
    let events = [];
    
    // 2) 일정 분석 (Gemini 또는 기존 방식)
    if (use_gemini === 'true' && process.env.GEMINI_API_KEY) {
      console.log(`🤖 Gemini 2.0 Flash로 일정 분석 중...`);
      events = await analyzeScheduleWithGemini(ocrData, display_name || '');
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
        analysis_method: use_gemini === 'true' ? 'gemini' : 'traditional'
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
    
    res.status(201).json({
      message: '일정이 성공적으로 저장되었습니다',
      inserted: events.length,
      schedules: events,
      savedData: data,
      analysis_method: use_gemini === 'true' ? 'gemini' : 'traditional'
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
    // Clova OCR 서비스 연결 테스트
    const axios = require('axios');
    const testResponse = await axios.post(
      process.env.CLOVA_URL,
      {
        version: 'V2',
        requestId: require('uuid').v4(),
        timestamp: Date.now(),
        enableTableDetection: true,
        lang: 'ko',
        images: [{ 
          name: 'test', 
          format: 'jpg', 
          data: Buffer.from('test').toString('base64') 
        }],
      },
      {
        headers: {
          'X-OCR-SECRET': process.env.CLOVA_SECRET,
          'Content-Type': 'application/json',
        },
        timeout: 5000
      }
    );
    
    const healthStatus = {
      status: 'healthy',
      clova: 'connected',
      gemini: process.env.GEMINI_API_KEY ? 'configured' : 'not_configured',
      timestamp: new Date().toISOString()
    };
    
    res.json(healthStatus);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      clova: 'disconnected',
      gemini: process.env.GEMINI_API_KEY ? 'configured' : 'not_configured',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
