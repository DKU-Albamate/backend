// routes/ocr.js
const router = require('express').Router();
const { uploadMiddleware, handleOcr } = require('../controllers/ocrController');

// photo 필드만 받는 미들웨어 → OCR 처리
router.post('/schedule', uploadMiddleware, handleOcr);

module.exports = router;

