const express = require('express');
const router = express.Router();
const { resetPassword } = require('../controllers/passwordResetController');

// 비밀번호 재설정
router.post('/', resetPassword);

module.exports = router; 