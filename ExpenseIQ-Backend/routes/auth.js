const router = require('express').Router();
const ctrl = require('../controllers/authController');
const validate = require('../middleware/validate');
const schemas = require('../validators/auth');
const authMiddleware = require('../middleware/auth');

// Public routes
router.post('/register', validate(schemas.register), ctrl.register);
router.post('/login', validate(schemas.login), ctrl.login);

// Protected routes (require valid JWT)
router.get('/me', authMiddleware, ctrl.me);
router.put('/me', authMiddleware, ctrl.updateMe);

module.exports = router;
