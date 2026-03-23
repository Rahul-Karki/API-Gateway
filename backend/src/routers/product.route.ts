import express from 'express';
import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { createProduct, getAllProducts, updateProduct , deleteProduct, getProductByID, updateSpecificField } from '../controllers/productController';

const router = express.Router();    

router.use(authMiddleware);

router.get('/all', getAllProducts);
router.get('/:productId',getProductByID);
router.post('/create',createProduct);
router.put('/update/:productId', updateProduct);
router.delete('/delete/:productId', deleteProduct);
router.patch('/update/:productId', updateSpecificField);

export default router;

