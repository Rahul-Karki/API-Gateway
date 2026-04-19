
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { generateAccessToken, generateRefreshToken } from "../utils/generateToken";
import { logger, tracer, SpanStatusCode } from "../../observability/observability";
import { setAuthCookies } from "../utils/cookieOptions";

const refreshAccessToken = async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  // Start span for refresh token operation
  const span = tracer.startSpan('auth.refresh_access_token', {
    attributes: {
      'operation': 'refresh_access_token',
    }
  });

  try {
    const refreshToken = req.cookies.refreshToken;

    // Log the attempt
    logger.info({
      type: 'refresh_token_attempt',
      hasRefreshToken: !!refreshToken,
    }, 'Refresh access token attempt started');

    if (!refreshToken) {
      span.setAttributes({
        'refresh_token.success': false,
        'error.type': 'missing_token',
        'refresh_token.duration_ms': Date.now() - startTime
      });
      
      logger.warn({
        type: 'refresh_token_failed',
        reason: 'missing_token',
      }, 'Refresh token failed - no refresh token provided');
      
      return res.status(401).json({
        message: "No refresh token provided",
      });
    }

    // Add token info to span (only length, not the actual token)
    span.setAttributes({
      'refresh_token.length': refreshToken.length,
      'refresh_token.has_token': true
    });

    // Verify refresh token
    const verifyStart = Date.now();
    let decoded: { userId: string };
    
    try {
      decoded = jwt.verify(
        refreshToken, 
        process.env.REFRESH_TOKEN_SECRET as string
      ) as { userId: string };
      
      const verifyDuration = Date.now() - verifyStart;
      
      // Add success attributes to span
      span.setAttributes({
        'refresh_token.success': true,
        'user.id': decoded.userId,
        'refresh_token.verify_time_ms': verifyDuration,
        'refresh_token.duration_ms': Date.now() - startTime
      });
      
      // Log success
      logger.info({
        type: 'refresh_token_success',
        userId: decoded.userId,
        verify_time_ms: verifyDuration,
      }, 'Refresh token verified successfully');
      
    } catch (jwtError: any) {
      // Handle JWT verification errors
      span.setAttributes({
        'refresh_token.success': false,
        'error.type': jwtError.name || 'jwt_error',
        'error.message': jwtError.message,
        'refresh_token.duration_ms': Date.now() - startTime
      });
      
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: jwtError.message
      });
      
      logger.warn({
        type: 'refresh_token_failed',
        reason: 'invalid_token',
        error: jwtError.message,
        error_name: jwtError.name,
      }, 'Refresh token failed - invalid token');
      
      return res.status(403).json({
        message: "Invalid refresh token",
      });
    }

    // Rotate both tokens on refresh to keep the browser session cookie-only.
    const tokenGenStart = Date.now();
    const newAccessToken = generateAccessToken(decoded.userId);
    const newRefreshToken = generateRefreshToken(decoded.userId);
    const tokenGenDuration = Date.now() - tokenGenStart;
    
    span.setAttributes({
      'access_token.generation_time_ms': tokenGenDuration,
      'access_token.generated': true
    });

    setAuthCookies(res, newAccessToken, newRefreshToken);

    // Success - final response
    const duration = Date.now() - startTime;
    
    logger.info({
      type: 'access_token_refreshed',
      userId: decoded.userId,
      duration_ms: duration,
      token_gen_ms: tokenGenDuration,
    }, 'New access token generated successfully');

    return res.status(200).json({
      message: "Access token refreshed",
    });
    
  } catch (error: any) {
    // Error handling with span and logger
    const duration = Date.now() - startTime;
    
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message || 'Refresh token failed'
    });
    
    span.setAttributes({
      'refresh_token.success': false,
      'error.type': error.name || 'UnknownError',
      'error.message': error.message,
      'refresh_token.duration_ms': duration,
    });
    
    logger.error({
      type: 'refresh_token_error',
      error: error.message,
      stack: error.stack,
      duration_ms: duration,
    }, 'Refresh token failed with server error');
    
    return res.status(403).json({
      message: "Invalid refresh token",
    });
  } finally {
    span.end();
  }
};

export { refreshAccessToken };