import { Response } from "express";
import { AuthRequest } from "../middlewares/authMiddleware";
import { Product } from "../models/Products";


const createProduct = async ( req: AuthRequest , res: Response) => {
    try{
        const userId = req.user?.userId;
        const { name, description, price, category } = req.body;

        if(!userId){
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

         if (!name || !price || !category) {        
            return res.status(400).json({
                message: "Missing required fields"
            });
        }

        const product = new Product({
            name,
            description,
            price,
            category,
        });

        await product.save();

        return res.status(201).json({
            message: "Product created successfully",
            product,
        });
    }catch(error){
        return res.status(500).json({
            message: "Error occurred while creating product",  
        })
    }
}

const getAllProducts = async ( req: AuthRequest , res: Response) => {
    try{
       const userId = req.user?.userId;

       if(!userId){
        return res.status(401).json({
            message: "Unauthorized"
        });
       }

       const products = await Product.find({});       
    
       return res.status(200).json({
        mesage: "Products retrieved successfully",
        products,
       });

    }catch(error){
        return res.status(500).json({
            message: "Error occurred while retrieving products",
        });     
    }
}

const updateProduct = async ( req: AuthRequest , res: Response) => {
    try{
        const userId = req.user?.userId;
        const { productId } = req.params;
        const { name, description, price, category } = req.body;      

        if(!userId){
            return res.status(401).json({
                message: "Unauthorized"
            });
        }   

        const product = await Product.findById(productId);

        if(!product){
            return res.status(404).json({
                message: "Product not found"
            });
        }   

        Object.assign(product, req.body); // only update fields that are provided in the request body   

        await product.save();

        return res.status(200).json({
            message: "Product updated successfully",
            product,
        });
        
    }catch(error){
        return res.status(500).json({
            message: "Error occurred while updating product",
        });
    }   
}

const deleteProduct = async ( req: AuthRequest , res: Response) => {
    try{
        const userId = req.user?.userId;
        const { productId } = req.params;

        if(!userId){
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        const product = await Product.findById(productId);

        if(!product){
            return res.status(404).json({
                message: "Product not found"
            });
        }   

        await Product.findByIdAndDelete(productId);

        return res.status(200).json({
            message: "Product deleted successfully",
        });     

    }catch(error){
        return res.status(500).json({
            message: "Error occurred while deleting product",
        });
    }
} 

const getProductByID = async(req : AuthRequest , res: Response) => {
    try{
        console.log("getProductByID called with:", req.params)
        const userId = req.user?.userId;
        const { productId } = req.params;

        if(!userId){
            return res.status(401).json({
                message: "Unauthorized"
            });
        }
        
        const product = await Product.findById(productId);

        if(!product){   
            return res.status(404).json({
                message: "Product not found"
            });
        }
        return res.status(200).json({
            message: "Product retrieved successfully",
            product,
        });
    }catch(error){
        return res.status(500).json({
            message: "Error occurred while retrieving product",
        });
    }   
}

const updateSpecificField = async ( req: AuthRequest , res: Response) => {
    try{
        const userId = req.user?.userId;
        const { productId } = req.params;
        const { fieldName, fieldValue } = req.body;

        if(!userId){
            return res.status(401).json({
                message: "Unauthorized"
            });
        }   

        const product = await Product.findById(productId);

        if(!product){   
            return res.status(404).json({
                message: "Product not found"
            });
        }

       const allowedFields = ["name", "price", "description","category"];

        for (const key in req.body) {
        if (allowedFields.includes(key)) {
            (product as any)[key] = req.body[key];
        }
        }

await product.save();

        return res.status(200).json({
            message: "Field updated successfully",
            product,
        });

    }catch(error){
        return res.status(500).json({
            message: "Error occurred while updating field",
        });
    }
}

export { getAllProducts , createProduct , updateProduct , deleteProduct , getProductByID , updateSpecificField };