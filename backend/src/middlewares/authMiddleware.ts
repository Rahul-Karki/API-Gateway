import { Request , Response , NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
    user?: { userId: string };
}

const authMiddleware = ( req: AuthRequest , res: Response , next: NextFunction) => {
    try{
        const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: "Access token missing"
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET as string
    ) as { userId: string };

    req.user = decoded;

    next();
    }catch(error){
        return res.status(403).json({
            message: "Invalid access token"
        });
    }
}

export { authMiddleware };