const router = require('express').Router();
const ctrl = require('../controllers/subscriptionController');
const validate = require('../middleware/validate');
const schemas = require('../validators/subscription');

router.get('/', ctrl.getAll);
router.post('/', validate(schemas.create), ctrl.create);
router.put('/:id', validate(schemas.update), ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
