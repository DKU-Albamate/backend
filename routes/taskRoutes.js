const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { authenticateToken } = require('../middlewares/auth');

// 🔹 할 일 생성
router.post('/', authenticateToken, taskController.createTask);

// 🔹 할 일 목록 조회
router.get('/group/:groupId', authenticateToken, taskController.getTasks);

// 🔹 할 일 삭제
router.delete('/:taskId', authenticateToken, taskController.deleteTask);

// 🔹 할 일 완료 상태 토글
router.patch('/:taskId/toggle', authenticateToken, taskController.toggleTaskCompletion);

module.exports = router; 