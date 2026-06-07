const router = require('express').Router();
const ctrl = require('../controllers/creditCardController');
const validate = require('../middleware/validate');
const schemas = require('../validators/creditCard');

router.get('/', ctrl.getAll);
router.get('/archived', ctrl.getArchived);
router.post('/', validate(schemas.create), ctrl.create);
router.put('/:id', validate(schemas.update), ctrl.update);
router.post('/:id/archive', ctrl.archive);
router.post('/:id/restore', ctrl.restore);
router.delete('/:id', ctrl.remove);

module.exports = router;
