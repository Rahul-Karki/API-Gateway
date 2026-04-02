import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { IUser } from "../models/User";
import { logger, tracer, SpanStatusCode } from "../../observability/observability";

// Create a type for authenticated user (only ID guaranteed)
export interface AuthUser {
  _id: string;
}

// Extend AuthRequest to use AuthUser instead of full IUser
export interface AuthRequest extends Request {
  user?: AuthUser;  // ✅ Only has _id, not full IUser
}

const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const span = tracer.startSpan('auth.middleware', {
    attributes: {
      'http.path': req.url,
      'http.method': req.method,
    }
  });
  
  const startTime = Date.now();

  try {
    const token = req.cookies?.accessToken;
    
    logger.info({
      type: 'auth_check',
      url: req.url,
      method: req.method,
      hasTokenCookie: !!token,
      tokenLength: token?.length || 0,
      cookiesPresent: Object.keys(req.cookies || {})
    }, 'Auth middleware - checking token');
    
    console.log("🔐 Auth Check:", {
      url: req.url,
      method: req.method,
      cookies: Object.keys(req.cookies || {}),
      hasTokenCookie: !!token,
      tokenLength: token?.length || 0
    });

    if (!token || typeof token !== 'string') {
      span.setAttributes({
        'auth.success': false,
        'auth.error_type': 'missing_token',
        'auth.duration_ms': Date.now() - startTime
      });
      
      logger.warn({
        type: 'auth_failed',
        reason: 'missing_token',
        url: req.url,
        method: req.method
      }, 'Auth blocked - no access token found');
      
      console.log("❌ BLOCKED: No accessToken cookie found");
      return res.status(401).json({ message: "Access token missing" });
    }

    const verifyStart = Date.now();
    let decoded: { userId: string };
    
    try {
      decoded = jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET as string
      ) as { userId: string };
      
      const verifyDuration = Date.now() - verifyStart;
      
      span.setAttributes({
        'auth.success': true,
        'user.id': decoded.userId,
        'auth.token_verify_time_ms': verifyDuration,
        'auth.duration_ms': Date.now() - startTime
      });
      
      logger.info({
        type: 'auth_success',
        userId: decoded.userId,
        url: req.url,
        method: req.method,
        token_verify_ms: verifyDuration
      }, 'Auth successful - token verified');
      
      console.log("✅ ALLOWED: Valid token for userId:", decoded.userId);
      
      // ✅ Fix: Set user with just the ID (matches AuthUser type)
      req.user = { _id: decoded.userId };
      next();
      
    } catch (jwtError: any) {
      span.setAttributes({
        'auth.success': false,
        'auth.error_type': jwtError.name || 'jwt_error',
        'auth.error_message': jwtError.message,
        'auth.duration_ms': Date.now() - startTime
      });
      
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: jwtError.message
      });
      
      logger.warn({
        type: 'auth_failed',
        reason: 'invalid_token',
        error: jwtError.message,
        error_name: jwtError.name,
        url: req.url,
        method: req.method
      }, 'Auth blocked - invalid token');
      
      console.error("❌ AUTH ERROR:", jwtError.message);
      return res.status(403).json({ message: "Invalid access token", error: jwtError.message });
    }
    
  } catch (error: any) {
    span.setAttributes({
      'auth.success': false,
      'auth.error_type': 'unexpected_error',
      'auth.error_message': error.message,
      'auth.duration_ms': Date.now() - startTime
    });
    
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message
    });
    
    logger.error({
      type: 'auth_error',
      error: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method
    }, 'Auth middleware - unexpected error');
    
    console.error("❌ AUTH UNEXPECTED ERROR:", error);
    return res.status(500).json({ message: "Internal server error during authentication" });
    
  } finally {
    span.end();
  }
};

export { authMiddleware };