import { Request , Response } from "express";
import jwt from "jsonwebtoken";
import { generateAccessToken } from "../utils/generateToken";

const refreshAccessToken = async ( req: Request , res: Response) => {
    try{
        const refreshToken = req.cookies.refreshToken;

        if(!refreshToken){
            return res.status(401).json({
                message: "No refresh token provided",
            });
        }

        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET as string) as { userId: string };

        const newAccessToken = generateAccessToken(decoded.userId);

        return res.status(200).json({
            accessToken: newAccessToken,
        });
    }catch(error){
        return res.status(403).json({
            message: "Invalid refresh token",
        });
    }
}

export { refreshAccessToken };