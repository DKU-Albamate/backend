const express = require('express');
const router = express.Router();
const substituteController = require('../controllers/substitute.controller');
const { validateCreateSubstituteRequest } = require('../validators/substitute.validator');
// const { authenticate } = require('../middlewares/auth'); // 인증 미들웨어 (필요 시 주석 해제)

// POST /api/substitute/requests: 새 대타 요청 생성
router.post(
    '/requests',
    // authenticate, //  [선택] 로그인 사용자 확인 및 req.user.uid 주입
    validateCreateSubstituteRequest, // 요청 본문 유효성 검사
    substituteController.createSubstituteRequestController
);
//  GET /api/substitute/requests: 대타 요청 리스트 조회 (group_id로 필터링)
router.get(
    '/requests',
    // authenticate, //  [선택] 로그인 사용자 확인
    substituteController.getSubstituteRequestsController
);
//  PUT /api/substitute/requests/:request_id/accept: 대타 요청 수락 라우트
router.put(
    '/requests/:request_id/accept', 
    substituteController.acceptSubstituteRequestController // 이 컨트롤러를 실행합니다.
);
//  PUT /api/substitute/requests/:request_id/manage: 사장님의 최종 승인/거절
router.put(
    '/requests/:request_id/manage', 
    // authenticate, //  [필수] 관리자 인증 로직 필요
    substituteController.manageSubstituteRequestController
);
module.exports = router;