import { Request , Response } from "express";
import { Product } from "../models/Products";
import { logger, tracer, SpanStatusCode } from '../../observability/observability';
import { traceDbQuery } from '../../observability/middleware/dbTrackerMiddleware';

const createProduct = async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  // Start span for create product operation
  const span = tracer.startSpan('product.create', {
    attributes: {
      'operation': 'create_product',
      'http.method': req.method,
      'http.path': req.path,
    }
  });

  try {
    const { name, description, price, category } = req.body;

    // Log the attempt
    logger.info({
      type: 'create_product_attempt',
      hasName: !!name,
      hasPrice: !!price,
      hasCategory: !!category,
      hasDescription: !!description,
    }, 'Create product attempt started');

    // Validation
    if (!name || !price || !category) {
      const missingFields = {
        name: !name,
        price: !price,
        category: !category
      };
      
      span.setAttributes({
        'product.create.success': false,
        'error.type': 'validation',
        'missing_fields': Object.keys(missingFields).filter(k => missingFields[k as keyof typeof missingFields]).join(',')
      });
      
      logger.warn({
        type: 'create_product_validation_failed',
        missingFields: {
          name: !name,
          price: !price,
          category: !category
        }
      }, 'Create product failed - missing required fields');
      
      return res.status(400).json({
        message: "Missing required fields"
      });
    }

    // Add product attributes to span
    span.setAttributes({
      'product.name': name,
      'product.price': price,
      'product.category': category,
      'product.has_description': !!description,
    });

    // Create product object
    const product = new Product({
      name,
      description,
      price,
      category,
    });

    // Save product with DB tracing
    const savedProduct = await traceDbQuery('INSERT', 'products', async () => {
      return await product.save();
    });

    // Success
    const duration = Date.now() - startTime;
    
    span.setAttributes({
      'product.create.success': true,
      'product.id': savedProduct._id.toString(),
      'product.create.duration_ms': duration,
    });
    
    logger.info({
      type: 'create_product_success',
      productId: savedProduct._id.toString(),
      productName: name,
      price: price,
      category: category,
      duration_ms: duration,
    }, `Product created successfully: ${name}`);

    return res.status(201).json({
      message: "Product created successfully",
      product: savedProduct,
    });
    
  } catch (error: any) {
    // Error handling with span and logger
    const duration = Date.now() - startTime;
    
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message || 'Create product failed'
    });
    
    span.setAttributes({
      'product.create.success': false,
      'error.type': error.name || 'UnknownError',
      'error.message': error.message,
      'product.create.duration_ms': duration,
    });
    
    logger.error({
      type: 'create_product_error',
      error: error.message,
      stack: error.stack,
      productData: {
        name: req.body?.name,
        price: req.body?.price,
        category: req.body?.category,
      },
      duration_ms: duration,
    }, 'Error occurred while creating product');
    
    return res.status(500).json({
      message: "Error occurred while creating product",
    });
  } finally {
    span.end();
  }
};

const getAllProducts = async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  // Start span for get all products operation
  const span = tracer.startSpan('product.get_all', {
    attributes: {
      'operation': 'get_all_products',
      'http.method': req.method,
      'http.path': req.path,
    }
  });

  try {
    // Log the attempt
    logger.info({
      type: 'get_all_products_attempt',
    }, 'Get all products attempt started');

    // Fetch all products with DB tracing
    const products = await traceDbQuery('SELECT', 'products', async () => {
      return await Product.find({});
    });

    // Success
    const duration = Date.now() - startTime;
    const productCount = products.length;
    
    span.setAttributes({
      'product.get_all.success': true,
      'product.get_all.duration_ms': duration,
      'product.count': productCount,
    });
    
    logger.info({
      type: 'get_all_products_success',
      productCount: productCount,
      duration_ms: duration,
    }, `Products retrieved successfully - ${productCount} products found`);
    
    return res.status(200).json({
      message: "Products retrieved successfully",
      products,
    });
    
  } catch (error: any) {
    // Error handling with span and logger
    const duration = Date.now() - startTime;
    
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message || 'Get all products failed'
    });
    
    span.setAttributes({
      'product.get_all.success': false,
      'error.type': error.name || 'UnknownError',
      'error.message': error.message,
      'product.get_all.duration_ms': duration,
    });
    
    logger.error({
      type: 'get_all_products_error',
      error: error.message,
      stack: error.stack,
      duration_ms: duration,
    }, 'Error occurred while retrieving products');
    
    return res.status(500).json({
      message: "Error occurred while retrieving products",
    });
  } finally {
    span.end();
  }
};

const updateProduct = async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  // Start span for update product operation
  const span = tracer.startSpan('product.update', {
    attributes: {
      'operation': 'update_product',
      'http.method': req.method,
      'http.path': req.path,
      'product.id': req.params.productId,
    }
  });

  try {
    const { productId } = req.params;

    // Log the attempt
    logger.info({
      type: 'update_product_attempt',
      productId: productId,
      hasUpdateData: Object.keys(req.body).length > 0,
      updateFields: Object.keys(req.body),
    }, 'Update product attempt started');

    // Find product with DB tracing
    const product = await traceDbQuery('SELECT', 'products', async () => {
      return await Product.findById(productId);
    });

    if (!product) {
      span.setAttributes({
        'product.update.success': false,
        'error.type': 'product_not_found',
        'product.id': productId,
      });
      
      logger.warn({
        type: 'update_product_failed',
        reason: 'product_not_found',
        productId: productId,
      }, 'Update product failed - product not found');
      
      return res.status(404).json({
        message: "Product not found"
      });
    }

    // Log original product data
    logger.debug({
      type: 'update_product_original',
      productId: productId,
      originalData: {
        name: product.name,
        price: product.price,
        category: product.category,
        description: product.description,
      }
    }, 'Original product data before update');

    // Store old values for tracking
    const oldValues = {
      name: product.name,
      price: product.price,
      category: product.category,
      description: product.description,
    };

    // Only allow updating whitelisted fields (prevents mass assignment)
    const allowedFields = ['name', 'description', 'price', 'category'];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        (product as any)[field] = req.body[field];
      }
    }

    // Track which fields were updated
    const updatedFields = Object.keys(req.body);
    const changes: any = {};
    updatedFields.forEach(field => {
      if (oldValues[field as keyof typeof oldValues] !== product[field as keyof typeof product]) {
        changes[field] = {
          from: oldValues[field as keyof typeof oldValues],
          to: product[field as keyof typeof product]
        };
      }
    });

    // Add update attributes to span
    span.setAttributes({
      'product.update.fields_updated': updatedFields.join(','),
      'product.update.field_count': updatedFields.length,
      'product.name': product.name,
      'product.price': product.price,
      'product.category': product.category,
    });

    // Save updated product with DB tracing
    const savedProduct = await traceDbQuery('UPDATE', 'products', async () => {
      return await product.save();
    });

    // Success
    const duration = Date.now() - startTime;
    
    span.setAttributes({
      'product.update.success': true,
      'product.id': savedProduct._id.toString(),
      'product.update.duration_ms': duration,
    });
    
    logger.info({
      type: 'update_product_success',
      productId: savedProduct._id.toString(),
      productName: savedProduct.name,
      updatedFields: updatedFields,
      changes: changes,
      duration_ms: duration,
    }, `Product updated successfully: ${savedProduct.name}`);

    return res.status(200).json({
      message: "Product updated successfully",
      product: savedProduct,
    });
    
  } catch (error: any) {
    // Error handling with span and logger
    const duration = Date.now() - startTime;
    
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message || 'Update product failed'
    });
    
    span.setAttributes({
      'product.update.success': false,
      'error.type': error.name || 'UnknownError',
      'error.message': error.message,
      'product.update.duration_ms': duration,
    });
    
    logger.error({
      type: 'update_product_error',
      error: error.message,
      stack: error.stack,
      productId: req.params.productId,
      updateData: req.body,
      duration_ms: duration,
    }, 'Error occurred while updating product');
    
    return res.status(500).json({
      message: "Error occurred while updating product",
    });
  } finally {
    span.end();
  }
};

const deleteProduct = async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  // Start span for delete product operation
  const span = tracer.startSpan('product.delete', {
    attributes: {
      'operation': 'delete_product',
      'http.method': req.method,
      'http.path': req.path,
      'product.id': req.params.productId,
    }
  });

  try {
    const { productId } = req.params;

    // Log the attempt
    logger.info({
      type: 'delete_product_attempt',
      productId: productId,
    }, 'Delete product attempt started');

    // Find product with DB tracing
    const product = await traceDbQuery('SELECT', 'products', async () => {
      return await Product.findById(productId);
    });

    if (!product) {
      span.setAttributes({
        'product.delete.success': false,
        'error.type': 'product_not_found',
        'product.id': productId,
      });
      
      logger.warn({
        type: 'delete_product_failed',
        reason: 'product_not_found',
        productId: productId,
      }, 'Delete product failed - product not found');
      
      return res.status(404).json({
        message: "Product not found"
      });
    }

    // Log product details before deletion
    logger.info({
      type: 'delete_product_found',
      productId: product._id.toString(),
      productName: product.name,
      productPrice: product.price,
      productCategory: product.category,
    }, 'Product found, proceeding with deletion');

    // Add product details to span
    span.setAttributes({
      'product.name': product.name,
      'product.price': product.price,
      'product.category': product.category,
    });

    // Delete product with DB tracing
    const deleteResult = await traceDbQuery('DELETE', 'products', async () => {
      return await Product.findByIdAndDelete(productId);
    });

    // Success
    const duration = Date.now() - startTime;
    
    span.setAttributes({
      'product.delete.success': true,
      'product.id': productId,
      'product.delete.duration_ms': duration,
      'product.deleted': true,
    });
    
    logger.info({
      type: 'delete_product_success',
      productId: productId,
      productName: product.name,
      productPrice: product.price,
      productCategory: product.category,
      duration_ms: duration,
    }, `Product deleted successfully: ${product.name}`);

    return res.status(200).json({
      message: "Product deleted successfully",
    });
    
  } catch (error: any) {
    // Error handling with span and logger
    const duration = Date.now() - startTime;
    
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message || 'Delete product failed'
    });
    
    span.setAttributes({
      'product.delete.success': false,
      'error.type': error.name || 'UnknownError',
      'error.message': error.message,
      'product.delete.duration_ms': duration,
    });
    
    logger.error({
      type: 'delete_product_error',
      error: error.message,
      stack: error.stack,
      productId: req.params.productId,
      duration_ms: duration,
    }, 'Error occurred while deleting product');
    
    return res.status(500).json({
      message: "Error occurred while deleting product",
    });
  } finally {
    span.end();
  }
};

const getProductByID = async (req: Request, res: Response) => {
  const log = logger.child({ component: 'products.controller' });
  const startTime = Date.now();
  
  // Start span for get product by ID operation
  const span = tracer.startSpan('product.get_by_id', {
    attributes: {
      'operation': 'get_product_by_id',
      'http.method': req.method,
      'http.path': req.path,
      'product.id': req.params.productId,
    }
  });

  try {
    log.debug({ event: 'get_product_by_id', status: 'start', params: req.params }, 'getProductByID called');
    
    const { productId } = req.params;

    // Log the attempt
    log.info({
      event: 'get_product_by_id',
      status: 'attempt',
      productId: productId,
    }, 'Get product by ID attempt started');

    // Find product with DB tracing
    const product = await traceDbQuery('SELECT', 'products', async () => {
      return await Product.findById(productId);
    });

    if (!product) {
      span.setAttributes({
        'product.get_by_id.success': false,
        'error.type': 'product_not_found',
        'product.id': productId,
      });
      
      log.warn({
        event: 'get_product_by_id',
        status: 'not_found',
        reason: 'product_not_found',
        productId: productId,
      }, 'Get product by ID failed - product not found');
      
      return res.status(404).json({
        message: "Product not found"
      });
    }

    // Success
    const duration = Date.now() - startTime;
    
    span.setAttributes({
      'product.get_by_id.success': true,
      'product.id': product._id.toString(),
      'product.name': product.name,
      'product.price': product.price,
      'product.category': product.category,
      'product.get_by_id.duration_ms': duration,
    });
    
    log.info({
      event: 'get_product_by_id',
      status: 'success',
      productId: product._id.toString(),
      productName: product.name,
      productPrice: product.price,
      productCategory: product.category,
      duration_ms: duration,
    }, `Product retrieved successfully: ${product.name}`);
    
    return res.status(200).json({
      message: "Product retrieved successfully",
      product,
    });
    
  } catch (error: any) {
    // Error handling with span and logger
    const duration = Date.now() - startTime;
    
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message || 'Get product by ID failed'
    });
    
    span.setAttributes({
      'product.get_by_id.success': false,
      'error.type': error.name || 'UnknownError',
      'error.message': error.message,
      'product.get_by_id.duration_ms': duration,
    });
    
    logger.error({
      type: 'get_product_by_id_error',
      error: error.message,
      stack: error.stack,
      productId: req.params.productId,
      duration_ms: duration,
    }, 'Error occurred while retrieving product');
    
    return res.status(500).json({
      message: "Error occurred while retrieving product",
    });
  } finally {
    span.end();
  }
};

const updateSpecificField = async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  // Start span for update specific field operation
  const span = tracer.startSpan('product.update_specific_field', {
    attributes: {
      'operation': 'update_specific_field',
      'http.method': req.method,
      'http.path': req.path,
      'product.id': req.params.productId,
    }
  });

  try {
    const { productId } = req.params;
    const { fieldName, fieldValue } = req.body;

    // Log the attempt
    logger.info({
      type: 'update_specific_field_attempt',
      productId: productId,
      requestedField: fieldName,
      requestedValue: fieldValue,
      bodyFields: Object.keys(req.body),
    }, 'Update specific field attempt started');

    // Add to span
    span.setAttributes({
      'product.update.requested_field': fieldName,
      'product.update.requested_value_type': typeof fieldValue,
    });

    // Find product with DB tracing
    const product = await traceDbQuery('SELECT', 'products', async () => {
      return await Product.findById(productId);
    });

    if (!product) {
      span.setAttributes({
        'product.update_specific_field.success': false,
        'error.type': 'product_not_found',
        'product.id': productId,
      });
      
      logger.warn({
        type: 'update_specific_field_failed',
        reason: 'product_not_found',
        productId: productId,
      }, 'Update specific field failed - product not found');
      
      return res.status(404).json({
        message: "Product not found"
      });
    }

    // Store original values for tracking
    const originalValues: any = {};
    const allowedFields = ["name", "price", "description", "category"];
    
    // Track what will be updated
    const fieldsToUpdate: string[] = [];
    const updates: any = {};

    for (const key in req.body) {
      if (allowedFields.includes(key)) {
        fieldsToUpdate.push(key);
        originalValues[key] = product[key as keyof typeof product];
        updates[key] = {
          from: product[key as keyof typeof product],
          to: req.body[key]
        };
        (product as any)[key] = req.body[key];
      }
    }

    // Add update details to span
    span.setAttributes({
      'product.update.fields_updated': fieldsToUpdate.join(','),
      'product.update.field_count': fieldsToUpdate.length,
      'product.update.allowed_fields': allowedFields.join(','),
    });

    // Log what's being updated
    if (fieldsToUpdate.length > 0) {
      logger.info({
        type: 'update_specific_field_changes',
        productId: productId,
        updates: updates,
      }, `Updating fields: ${fieldsToUpdate.join(', ')}`);
    } else {
      logger.warn({
        type: 'update_specific_field_no_valid_fields',
        productId: productId,
        providedFields: Object.keys(req.body),
        allowedFields: allowedFields,
      }, 'No valid fields to update');
    }

    // Save updated product with DB tracing
    const savedProduct = await traceDbQuery('UPDATE', 'products', async () => {
      return await product.save();
    });

    // Success
    const duration = Date.now() - startTime;
    
    span.setAttributes({
      'product.update_specific_field.success': true,
      'product.id': savedProduct._id.toString(),
      'product.name': savedProduct.name,
      'product.update_specific_field.duration_ms': duration,
    });
    
    logger.info({
      type: 'update_specific_field_success',
      productId: savedProduct._id.toString(),
      productName: savedProduct.name,
      fieldsUpdated: fieldsToUpdate,
      duration_ms: duration,
    }, `Field(s) updated successfully for product: ${savedProduct.name}`);

    return res.status(200).json({
      message: "Field updated successfully",
      product: savedProduct,
    });
    
  } catch (error: any) {
    // Error handling with span and logger
    const duration = Date.now() - startTime;
    
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message || 'Update specific field failed'
    });
    
    span.setAttributes({
      'product.update_specific_field.success': false,
      'error.type': error.name || 'UnknownError',
      'error.message': error.message,
      'product.update_specific_field.duration_ms': duration,
    });
    
    logger.error({
      type: 'update_specific_field_error',
      error: error.message,
      stack: error.stack,
      productId: req.params.productId,
      updateData: req.body,
      duration_ms: duration,
    }, 'Error occurred while updating field');
    
    return res.status(500).json({
      message: "Error occurred while updating field",
    });
  } finally {
    span.end();
  }
};

export { getAllProducts , createProduct , updateProduct , deleteProduct , getProductByID , updateSpecificField };