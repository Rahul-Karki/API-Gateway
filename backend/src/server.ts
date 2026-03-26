import express from 'express';
import authRouter from './routers/auth.route';
import productRouter from './routers/product.route';
import { connectDB } from './config/db';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import refreshRouter from './routers/refresh.route';
import cookieParser from 'cookie-parser';

import dotenv from 'dotenv';
dotenv.config();

const app = express();


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

app.get('/validate', (req, res) => {            
    
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) return res.status(401).send();

    try {
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET as string) as { id: string };

        res.setHeader("X-User-Id", decoded.id);

        res.status(200).send();
    } catch {
        res.status(401).send();
    }

});

