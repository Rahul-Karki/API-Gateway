import { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"
import cookieParser from "cookie-parser" // make sure this is in app.ts

export interface AuthRequest extends Request {
  user?: { userId: string }
}

const cookieMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.accessToken
    
    console.log("🔐 Auth Check:", {
      url: req.url,
      method: req.method,
      cookies: Object.keys(req.cookies || {}),
      hasTokenCookie: !!token,
      tokenLength: token?.length || 0
    })

    if (!token || typeof token !== 'string') {
      console.log("❌ BLOCKED: No accessToken cookie found")
      return res.status(401).json({ message: "Access token missing" })
    }

    const decoded = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET as string
    ) as { userId: string }

    console.log("✅ ALLOWED: Valid token for userId:", decoded.userId)
    req.user = decoded
    next()
  } catch (error: any) {
    console.error("❌ AUTH ERROR:", error.message)
    return res.status(403).json({ message: "Invalid access token", error: error.message })
  }
}

export { cookieMiddleware }