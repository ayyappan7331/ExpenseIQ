const router = require('express').Router();
const ctrl = require('../controllers/authController');
const validate = require('../middleware/validate');
const schemas = require('../validators/auth');
const authMiddleware = require('../middleware/auth');

// Public routes
router.post('/register', validate(schemas.register), ctrl.register);
router.post('/login', validate(schemas.login), ctrl.login);

// OTP routes (public — needed before user has a session)
router.post('/send-otp', validate(schemas.sendOtp), ctrl.sendOtp);
router.post('/verify-otp', validate(schemas.verifyOtp), ctrl.verifyOtp);
router.post('/reset-password', validate(schemas.resetPassword), ctrl.resetPassword);

// Protected routes (require valid JWT)
router.get('/me', authMiddleware, ctrl.me);
router.put('/me', authMiddleware, ctrl.updateMe);

module.exports = router;
