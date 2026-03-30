import { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"
import cookieParser from "cookie-parser" // make sure this is in app.ts

export interface AuthRequest extends Request {
  user?: { userId: string }
}

const cookieMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.accessToken  // ← read the accessToken cookie

    if (!token || typeof token !== 'string') {
      return res.status(401).json({ message: "Access token missing" })
    }

    const decoded = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET as string
    ) as { userId: string }

    req.user = decoded
    next()
  } catch (error: any) {
    console.error("Auth error:", error.message)
    return res.status(403).json({ message: "Invalid access token" })
  }
}

export { cookieMiddleware }