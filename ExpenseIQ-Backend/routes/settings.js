const router = require('express').Router();
const ctrl = require('../controllers/settingsController');
const validate = require('../middleware/validate');
const schemas = require('../validators/settings');

router.get('/', ctrl.get);
router.put('/', validate(schemas.update), ctrl.update);
router.get('/db-stats', ctrl.dbStats);

module.exports = router;
