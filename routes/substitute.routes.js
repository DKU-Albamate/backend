const express = require('express');
const router = express.Router();
const substituteController = require('../controllers/substitute.controller');
const { validateCreateSubstituteRequest } = require('../validators/substitute.validator');
// const { authenticate } = require('../middlewares/auth'); // 인증 미들웨어 (필요 시 주석 해제)

//  개별 요청 상세 조회 (GET /api/substitute/requests/:request_id)
// 전체 요청 조회보다 위에 위치해야 URL 파라미터를 올바르게 인식합니다.
router.get(
    '/requests/:request_id', 
    // authenticate, 
    substituteController.getSubstituteRequestDetail
);
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
// DELETE /api/substitute/requests/:request_id
router.delete(
  '/requests/:requestId',
  //authenticate, // 사용자 인증 미들웨어
  substituteController.deleteSubstituteRequestController // 삭제 컨트롤러 함수
);
// --- 대타 요청 수정 라우트 (PUT) ---
router.put(
  '/requests/:requestId', // 경로 파라미터 이름: 'requestId'
  // authenticate 미들웨어는 제거됨
  requestsController.updateSubstituteRequestController 
);
module.exports = router;