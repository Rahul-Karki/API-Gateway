import express from 'express';
import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { createProduct, getAllProducts, updateProduct , deleteProduct } from '../controllers/productController';

const router = express.Router();    

router.use(authMiddleware);

router.get('/all', getAllProducts);
router.post('/create',createProduct);
router.put('/update/:productId', updateProduct);
router.delete('/delete/:productId', deleteProduct);

export default router;

