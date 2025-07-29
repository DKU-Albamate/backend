// utils/logger.js
const fs = require('fs');
const path = require('path');

// 1. 로그 저장 디렉토리 생성
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// 2. 공통 로그 함수
function writeLogToFile(logObj, filename = 'combined.log') {
  const logPath = path.join(logDir, filename);
  const logLine = JSON.stringify(logObj) + '\n';
  fs.appendFile(logPath, logLine, (err) => {
    if (err) console.error('📛 로그 저장 실패:', err.message);
  });
}

// 3. 에러 로깅 함수
function logError({
  errorType = 'UNKNOWN_ERROR',
  location = 'unknown',
  user_uid = 'unknown',
  display_name = 'unknown',
  statusCode = 500,
  message = '',
  extra = {}
}) {
  const timestamp = new Date().toISOString();

  const logEntry = {
    level: 'error',
    timestamp,
    errorType,
    location,
    user_uid,
    display_name,
    statusCode,
    message,
    extra
  };

  console.error(`❌ [${errorType}] ${message} @ ${location}`);
  writeLogToFile(logEntry, 'error.log');      // error 전용 로그
  writeLogToFile(logEntry, 'combined.log');   // 전체 통합 로그
}

// 4. 일반 정보 로깅 (선택)
function logInfo(message, extra = {}) {
  const logEntry = {
    level: 'info',
    timestamp: new Date().toISOString(),
    message,
    extra
  };
  console.log(`ℹ️ ${message}`);
  writeLogToFile(logEntry, 'combined.log');
}

// 5. 디버그 로깅 (선택)
function logDebug(message, extra = {}) {
  if (process.env.DEBUG === 'true') {
    const logEntry = {
      level: 'debug',
      timestamp: new Date().toISOString(),
      message,
      extra
    };
    console.log(`🐛 ${message}`);
    writeLogToFile(logEntry, 'debug.log');
    writeLogToFile(logEntry, 'combined.log');
  }
}

module.exports = { logError, logInfo, logDebug };
