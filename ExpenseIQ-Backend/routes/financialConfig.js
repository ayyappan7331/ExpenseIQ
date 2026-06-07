const router = require('express').Router();
const ctrl = require('../controllers/financialConfigController');
const validate = require('../middleware/validate');
const schemas = require('../validators/financialConfig');

router.get('/', ctrl.get);
router.put('/', validate(schemas.update), ctrl.update);
router.patch('/', validate(schemas.update), ctrl.patch);

module.exports = router;
