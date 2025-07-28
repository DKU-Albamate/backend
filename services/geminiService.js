// services/geminiService.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Gemini API 설정 (기본값)
const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * CLOVA OCR 결과를 Gemini 2.5 Flash Lite로 분석하여 근무일정 추출 (재시도 로직 포함)
 * @param {Object} ocrData - CLOVA OCR JSON 결과
 * @param {string} targetName - 찾을 직원 이름
 * @param {number} year - 연도 (기본값: 2025)
 * @param {number} seed - Gemini seed 값 (기본값: 12345)
 * @param {number} temperature - Gemini temperature 값 (기본값: 0.1)
 * @param {number} topP - Gemini topP 값 (기본값: 0.3)
 * @param {number} maxRetries - 최대 재시도 횟수 (기본값: 3)
 * @returns {Array} 근무일정 리스트
 */
async function analyzeScheduleWithGemini(ocrData, targetName, year = 2025, seed = 1000, temperature = 0.1, topP = 0.3, maxRetries = 3) {
  let lastError = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🤖 Gemini 2.5 Flash Lite 분석 시작 (시도 ${attempt}/${maxRetries}) - 대상: ${targetName}`);
      
      // 재시도 시 파라미터 조정 (더 다양한 결과를 위해)
      let currentSeed = seed;
      let currentTemperature = temperature;
      let currentTopP = topP;
      
      if (attempt > 1) {
        // 재시도 시 파라미터를 약간 변경하여 다른 결과 시도
        currentSeed = seed + attempt * 1000; // 다른 seed 값
        currentTemperature = Math.min(temperature + (attempt * 0.05), 0.3); // 더 작은 증가
        currentTopP = Math.min(topP + (attempt * 0.02), 0.4); // 더 작은 증가
        
        console.log(`🔄 재시도 파라미터 조정 - seed: ${currentSeed}, temperature: ${currentTemperature}, topP: ${currentTopP}`);
      } else {
        console.log(`🔧 Gemini 파라미터 - seed: ${currentSeed}, temperature: ${currentTemperature}, topP: ${currentTopP}`);
      }
      
      // 동적으로 모델 생성 (파라미터 적용)
      const model = genai.getGenerativeModel({ 
        model: 'gemini-2.5-flash-lite',
        generationConfig: {
          temperature: currentTemperature,
          topP: currentTopP,
          seed: currentSeed
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
1. **표 구조 파악**:
   - 첫 번째 행(헤더)에서 요일과 날짜 정보를 찾으세요
   - "월", "화", "수", "목", "금", "토", "일" 또는 "07월 07일", "07월 08일" 등의 패턴을 찾으세요
   - 각 날짜 열의 인덱스를 정확히 기록하세요

2. **직원 검색**:
   - 모든 셀에서 "${targetName}" 텍스트를 찾으세요
   - 해당 셀이 속한 행(시간대)과 열(날짜)을 정확히 파악하세요
   - 셀 내용에서 시간 정보를 추출하세요 (예: "김지성 15:30")

3. **시간 정보 추출**:
   - 셀 내용에서 시작 시간과 종료 시간을 분리하세요
   - "이름 종료시간" 형식이면 시작 시간은 해당 행의 시간을 사용하세요
   - 종료 시간이 명시되어 있으면 그 값을 사용하세요

**날짜 형식 처리**:
- "MM월 DD일" → "YYYY-MM-DD" (예: "07월 07일" → "2025-07-07")
- "MM/DD" → "YYYY-MM-DD" (예: "07/07" → "2025-07-07")
- 연도가 없는 경우 ${year}년 사용

**시간 형식 처리**:
- "HH:MM" 형식으로 통일
- "HH시 MM분" → "HH:MM"
- "HH.MM" → "HH:MM"

**포지션 정보**:
- 셀이 속한 열의 헤더에서 포지션 정보를 찾으세요
- "포지션1", "포지션2", "포지션3", "선임/리콜" 등

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
- **${targetName}이 언급된 모든 셀을 반드시 포함하세요**
- **열 인덱스를 정확히 매칭하여 날짜와 시간을 연결하세요**
- **하나도 빠뜨리지 마세요**
- 찾을 수 없는 경우 빈 배열 []을 반환하세요
- **시간 정보가 명확하지 않으면 해당 일정을 제외하세요**
`;

      // Gemini API 호출
      console.log(`🤖 Gemini API 호출 시작...`);
      console.log(`   📝 프롬프트 길이: ${prompt.length} 문자`);
      console.log(`   🔧 사용된 파라미터: seed=${currentSeed}, temperature=${currentTemperature}, topP=${currentTopP}`);
      
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
          console.log(`✅ Gemini 분석 완료 (시도 ${attempt}/${maxRetries}): ${schedules.length}개 일정 발견`);
          
          // 일정이 0개인 경우 재시도 고려
          if (schedules.length === 0) {
            if (attempt < maxRetries) {
              console.log(`⚠️ 일정이 0개입니다. 재시도 예정... (${attempt + 1}/${maxRetries})`);
              lastError = new Error('No schedules found');
              continue;
            } else {
              console.log(`❌ 모든 시도 후에도 일정을 찾을 수 없습니다 (${maxRetries}회 시도)`);
              return [];
            }
          }
          
          // 일정이 1개 이상인 경우 성공
          for (const schedule of schedules) {
            console.log(`   - ${schedule.date} ${schedule.start}-${schedule.end} (${schedule.position})`);
          }
          return schedules;
        } else {
          console.log(`❌ Gemini 응답이 리스트 형식이 아닙니다 (시도 ${attempt}/${maxRetries})`);
          if (attempt < maxRetries) {
            console.log(`🔄 재시도 예정... (${attempt + 1}/${maxRetries})`);
            lastError = new Error('Invalid response format');
            continue;
          }
          return [];
        }
        
      } catch (jsonError) {
        console.log(`❌ Gemini 응답 JSON 파싱 실패 (시도 ${attempt}/${maxRetries}): ${jsonError}`);
        console.log(`응답 내용: ${cleanResponse}`);
        
        if (attempt < maxRetries) {
          console.log(`🔄 재시도 예정... (${attempt + 1}/${maxRetries})`);
          lastError = jsonError;
          continue;
        }
        return [];
      }
      
    } catch (error) {
      console.error(`❌ Gemini API 호출 실패 (시도 ${attempt}/${maxRetries}): ${error.message}`);
      lastError = error;
      
      if (attempt < maxRetries) {
        console.log(`🔄 재시도 예정... (${attempt + 1}/${maxRetries})`);
        // 재시도 전 잠시 대기 (점진적 백오프)
        const delay = Math.min(1000 * attempt, 5000); // 1초, 2초, 3초, 5초
        console.log(`⏳ ${delay}ms 대기 후 재시도...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    }
  }
  
  // 모든 재시도 실패
  console.error(`❌ 모든 재시도 실패 (${maxRetries}회 시도)`);
  if (lastError) {
    console.error(`마지막 오류: ${lastError.message}`);
  }
  return [];
}

module.exports = { analyzeScheduleWithGemini }; 