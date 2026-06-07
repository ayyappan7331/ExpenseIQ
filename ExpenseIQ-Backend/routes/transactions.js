const router = require('express').Router();
const ctrl = require('../controllers/transactionController');
const validate = require('../middleware/validate');
const schemas = require('../validators/transaction');

router.get('/', ctrl.getAll);
router.post('/', validate(schemas.create), ctrl.create);
router.post('/bulk', validate(schemas.bulkCreate), ctrl.bulkCreate);
router.put('/:id', validate(schemas.update), ctrl.update);
router.delete('/:id', ctrl.remove);
router.post('/bulk-delete', validate(schemas.bulkDelete), ctrl.bulkDelete);

module.exports = router;
