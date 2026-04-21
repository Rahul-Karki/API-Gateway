import jwt from 'jsonwebtoken';
import { logger } from '../../observability/observability';

const log = logger.child({ component: 'auth.generate_token' });

const generateAccessToken = (userId: string) =>{
    try{
        const token = process.env.ACCESS_TOKEN_SECRET!;

        if(!token){
            throw new Error("Access token secret is not defined in environment variables");
        }

        return jwt.sign({ userId }, token, { expiresIn: '15m' });

    }catch(err){
        log.error({ event: 'access_token_generate', status: 'error', error: err, userId }, "Error generating access token");
        throw new Error("Failed to generate access token");
    }               
}

const generateRefreshToken = (userId: string) => {
    try{
        const token = process.env.REFRESH_TOKEN_SECRET!;

        if(!token){
            throw new Error("Refresh token secret is not defined in environment variables");
        }

        return jwt.sign({ userId }, token, { expiresIn: '7d' });
    }catch(err){
            log.error({ event: 'refresh_token_generate', status: 'error', error: err, userId }, "Error generating refresh token");
        throw new Error("Failed to generate refresh token");
    }
}

export { generateAccessToken, generateRefreshToken };