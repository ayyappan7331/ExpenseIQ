const router = require('express').Router();
const ctrl = require('../controllers/profileController');
const validate = require('../middleware/validate');
const schemas = require('../validators/profile');

router.get('/', ctrl.getAll);
router.post('/', validate(schemas.create), ctrl.create);
router.delete('/:id', ctrl.remove);

module.exports = router;
