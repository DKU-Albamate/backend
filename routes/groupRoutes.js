const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const authMiddleware = require('../middlewares/auth');

router.get('/:groupId/invite-code', authMiddleware, groupController.getInviteCode);

// ✅ [1] 그룹 생성 - 가장 먼저 배치 (라우팅 충돌 방지)
router.post('/', authMiddleware, groupController.createGroup);

// ✅ [2] 초대 코드 재발급
router.post('/:groupId/invite-code', authMiddleware, groupController.regenerateInviteCode);

// ✅ [3] 그룹 목록 조회
router.get('/', authMiddleware, groupController.getGroups);

// ✅ [4] 그룹 정보 수정
router.put('/:groupId', authMiddleware, groupController.updateGroup);

// ✅ [5] 그룹 삭제
router.delete('/:groupId', authMiddleware, groupController.deleteGroup);

// ✅ [6] 초대 코드로 그룹 가입
router.post('/join', authMiddleware, groupController.joinGroupByInviteCode);

module.exports = router;
