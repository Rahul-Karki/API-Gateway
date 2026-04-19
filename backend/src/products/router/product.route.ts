import express from 'express';
import { Router } from 'express';
import { createProduct, getAllProducts, updateProduct , deleteProduct, getProductByID, updateSpecificField } from "../controller/productController";
import { dynamicNoStorePolicy, semiDynamicEdgeCachePolicy } from '../../middleware/cache-policy';
import { attachCacheVersionHeader, bumpCacheVersionOnWrite } from '../../middleware/cache-version';
import { validateRequest } from '../../middleware/validate-request';
import { createProductBodySchema, productIdParamsSchema, updateProductBodySchema } from '../schemas/product.schemas';


const router = express.Router();    

//router.use(cookieMiddleware);

router.use(attachCacheVersionHeader('products'));
router.use(bumpCacheVersionOnWrite('products'));

router.get('/all', semiDynamicEdgeCachePolicy, getAllProducts);
router.get('/:productId', semiDynamicEdgeCachePolicy, validateRequest({ params: productIdParamsSchema }), getProductByID);
router.post('/create', dynamicNoStorePolicy, validateRequest({ body: createProductBodySchema }), createProduct);
router.put('/update/:productId', dynamicNoStorePolicy, validateRequest({ params: productIdParamsSchema, body: updateProductBodySchema }), updateProduct);
router.delete('/delete/:productId', dynamicNoStorePolicy, validateRequest({ params: productIdParamsSchema }), deleteProduct);
router.patch('/update/:productId', dynamicNoStorePolicy, validateRequest({ params: productIdParamsSchema, body: updateProductBodySchema }), updateSpecificField);

export default router;

