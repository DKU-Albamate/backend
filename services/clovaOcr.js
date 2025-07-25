// services/clovaOcr.js
// ──────────────────────────────────────────────
// CLOVA OCR 호출 + 스케줄 파싱 유틸
// 사용: const { extractSchedule } = require('../services/clovaOcr');
//
// 반환 예시:
// [ { date: '2025-07-15', start: '09:00', end: '17:00', title: '포지션1' }, ... ]
// ──────────────────────────────────────────────
const axios      = require('axios');
const { v4: uuid } = require('uuid');

async function extractSchedule(imgBuf, targetName, year = 2025) {
  // 1. CLOVA 호출 -----------------------------------------------------------
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
    }
  );

  // 2. 표를 2-D 그리드로 변환 ----------------------------------------------
  const cells = data.images[0].tables[0].cells;
  const R = Math.max(...cells.map(c => c.rowIndex)) + 1;
  const C = Math.max(...cells.map(c => c.columnIndex)) + 1;
  const grid = Array.from({ length: R }, () => Array(C).fill(''));

  cells.forEach(c => {
    const txt = c.cellTextLines
      .flatMap(l => l.cellWords)
      .map(w => w.inferText)
      .join(' ')
      .trim();
    grid[c.rowIndex][c.columnIndex] = txt;
  });

  // 3. 헤더·범위 인덱스 찾기 --------------------------------------------------
  const dateRow      = grid.findIndex(r => r[0].startsWith('날짜'));
  const positionRow  = grid.findIndex(r => r[0].startsWith('포지션'));
  const firstTimeRow = grid.findIndex(r => /^\d{1,2}:\d{2}$/.test(r[0]));
  const lastTimeRow  = grid.findIndex(r => r[0].startsWith('총 인원')) - 1;

  // 4. 날짜 매핑 -------------------------------------------------------------
  const dateMap = {};
  let cur = null;
  grid[dateRow].forEach((cell, c) => {
    const m = cell.match(/(\d{1,2})\s*월\s*(\d{1,2})/);
    if (m) cur = `${year}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
    dateMap[c] = cur;
  });

  // 5. 스케줄 파싱 -----------------------------------------------------------
  const schedules = [];
  for (let r = firstTimeRow; r <= lastTimeRow; r++) {
    const start = grid[r][0]; // 행 헤더가 시작 시각
    for (let c = 1; c < C; c++) {
      const cell = grid[r][c];
      if (!cell.includes(targetName)) continue;

      // 종료 시각 추출 (없으면 +1h)
      let end = null;
      const m = cell.match(new RegExp(`${targetName}\\s*([\\d.:]+)`));
      if (m) {
        const raw = m[1];
        if (raw.includes(':')) end = raw;
        else if (raw.includes('.')) {
          const [h, frac] = raw.split('.');
          end = `${h.padStart(2, '0')}:${Math.round(parseFloat('0.' + frac) * 60)
            .toString()
            .padStart(2, '0')}`;
        } else {
          end = `${raw.padStart(2, '0')}:00`;
        }
      }
      if (!end) {
        const [hh, mm] = start.split(':').map(Number);
        end = `${(hh + 1).toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
      }

      schedules.push({
        date : dateMap[c],
        start: start,
        end  : end,
        title: grid[positionRow][c] || '근무',
      });
    }
  }
  return schedules;
}

module.exports = { extractSchedule };
