import jwt from 'jsonwebtoken';
import { logger } from '../../observability/observability';

const log = logger.child({ component: 'auth.generate_token' });

function getSecret(name: string): string {
  const secret = process.env[name];
  if (!secret) {
    throw new Error(`${name} is not defined in environment variables`);
  }
  return secret;
}

const generateAccessToken = (userId: string) =>{
    try{
        const secret = getSecret('ACCESS_TOKEN_SECRET');
        return jwt.sign({ userId }, secret, { expiresIn: '15m' });
    }catch(err){
        log.error({ event: 'access_token_generate', status: 'error', error: err, userId }, "Error generating access token");
        throw new Error("Failed to generate access token");
    }               
}

const generateRefreshToken = (userId: string) => {
    try{
        const secret = getSecret('REFRESH_TOKEN_SECRET');
        return jwt.sign({ userId }, secret, { expiresIn: '7d' });
    }catch(err){
            log.error({ event: 'refresh_token_generate', status: 'error', error: err, userId }, "Error generating refresh token");
        throw new Error("Failed to generate refresh token");
    }
}

export { generateAccessToken, generateRefreshToken };