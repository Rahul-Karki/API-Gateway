import express from 'express';
import dotenv from 'dotenv';
import userRouter from './routers/user.route';
import productRouter from './routers/product.route';
import { connectDB } from './config/db';
import jwt from 'jsonwebtoken';
dotenv.config();

const app = express();


app.use(express.json());

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

app.get('/', (req, res) => {
    res.send("Welcome to the Authentication API");
});

connectDB();

// routes
app.use('/api/users', userRouter);
app.use('/api/products', productRouter);

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