import mongoose from "mongoose";

const connectDB = async() => {
    try{
        const MONGODB_URI = process.env.MONGODB_URI;

        if(!MONGODB_URI){
            throw new Error("MongoDB URI is not defined in environment variables");
        }

        await mongoose.connect(MONGODB_URI);
        console.log("Connected to MongoDB successfully");

    }catch(error){
        return console.error("Error connecting to MongoDB:", error);
    }
}

export { connectDB };