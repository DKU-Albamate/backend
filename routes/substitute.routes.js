const express = require('express');
const router = express.Router();
const substituteController = require('../controllers/substitute.controller');
const { validateCreateSubstituteRequest } = require('../validators/substitute.validator');
// const { authenticate } = require('../middlewares/auth'); // 인증 미들웨어 (필요 시 주석 해제)

// POST /api/substitute/requests: 새 대타 요청 생성
router.post(
    '/requests',
    // authenticate, // 💡 [선택] 로그인 사용자 확인 및 req.user.uid 주입
    validateCreateSubstituteRequest, // 요청 본문 유효성 검사
    substituteController.createSubstituteRequestController
);

module.exports = router;