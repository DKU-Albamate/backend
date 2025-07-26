// services/geminiService.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Gemini API 설정 (기본값)
const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * CLOVA OCR 결과를 Gemini 2.0 Flash로 분석하여 근무일정 추출
 * @param {Object} ocrData - CLOVA OCR JSON 결과
 * @param {string} targetName - 찾을 직원 이름
 * @param {number} year - 연도 (기본값: 2025)
 * @param {number} seed - Gemini seed 값 (기본값: 12345)
 * @param {number} temperature - Gemini temperature 값 (기본값: 0.1)
 * @param {number} topP - Gemini topP 값 (기본값: 0.8)
 * @returns {Array} 근무일정 리스트
 */
async function analyzeScheduleWithGemini(ocrData, targetName, year = 2025, seed = 12345, temperature = 0.1, topP = 0.8) {
  try {
    console.log(`🤖 Gemini 2.0 Flash 분석 시작 - 대상: ${targetName}`);
    console.log(`🔧 Gemini 파라미터 - seed: ${seed}, temperature: ${temperature}, topP: ${topP}`);
    
    // 동적으로 모델 생성 (파라미터 적용)
    const model = genai.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: temperature,
        topP: topP,
        seed: seed
      }
    });
    
    // 디버깅: OCR 데이터 구조 확인
    console.log(`🔍 OCR 데이터 구조 분석:`);
    try {
      if (ocrData.images && ocrData.images.length > 0) {
        const image = ocrData.images[0];
        if (image.tables && image.tables.length > 0) {
          const table = image.tables[0];
          const cells = table.cells || [];
          console.log(`   📊 테이블 정보: ${cells.length}개 셀`);
          
          // 날짜 정보가 있는 셀들 찾기
          const dateCells = [];
          for (const cell of cells) {
            const cellText = cell.cellTextLines
              ?.flatMap(ln => ln.cellWords || [])
              ?.map(w => w.inferText)
              ?.join(' ')
              ?.trim() || '';
            
            // 월/일 패턴 찾기
            if ((cellText.includes('월') || cellText.includes('/') || cellText.includes('-')) && 
                /[1-9]|[12]\d|3[01]/.test(cellText)) {
              dateCells.push(`행${cell.rowIndex}열${cell.columnIndex}: ${cellText}`);
            }
          }
          
          console.log(`   📅 날짜 관련 셀들: ${dateCells.length}개`);
          
          // 대상 직원이 있는 셀들 찾기
          const targetCells = [];
          for (const cell of cells) {
            const cellText = cell.cellTextLines
              ?.flatMap(ln => ln.cellWords || [])
              ?.map(w => w.inferText)
              ?.join(' ')
              ?.trim() || '';
            
            if (cellText.includes(targetName)) {
              targetCells.push(`행${cell.rowIndex}열${cell.columnIndex}: ${cellText}`);
            }
          }
          
          console.log(`   👤 ${targetName} 관련 셀들: ${targetCells.length}개`);
        } else {
          console.log('   ❌ 테이블 데이터 없음');
        }
      } else {
        console.log('   ❌ 이미지 데이터 없음');
      }
    } catch (e) {
      console.log(`   ❌ 데이터 분석 실패: ${e}`);
    }
    
    // Gemini에게 전달할 프롬프트 구성
    const prompt = `
당신은 근무일정표를 분석하는 전문가입니다.
CLOVA OCR로 추출된 표 데이터를 분석하여 특정 직원의 근무일정을 JSON 형태로 반환해주세요.

**분석 대상 직원**: ${targetName}
**기준 연도**: ${year}년

**CLOVA OCR 결과**:
${JSON.stringify(ocrData, null, 2)}

**분석 방법**:
1. **단계별 분석**:
   - 먼저 표의 헤더 행에서 모든 날짜를 찾으세요
   - 각 날짜 열에서 ${targetName}이 언급된 셀을 찾으세요
   - 해당 셀의 시간 정보를 추출하세요

2. **날짜 매칭**:
   - 헤더의 날짜와 ${targetName}이 있는 셀의 열 인덱스를 매칭하세요
   - 예: 헤더에 "07월 11일"이 열17에 있다면, 열17에서 ${targetName} 찾기

3. **시간 추출**:
   - ${targetName}이 있는 셀에서 시간 정보 추출
   - "HH:MM" 형식으로 변환
   - 종료 시간이 없으면 시작 시간 + 1시간

**날짜 형식 처리**:
- "MM월 DD일" 형식 → "YYYY-MM-DD"로 변환
- "MM/DD" 형식 → "YYYY-MM-DD"로 변환
- "MM-DD" 형식 → "YYYY-MM-DD"로 변환
- 연도가 없는 경우 ${year}년 사용

**시간 형식 처리**:
- "HH:MM" 형식 유지
- "HH시 MM분" → "HH:MM"으로 변환
- "HH.MM" → "HH:MM"으로 변환

**반환 형식** (JSON 배열):
[
  {
    "name": "${targetName}",
    "position": "포지션명",
    "date": "YYYY-MM-DD",
    "start": "HH:MM",
    "end": "HH:MM"
  }
]

**매우 중요한 주의사항**:
- 정확한 JSON 형식으로만 응답하세요
- 설명이나 추가 텍스트는 포함하지 마세요
- 날짜와 시간 형식을 정확히 지켜주세요
- 찾을 수 없는 경우 빈 배열 []을 반환하세요
- **${targetName}이 언급된 모든 셀을 반드시 포함하세요**
- **열 인덱스를 정확히 매칭하여 날짜와 시간을 연결하세요**
- **하나도 빠뜨리지 마세요**
`;

    // Gemini API 호출
    console.log(`🤖 Gemini API 호출 시작...`);
    console.log(`   📝 프롬프트 길이: ${prompt.length} 문자`);
    console.log(`   🔧 사용된 파라미터: seed=${seed}, temperature=${temperature}, topP=${topP}`);
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text().trim();
    
    // 디버깅: Gemini 응답 로그 출력
    console.log(`🤖 Gemini 응답:`);
    console.log(`   📏 응답 길이: ${responseText.length} 문자`);
    console.log(`   📄 응답 내용: ${responseText}`);
    
    // 코드 블록 제거 (```json ... ```)
    let cleanResponse = responseText;
    if (cleanResponse.startsWith('```json')) {
      cleanResponse = cleanResponse.substring(7); // ```json 제거
      console.log(`   🧹 JSON 코드 블록 제거됨`);
    }
    if (cleanResponse.endsWith('```')) {
      cleanResponse = cleanResponse.substring(0, cleanResponse.length - 3); // ``` 제거
      console.log(`   🧹 코드 블록 끝 제거됨`);
    }
    cleanResponse = cleanResponse.trim();
    
    console.log(`   🧹 정리된 응답: ${cleanResponse}`);

    // JSON 파싱
    try {
      const schedules = JSON.parse(cleanResponse);
      
      // 결과 검증
      if (Array.isArray(schedules)) {
        console.log(`✅ Gemini 분석 완료: ${schedules.length}개 일정 발견`);
        for (const schedule of schedules) {
          console.log(`   - ${schedule.date} ${schedule.start}-${schedule.end} (${schedule.position})`);
        }
        return schedules;
      } else {
        console.log('❌ Gemini 응답이 리스트 형식이 아닙니다');
        return [];
      }
      
    } catch (jsonError) {
      console.log(`❌ Gemini 응답 JSON 파싱 실패: ${jsonError}`);
      console.log(`응답 내용: ${cleanResponse}`);
      return [];
    }
    
  } catch (error) {
    console.error(`❌ Gemini API 호출 실패: ${error.message}`);
    return [];
  }
}

module.exports = { analyzeScheduleWithGemini }; 