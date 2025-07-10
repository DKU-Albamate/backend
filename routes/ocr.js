const router = require('express').Router();
const multer = require('multer')();
const { handleOcr } = require('../controllers/ocrController');

router.post('/schedule', multer.single('photo'), handleOcr);
module.exports = router;
