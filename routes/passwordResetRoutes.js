const express = require('express');
const router = express.Router();
const { resetPassword } = require('../controllers/passwordResetController');

// 비밀번호 재설정
router.post('/reset-password', resetPassword);

module.exports = router; 