const express = require('express');
const router = express.Router();
const { deleteAccountController } = require('../controllers/deleteAccount.controller');
const { validateDeleteAccount } = require('../validators/deleteAccount.validator');

router.post('/', validateDeleteAccount, deleteAccountController);

module.exports = router;