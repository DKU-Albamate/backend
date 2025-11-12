// services/geminiService.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Gemini API 설정 (기본값)
const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * CLOVA OCR 결과를 Gemini 2.5 Flash Lite로 분석하여 근무일정 추출 (재시도 로직 포함)
 * @param {Object} ocrData - CLOVA OCR JSON 결과
 * @param {string} targetName - 찾을 직원 이름
 * @param {number} year - 연도 (기본값: 2025)
 * @param {number} seed - Gemini seed 값 (기본값: 42)
 * @param {number} temperature - Gemini temperature 값 (기본값: 0.05)
 * @param {number} topP - Gemini topP 값 (기본값: 0.3)
 * @param {number} maxRetries - 최대 재시도 횟수 (기본값: 5)
 * @returns {Array} 근무일정 리스트
 */
async function analyzeScheduleWithGemini(ocrData, targetName, year = 2025, seed = 42, temperature = 0.05, topP = 0.3, maxRetries = 5, debug = false) {
  let lastError = null;
  // collect debug info optionally returned when debug=true
  let debugInfo = {
    ocrPreview: null,
    geminiRaw: null,
    geminiClean: null,
    attempts: [],
    finalError: null
  };
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
  try {
      console.log(`🤖 Gemini 2.5 Flash Lite 분석 시작 (시도 ${attempt}/${maxRetries}) - 대상: ${targetName}`);
      
      // 재시도 시 파라미터 조정 (더 다양한 결과를 위해)
      let currentSeed = seed;
      let currentTemperature = temperature;
      let currentTopP = topP;
      
      if (attempt > 1) {
        // 재시도 시 파라미터를 점진적으로 조정
        currentSeed = seed + attempt * 100; // 더 작은 seed 변화
        currentTemperature = Math.min(temperature + (attempt * 0.02), 0.15); // 더 보수적인 증가
        currentTopP = Math.min(topP + (attempt * 0.05), 0.5); // 점진적 증가
        
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
            
            // 7월 11일 특별 검사
            let hasJuly11 = false;
            for (const cell of cells) {
              const cellText = cell.cellTextLines
                ?.flatMap(ln => ln.cellWords || [])
                ?.map(w => w.inferText)
                ?.join(' ')
                ?.trim() || '';
              
              if (cellText.includes('11') || cellText.includes('7월') || cellText.includes('07월')) {
                console.log(`   🔍 7월 11일 관련 셀 발견: 행${cell.rowIndex}열${cell.columnIndex} - "${cellText}"`);
                hasJuly11 = true;
              }
            }
            if (!hasJuly11) {
              console.log(`   ⚠️ 7월 11일 관련 셀을 찾을 수 없습니다. OCR 인식을 확인해주세요.`);
            }
            
            // 시간 행 정보 추출 (시작 시간 확인용)
            const timeRows = [];
            for (const cell of cells) {
              const cellText = cell.cellTextLines
                ?.flatMap(ln => ln.cellWords || [])
                ?.map(w => w.inferText)
                ?.join(' ')
                ?.trim() || '';
              
              // 시간 패턴 찾기 (09:00, 10:00 등)
              if (/^\d{1,2}:\d{2}$/.test(cellText)) {
                timeRows.push(`행${cell.rowIndex}: ${cellText}`);
              }
            }
            console.log(`   ⏰ 시간 행 정보: ${timeRows.join(', ')}`);
          
          // 날짜 정보가 있는 셀들 찾기 (더 포괄적으로)
          const dateCells = [];
          for (const cell of cells) {
            const cellText = cell.cellTextLines
              ?.flatMap(ln => ln.cellWords || [])
              ?.map(w => w.inferText)
              ?.join(' ')
              ?.trim() || '';
            
            // 더 포괄적인 날짜 패턴 찾기
            if (cellText.includes('월') || cellText.includes('/') || cellText.includes('-') || 
                /\d+월\s*\d+일/.test(cellText) || /\d+\/\d+/.test(cellText) ||
                cellText.includes('11') || cellText.includes('7월') || cellText.includes('07월')) {
              dateCells.push(`행${cell.rowIndex}열${cell.columnIndex}: "${cellText}"`);
            }
          }
          
          console.log(`   📅 날짜 관련 셀들: ${dateCells.length}개`);
          if (dateCells.length > 0) {
            console.log(`   📅 날짜 셀 상세: ${dateCells.join(', ')}`);
          }
          
          // 대상 직원이 있는 셀들 찾기 (더 상세한 정보)
          const targetCells = [];
          for (const cell of cells) {
            const cellText = cell.cellTextLines
              ?.flatMap(ln => ln.cellWords || [])
              ?.map(w => w.inferText)
              ?.join(' ')
              ?.trim() || '';
            
            if (cellText.includes(targetName)) {
              targetCells.push(`행${cell.rowIndex}열${cell.columnIndex}: "${cellText}"`);
            }
          }
          
          console.log(`   👤 ${targetName} 관련 셀들: ${targetCells.length}개`);
          if (targetCells.length > 0) {
            console.log(`   👤 직원 셀 상세: ${targetCells.join(', ')}`);
          }
          // Fill debug OCR preview
          debugInfo.ocrPreview = {
            tablesCount: ocrData.images[0].tables?.length || 0,
            sampleDateCells: dateCells.slice(0, 10),
            sampleTargetCells: targetCells.slice(0, 10),
            timeRows: timeRows || []
          };
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
당신은 근무일정표 분석 전문가입니다. 정확하고 일관된 결과를 제공하는 것이 최우선입니다.

**분석 대상 직원**: ${targetName}
**기준 연도**: ${year}년

**CLOVA OCR 결과**:
${JSON.stringify(ocrData, null, 2)}

**📋 분석 프로세스 (순서대로 엄격히 따르세요)**:

1. **📅 날짜 헤더 분석**:
   - 첫 번째 행(헤더)에서 날짜 정보를 찾으세요
   - 다양한 패턴을 모두 확인하세요:
     * "07월 07일", "7월 7일", "07/07", "7/7"
     * "07월 08일", "7월 8일", "07/08", "7/8"  
     * "07월 11일", "7월 11일", "07/11", "7/11"
     * "월 07/07", "화 07/08", "금 07/11" 등
   - 각 날짜 열의 columnIndex를 정확히 기록하세요

2. **⏰ 시간 행 분석**:
   - 첫 번째 열에서 시간 정보를 찾으세요 (09:00, 10:00 등)
   - 각 시간 행의 rowIndex를 정확히 기록하세요

3. **👤 직원 검색**:
   - 모든 셀에서 "${targetName}" 텍스트를 정확히 찾으세요
   - 해당 셀의 rowIndex(시간)와 columnIndex(날짜)를 기록하세요

4. **🕐 시간 정보 추출**:
   - **시작 시간**: 반드시 셀이 위치한 행의 시간을 사용하세요 (rowIndex 기준)
   - **종료 시간**: 셀 내용에서 추출하세요 (예: "김지성 15:30" → 15:30)
   - **포지션**: 셀이 속한 열의 헤더에서 추출하세요
   
   **⚠️ 매우 중요한 시간 추출 규칙**:
   - 셀 내용이 "김지성 15:30"이면 → 시작: 행의 시간, 종료: 15:30
   - 절대 셀 내용의 시간을 시작 시간으로 사용하지 마세요
   - 시작 시간은 항상 해당 셀이 위치한 행의 시간입니다

**📝 데이터 변환 규칙**:
- 날짜 변환 (모든 형식 지원):
  * "07월 07일" → "2025-07-07"
  * "7월 7일" → "2025-07-07"  
  * "07/07" → "2025-07-07"
  * "7/7" → "2025-07-07"
  * "07월 11일" → "2025-07-11"
  * "7월 11일" → "2025-07-11"
  * "07/11" → "2025-07-11"
  * "7/11" → "2025-07-11"
- 시간: "HH:MM" 형식으로 통일
- 포지션: 열 헤더의 텍스트 그대로 사용

**🎯 반환 형식** (JSON 배열만):
[
  {
    "name": "${targetName}",
    "position": "포지션명",
    "date": "YYYY-MM-DD",
    "start": "HH:MM",
    "end": "HH:MM"
  }
]

**📋 구체적인 예시**:
- 09:00 행의 포지션1 열에 "김지성 15:30"이 있으면:
  {
    "name": "김지성",
    "position": "포지션1",
    "date": "2025-07-07",
    "start": "09:00",  ← 행의 시간
    "end": "15:30"     ← 셀 내용의 시간
  }

- 09:00 행의 포지션2 열에 "김지성 15:30"이 있으면:
  {
    "name": "김지성", 
    "position": "포지션2",
    "date": "2025-07-08",
    "start": "09:00",  ← 행의 시간
    "end": "15:30"     ← 셀 내용의 시간
  }

- 09:00 행의 포지션3 열에 "김지성 15:30"이 있으면:
  {
    "name": "김지성",
    "position": "포지션3", 
    "date": "2025-07-11",
    "start": "09:00",  ← 행의 시간
    "end": "15:30"     ← 셀 내용의 시간
  }

**⚠️ 엄격한 규칙**:
1. JSON 형식만 반환하세요 (설명 없음)
2. ${targetName}이 포함된 모든 셀을 반드시 포함하세요
3. 시작 시간은 반드시 행의 시간을 사용하세요
4. 종료 시간은 셀 내용의 시간을 사용하세요
5. 시간 정보가 불분명하면 해당 일정을 제외하세요
6. 찾을 수 없으면 빈 배열 []을 반환하세요
7. **날짜 형식이 다르더라도 같은 날짜면 모두 포함하세요**

**✅ 검증 체크리스트**:
- [ ] 모든 ${targetName} 셀이 포함되었는가?
- [ ] 시작 시간이 행 시간과 일치하는가? (09:00 행이면 시작: 09:00)
- [ ] 종료 시간이 셀 내용과 일치하는가? ("김지성 15:30"이면 종료: 15:30)
- [ ] 날짜 형식이 YYYY-MM-DD인가?
- [ ] 시간 형식이 HH:MM인가?
- [ ] 7월 7일, 7월 8일, 7월 11일이 모두 포함되었는가?
- [ ] 날짜 변환이 정확한가? (07/11 → 2025-07-11)
- [ ] 시작 시간이 15:30~15:30처럼 잘못되지 않았는가?
- [ ] 모든 일정이 09:00~15:30 형식으로 올바르게 추출되었는가?
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
      // store raw gemini response for debug
      debugInfo.geminiRaw = responseText;
    
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
      debugInfo.geminiClean = cleanResponse;
    
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
              debugInfo.attempts.push({ attempt, seed: currentSeed, temperature: currentTemperature, topP: currentTopP, found: 0 });
              continue;
            } else {
              console.log(`❌ 모든 시도 후에도 일정을 찾을 수 없습니다 (${maxRetries}회 시도)`);
              if (debug) return { schedules: [], debug: debugInfo };
              return [];
            }
          }

          // 일정이 1개 이상인 경우 성공
        for (const schedule of schedules) {
          console.log(`   - ${schedule.date} ${schedule.start}-${schedule.end} (${schedule.position})`);
        }
        debugInfo.attempts.push({ attempt, seed: currentSeed, temperature: currentTemperature, topP: currentTopP, found: schedules.length });
        if (debug) return { schedules, debug: debugInfo };
        return schedules;
      } else {
          console.log(`❌ Gemini 응답이 리스트 형식이 아닙니다 (시도 ${attempt}/${maxRetries})`);
          if (attempt < maxRetries) {
            console.log(`🔄 재시도 예정... (${attempt + 1}/${maxRetries})`);
            lastError = new Error('Invalid response format');
            debugInfo.attempts.push({ attempt, seed: currentSeed, temperature: currentTemperature, topP: currentTopP, parseError: 'Invalid response format' });
            continue;
          }
        if (debug) return { schedules: [], debug: debugInfo };
        return [];
      }

    } catch (jsonError) {
        console.log(`❌ Gemini 응답 JSON 파싱 실패 (시도 ${attempt}/${maxRetries}): ${jsonError}`);
      console.log(`응답 내용: ${cleanResponse}`);
      debugInfo.attempts.push({ attempt, seed: currentSeed, temperature: currentTemperature, topP: currentTopP, parseError: jsonError.message });

        if (attempt < maxRetries) {
          console.log(`🔄 재시도 예정... (${attempt + 1}/${maxRetries})`);
          lastError = jsonError;
          continue;
        }
      if (debug) return { schedules: [], debug: debugInfo };
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
    debugInfo.finalError = lastError.message;
  }
  if (debug) return { schedules: [], debug: debugInfo };
  return [];
}

module.exports = { analyzeScheduleWithGemini }; 