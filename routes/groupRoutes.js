const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const authMiddleware = require('../middlewares/auth');

// 인증된 사용자만 접근 가능하도록 미들웨어 적용
router.post('/', authMiddleware, groupController.createGroup);
router.post('/:groupId/invite-code', authMiddleware, groupController.regenerateInviteCode);
router.get('/', authMiddleware, groupController.getGroups);
router.put('/:groupId', authMiddleware, groupController.updateGroup);
router.delete('/:groupId', authMiddleware, groupController.deleteGroup);

// ✅ 초대코드 기반 자동 가입 (딥링크로 호출됨)
router.post('/join', authMiddleware, groupController.joinGroupByInviteCode);

module.exports = router;
