const express = require('express');
const router = express.Router();
const { summarizeLLMContent } = require('../controllers/llmSummaryController');

router.post('/llmSummary', summarizeLLMContent);

module.exports = router;
