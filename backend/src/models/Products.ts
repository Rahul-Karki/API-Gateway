import mongoose from "mongoose";
import { Document , Schema } from "mongoose";

export interface IProduct extends Document {
    name: string;
    description: string;
    price: number;
    category: string;
}

const productSchema = new Schema<IProduct>({
    name:{
        type: String,
        required: true,
    },
    description:{
        type: String,
        default: "",
    },
    price:{
        type: Number,
        required: true,
        default: 0,
    },
    category:{
        type: String,
        required: true,
    }
})

export const Product = mongoose.model<IProduct>("Product", productSchema);

