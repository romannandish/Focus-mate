const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getProfile,
} = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', authMiddleware, getProfile);

module.exports = router;