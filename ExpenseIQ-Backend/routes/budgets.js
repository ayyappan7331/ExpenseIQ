const router = require('express').Router();
const ctrl = require('../controllers/budgetController');
const validate = require('../middleware/validate');
const schemas = require('../validators/budget');

router.get('/', ctrl.getAll);
router.post('/', validate(schemas.upsert), ctrl.upsert);
router.delete('/:id', ctrl.remove);

module.exports = router;
