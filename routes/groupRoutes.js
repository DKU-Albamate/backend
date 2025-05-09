const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const authMiddleware = require('../middlewares/auth');

// ✅ 그룹 생성
router.post('/', authMiddleware, groupController.createGroup);

// ✅ 초대 코드 재발급 (새 코드 생성)
router.post('/:groupId/invite-code', authMiddleware, groupController.regenerateInviteCode);

// ✅ 초대 코드 확인 (기존 코드 확인)
router.get('/:groupId/invite-code', authMiddleware, groupController.getInviteCode);

// ✅ 그룹 목록 조회 (본인이 가입한 그룹)
router.get('/', authMiddleware, groupController.getGroups);

// ✅ 그룹 정보 수정
router.put('/:groupId', authMiddleware, groupController.updateGroup);

// ✅ 그룹 삭제
router.delete('/:groupId', authMiddleware, groupController.deleteGroup);

// ✅ 초대 코드로 그룹 가입 (알바생용)
router.post('/join', authMiddleware, groupController.joinGroupByInviteCode);

module.exports = router;
