import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import authRouter from './auth/routers/auth.route';
import productRouter from './products/router/product.route';
import { connectDB } from './config/db';
import refreshRouter from './auth/routers/refresh.route';
import cookieParser from 'cookie-parser';

import { httpInstrumentation } from './observability/middleware/httpMiddleware';
import { errorHandler } from './observability/middleware/errorMiddlware';
import { logger } from './observability/observability';


const app = express();

app.use(httpInstrumentation);

app.use(express.json());
app.use(cookieParser());

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

app.get('/', (req, res) => {
    res.send("Welcome to the Authentication API");
});


connectDB();


// routes
app.use('/api/auth', authRouter);
app.use('/api/products', productRouter);
app.use('/api', refreshRouter);  

app.use(errorHandler);


