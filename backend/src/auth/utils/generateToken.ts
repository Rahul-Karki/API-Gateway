import jwt from 'jsonwebtoken';

const generateAccessToken = (userId: string) =>{
    try{
        const token = process.env.ACCESS_TOKEN_SECRET!;

        if(!token){
            throw new Error("Access token secret is not defined in environment variables");
        }

        return jwt.sign({ userId }, token, { expiresIn: '15m' });

    }catch(err){
        console.error("Error generating access token:", err);
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
        console.error("Error generating refresh token:", err);
        throw new Error("Failed to generate refresh token");
    }
}

export { generateAccessToken, generateRefreshToken };