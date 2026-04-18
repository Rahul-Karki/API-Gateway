import express from 'express';
import { Router } from 'express';
import { createProduct, getAllProducts, updateProduct , deleteProduct, getProductByID, updateSpecificField } from "../controller/productController";
import { dynamicNoStorePolicy, semiDynamicEdgeCachePolicy } from '../../middleware/cache-policy';


const router = express.Router();    

//router.use(cookieMiddleware);

router.get('/all', semiDynamicEdgeCachePolicy, getAllProducts);
router.get('/:productId', semiDynamicEdgeCachePolicy, getProductByID);
router.post('/create', dynamicNoStorePolicy, createProduct);
router.put('/update/:productId', dynamicNoStorePolicy, updateProduct);
router.delete('/delete/:productId', dynamicNoStorePolicy, deleteProduct);
router.patch('/update/:productId', dynamicNoStorePolicy, updateSpecificField);

export default router;

