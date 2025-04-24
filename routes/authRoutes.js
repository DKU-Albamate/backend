const express = require('express');
const router = express.Router();
const { checkPassword } = require('../controllers/authController');

// POST /auth/check-password
router.post('/check-password', checkPassword);

module.exports = router;
