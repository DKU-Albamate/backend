
const express = require('express');
const router = express.Router();
const { generateLLMNotice } = require('../controllers/llmNoticeController');

router.post('/llm-generate', generateLLMNotice);

module.exports = router;
