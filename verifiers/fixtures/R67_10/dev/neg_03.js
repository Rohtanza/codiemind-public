const express = require('express');
const { authMiddleware } = require('../../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

module.exports = router;
