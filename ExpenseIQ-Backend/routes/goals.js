const router = require('express').Router();
const ctrl = require('../controllers/goalController');
const validate = require('../middleware/validate');
const schemas = require('../validators/goal');

router.get('/', ctrl.getAll);
router.post('/', validate(schemas.upsert), ctrl.upsert);
router.delete('/:id', ctrl.remove);

module.exports = router;
