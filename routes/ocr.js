const router = require('express').Router();
const multer = require('multer')();
const { handleOcr, healthCheck } = require('../controllers/ocrController');

// OCR 스케줄 처리 (기본 - Gemini 사용 가능)
router.post('/schedule', multer.single('photo'), handleOcr);

// Gemini 전용 OCR 스케줄 처리
router.post('/schedule/gemini', multer.single('photo'), (req, res) => {
  req.body.use_gemini = 'true';
  return handleOcr(req, res);
});

// 기존 방식 OCR 스케줄 처리
router.post('/schedule/traditional', multer.single('photo'), (req, res) => {
  req.body.use_gemini = 'false';
  return handleOcr(req, res);
});

// OCR 서비스 상태 확인
router.get('/health', healthCheck);

module.exports = router;
