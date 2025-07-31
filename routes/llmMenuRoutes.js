const express = require('express');
const router = express.Router();
const { generateLLMMenu } = require('../controllers/llmMenuController');

router.post('/llm-menu', generateLLMMenu);

module.exports = router;
