import mongoose from "mongoose";
import { logger } from "../observability/observability";

const log = logger.child({ component: 'config.db' });

const connectDB = async() => {
    try{
        const MONGODB_URI = process.env.MONGODB_URI;

        if(!MONGODB_URI){
            throw new Error("MongoDB URI is not defined in environment variables");
        }

        await mongoose.connect(MONGODB_URI);
        log.info({ event: 'db_connect', status: 'success' }, "Connected to MongoDB successfully");

    }catch(error){
        log.error({ event: 'db_connect', status: 'error', error }, "Error connecting to MongoDB");
        return;
    }
}

export { connectDB };