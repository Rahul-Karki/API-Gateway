import { Request, Response } from "express";
import { User } from "../models/User";
import { verifyGoogleToken } from "../providers/google";
import bcrypt from "bcrypt";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/generateToken";
import { AuthRequest } from "../middlewares/authMiddleware";
import hashToken from "../utils/hashToken";
import ResetToken from "../models/ResetToken";
import crypto from "crypto";
import { sendEmail } from "../utils/sendEmail";
import { forgotPasswordTemplate } from "../utils/emailTemplate";
import { logger , tracer , SpanStatusCode } from "../../observability/observability";
import { traceDbQuery } from "../../observability/middleware/dbTrackerMiddleware";
import { clearAuthCookies, clearCsrfCookie, setAuthCookies } from "../utils/cookieOptions";

const COOLDOWN_AFTER_RESET = 5 * 60 * 1000; // 5 min

const signUp = async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { name, email, password } = req.body;

   const span = tracer.startSpan('user.signup', {
    attributes: {
      'user.email': email?.toLowerCase(),
      'signup.method': 'local',
    }
  });

   logger.info({
    type: 'signup_attempt',
    email: email?.toLowerCase(),
    hasName: !!name,
  }, 'Signup attempt started');

  try {

    if (!name || !email || !password) {
      const missingFields = {
        name: !name,
        email: !email,
        password: !password
      };

       span.setAttributes({
        'signup.success': false,
        'error.type': 'validation',
        'missing_fields': Object.keys(missingFields).filter(k => missingFields[k as keyof typeof missingFields]).join(',')
      });

      logger.warn({
        type: 'signup_validation_failed',
        email: email?.toLowerCase(),
        missingFields
      }, 'Signup validation failed - missing required fields');

      return res.status(400).json({
        message: "Please provide name, email and password",
      });
    }

    const existingUser = await traceDbQuery('SELECT', 'users', () => User.findOne({ email }));

    if (existingUser) {
      span.setAttributes({
        'signup.success': false,
        'error.type': 'user_exists',
        'user.exists': true
      });

      logger.info({
        type: 'signup_user_exists',
        email: email.toLowerCase(),
      }, 'User already exists - signup rejected');

      return res.status(400).json({
        message: "User already exists with this email",
      });
    }

    const hashStartTime = Date.now();
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const hashDuration = Date.now() - hashStartTime;

    span.setAttributes({
      'password.hash_time_ms': hashDuration,
      'bcrypt_rounds': saltRounds
    });


    const user = new User({
      name,
      email,
      password: hashedPassword,
      authProvider: ["local"],
    });

    const savedUser = await traceDbQuery('INSERT', 'users', () => user.save());

    // generate access token and refresh token
    const userId = savedUser._id.toString();
    const tokenGenerationStart = Date.now();
    const accessToken = generateAccessToken(userId);
    const refreshToken = generateRefreshToken(userId);
    const tokenGenerationDuration = Date.now() - tokenGenerationStart;

    span.setAttributes({
      'token.generation_time_ms': tokenGenerationDuration
    });


    setAuthCookies(res, accessToken, refreshToken);

    const duration = Date.now() - startTime;

    span.setAttributes({
      'user.id': userId,
      'signup.success': true,
      'signup.duration_ms': duration,
      'user.auth_provider': 'local'
    });

    logger.info({
      type: 'signup_success',
      userId: userId,
      email: email.toLowerCase(),
      duration_ms: duration,
    }, `User registered successfully: ${email}`);

    return res.status(201).json({
      message: "User registered successfully",
    });
  } catch (error: any) {

    const duration = Date.now() - startTime;

    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message || 'Signup failed'
    });
    
    span.setAttributes({
      'error.type': error.name || 'UnknownError',
      'error.message': error.message,
      'signup.duration_ms': duration,
      'signup.success': false
    });

     logger.error({
      type: 'signup_error',
      error: error.message,
      stack: error.stack,
      email: req.body?.email?.toLowerCase(),
      duration_ms: duration,
    }, 'Error occurred while signing up');

    return res.status(500).json({
      message: "Error occurred while signing up",
    });
  }finally {
    span.end();
  }
};

const login = async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { email, password } = req.body;

  const span = tracer.startSpan('user.login', {
    attributes: {
      'user.email': email?.toLowerCase(),
      'login.method': 'local',
    }
  });

   logger.info({
    type: 'login_attempt',
    email: email?.toLowerCase(),
  }, 'Login attempt started');

  try {
    // 1. Validate input
    if (!email || !password) {
       const missingFields = {
        email: !email,
        password: !password
      };

      span.setAttributes({
        'login.success': false,
        'error.type': 'validation',
        'missing_fields': Object.keys(missingFields).filter(k => missingFields[k as keyof typeof missingFields]).join(',')
      });

      logger.warn({
        type: 'login_validation_failed',
        email: email?.toLowerCase(),
        missing: missingFields
      }, 'Login validation failed - missing email or password');
      
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    // 2. Find user
    const user = await traceDbQuery('SELECT', 'users', () => User.findOne({ email }).select("+password"));

    if (!user) {
      span.setAttributes({
        'login.success': false,
        'error.type': 'user_not_found'
      });

      logger.info({ type: 'login_failed', email, reason: 'user_not_found' }, 'Login failed - user not found');

      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    if (!user.password) {
      span.setAttributes({
        'login.success': false,
        'error.type': 'oauth_account',
        'auth_provider': user.authProvider?.join(',') || 'unknown'
      });

      logger.info({ type: 'login_failed', email, reason: 'password_not_set' }, 'Login failed - password not set because this account uses Google login ');

      return res.status(400).json({
        message: "This account uses Google login. Please continue with Google.",
      });
    }

    // 4. Compare password
    const passwordMatchStart = Date.now();
    const isMatch = await bcrypt.compare(password, user.password!);
    const passwordCheckDuration = Date.now() - passwordMatchStart;

    span.setAttributes({
      'password.check_time_ms': passwordCheckDuration
    });

    if (!isMatch) {
      span.setAttributes({
        'login.success': false,
        'error.type': 'invalid_password'
      });

      logger.warn({ type: 'login_failed', email, reason: 'invalid_password' }, 'Login failed - invalid password');

      return res.status(401).json({
        message: "Invalid  password",
      });
    }

    // 5. Generate tokens
    const tokenGenerationStart = Date.now();
    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());
    const tokenGenerationDuration = Date.now() - tokenGenerationStart;

    span.setAttributes({
      'token.generation_time_ms': tokenGenerationDuration
    });

    // 6. Set cookie
    setAuthCookies(res, accessToken, refreshToken);

    const duration = Date.now() - startTime;
    span.setAttributes({
      'user.id': user._id.toString(),
      'login.success': true,
      'login.duration_ms': duration,
      'user.auth_provider': user.authProvider?.join(',') || 'local'
    });

    logger.info({
      type: 'login_success',
      userId: user._id.toString(),
      email,
      duration_ms: Date.now() - startTime
    }, 'Login successful');

    // 7. Send response
    res.status(200).json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error : any) {
    const duration = Date.now() - startTime;

    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message || 'Login failed'
    });

    span.setAttributes({
      'error.type': error.name || 'UnknownError',
      'error.message': error.message,
      'login.duration_ms': duration,
      'login.success': false
    });

    logger.error({
      type: 'login_error',
      error: error.message,
      email: req.body?.email,
      duration_ms: Date.now() - startTime
    }, 'Login failed with  error');

    logger.error({ event: 'login', status: 'error', error, email: req.body?.email }, 'Login request failed');
    res.status(500).json({
      message: "Server error",
    });
  } finally {
    span.end();
  }
};

const googleLogin = async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { token } = req.body;

  const span = tracer.startSpan('user.google_login', {
    attributes: {
      'login.method': 'google',
    }
  });

   logger.info({
    type: 'google_login_attempt',
    hasToken: !!token,
  }, 'Google login attempt started');


  try {
    if (!token) {
      span.setAttributes({
        'login.success': false,
        'error.type': 'validation',
        'missing_fields': 'token'
      });
      
      logger.warn({
        type: 'google_login_validation_failed',
        reason: 'missing_token'
      }, 'Google login failed - missing token');
      
      return res.status(400).json({ message: "Google token is required" });
    }

    const tokenVerifyStart = Date.now();
    const payload = await verifyGoogleToken(token);
     const tokenVerifyDuration = Date.now() - tokenVerifyStart;

     span.setAttributes({
      'google.token_verify_time_ms': tokenVerifyDuration
    });


    if (!payload || !payload.email) {
      span.setAttributes({
        'login.success': false,
        'error.type': 'invalid_token',
        'has_payload': !!payload,
        'has_email': payload?.email ? true : false
      });

       logger.warn({
        type: 'google_login_failed',
        reason: 'invalid_token',
        tokenPayload: !!payload,
        hasEmail: payload?.email ? true : false
      }, 'Google login failed - invalid token or missing email');

      return res.status(400).json({ message: "Invalid Google token" });
    }

    const email = payload.email;
    const name = payload.name || email.split('@')[0]; // Fallback name
    const googleId = payload.sub;

     span.setAttributes({
      'user.email': email.toLowerCase(),
      'google.user_id': googleId,
      'user.name': name
    });

   logger.info({
      type: 'google_token_verified',
      email: email.toLowerCase(),
      googleId: googleId
    }, 'Google token verified successfully');

    // 4. Find or create user (with DB tracing)
    const dbStartTime = Date.now();
    
    let user = await traceDbQuery('SELECT', 'users', async () => {
      return await User.findOne({ email });
    });

    const isExistingUser = !!user;
    let isNewUser = false;
    let isLinkedAccount = false;

   if (user) {
      // 3. Link Google account if not linked
      if (!user.googleId) {
        const existingUser = user;
        existingUser.googleId = googleId;
        await traceDbQuery('UPDATE', 'users', async () => {
          return await existingUser.save();
        });
      }
    } else {
      // 4. Create new user
      user = await traceDbQuery('INSERT', 'users', async () => {
        return await User.create({
          email,
          name,
          googleId,
          authProvider: ["google"],
        });
      });
    }

    const dbDuration = Date.now() - dbStartTime;
    span.setAttributes({
      'db.operation_duration_ms': dbDuration,
      'user.is_existing': isExistingUser,
      'user.is_new': isNewUser,
      'user.account_linked': isLinkedAccount
    });

    // 5. Generate tokens
    const tokenGenStart = Date.now();
    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());
    const tokenGenDuration = Date.now() - tokenGenStart;
    
    span.setAttributes({
      'token.generation_time_ms': tokenGenDuration
    });

    // 6. Set cookies
    setAuthCookies(res, accessToken, refreshToken);

    // 7. Success - add final span attributes
    const duration = Date.now() - startTime;
    span.setAttributes({
      'user.id': user._id.toString(),
      'login.success': true,
      'login.duration_ms': duration,
      'login.method': 'google',
      'user.auth_provider': user.authProvider?.join(',') || 'google'
    });
    
    // Log success
    logger.info({
      type: 'google_login_success',
      userId: user._id.toString(),
      email: email.toLowerCase(),
      isNewUser: isNewUser,
      isLinkedAccount: isLinkedAccount,
      duration_ms: duration,
    }, `Google login successful: ${email} (${isNewUser ? 'new user' : isLinkedAccount ? 'linked account' : 'existing user'})`);

    // 8. Send response (don't send password or sensitive data)
    const userResponse = {
      id: user._id,
      email: user.email,
      name: user.name,
      authProvider: user.authProvider,
      googleId: user.googleId ? true : false, // Just indicate if linked, don't send the ID
    };

    return res.json({
      user: userResponse,
      message: "Google login successful",
    });
    
  } catch (error: any) {
    // Error handling with both span and logger
    const duration = Date.now() - startTime;
    const errorMessage = error?.message || 'Google login failed';
    const isConfigError = errorMessage.includes('GOOGLE_CLIENT_ID');
    const isTokenError =
      errorMessage.includes('Wrong number of segments') ||
      errorMessage.includes('No pem found for') ||
      errorMessage.includes('Invalid token signature') ||
      errorMessage.includes('invalid_grant') ||
      errorMessage.includes('audience') ||
      errorMessage.includes('Token used too late') ||
      errorMessage.includes('Token used too early');
    
    // Set span status to error
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: errorMessage
    });
    
    span.setAttributes({
      'error.type': error.name || 'UnknownError',
      'error.message': errorMessage,
      'login.duration_ms': duration,
      'login.success': false
    });
    
    // Log the full error
    logger.error({
      type: 'google_login_error',
      error: errorMessage,
      stack: error.stack,
      email: req.body?.email, // May not exist yet
      duration_ms: duration,
    }, 'Google login failed with server error');

    if (isConfigError) {
      return res.status(500).json({
        message: "Google login is misconfigured on the server. Check GOOGLE_CLIENT_ID.",
      });
    }

    if (isTokenError) {
      return res.status(400).json({
        message: "Google token verification failed. Please sign in again.",
      });
    }

    return res.status(500).json({ message: "Server error during Google login" });
  } finally {
    // Always end the span
    span.end();
  }
};

const getMe = async (req: AuthRequest, res: Response) => {
  const startTime = Date.now();
  
  // Start span for getMe operation
  const span = tracer.startSpan('user.get_me', {
    attributes: {
      'user.id': req.user?._id?.toString() || 'unknown'
    }
  });

  try {
    // Log the attempt
    logger.info({
      type: 'get_me_attempt',
      userId: req.user?._id?.toString(),
    }, 'Get current user attempt');

    // ✅ Now req.user has only _id, so we MUST fetch from database
    const userId = req.user?._id;
    
    if (!userId) {
      span.setAttributes({
        'get_me.success': false,
        'error.type': 'no_user_id'
      });
      
      logger.warn({
        type: 'get_me_failed',
        reason: 'no_user_id_in_request'
      }, 'Get me failed - user ID missing from request');
      
      return res.status(401).json({ message: "User not found in request" });
    }
    
    // ✅ Fetch FULL user data from database
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      span.setAttributes({
        'get_me.success': false,
        'error.type': 'user_not_found',
        'user.id': userId.toString()
      });
      
      logger.warn({
        type: 'get_me_failed',
        reason: 'user_not_found_in_db',
        userId: userId.toString()
      }, 'Get me failed - user not found in database');
      
      return res.status(404).json({ message: "User not found" });
    }
    
    // Success
    const duration = Date.now() - startTime;
    
    span.setAttributes({
      'get_me.success': true,
      'get_me.duration_ms': duration,
      'user.email': user.email,
      'user.auth_provider': user.authProvider?.join(',') || 'unknown'
    });
    
    logger.info({
      type: 'get_me_success',
      userId: user._id.toString(),
      email: user.email,
      duration_ms: duration,
    }, 'Get current user successful');
    
    // Send full user data
    res.status(200).json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        authProvider: user.authProvider,
        googleId: user.googleId ? true : false,
      },
    });
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message || 'Failed to get user'
    });
    
    span.setAttributes({
      'get_me.success': false,
      'error.type': error.name || 'UnknownError',
      'error.message': error.message,
      'get_me.duration_ms': duration
    });
    
    logger.error({
      type: 'get_me_error',
      error: error.message,
      stack: error.stack,
      userId: req.user?._id?.toString(),
      duration_ms: duration,
    }, 'Get current user failed with server error');
    
    res.status(500).json({
      message: "Server error occurred while fetching user data",
    });
  } finally {
    span.end();
  }
};

const forgotPassword = async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  // Start span for forgot password operation
  const span = tracer.startSpan('user.forgot_password', {
    attributes: {
      'operation': 'password_reset_request',
    }
  });

  try {
    const { email } = req.body;

    // Log the attempt
    logger.info({
      type: 'forgot_password_attempt',
      email: email?.toLowerCase(),
      hasEmail: !!email,
    }, 'Forgot password attempt started');

    logger.debug({ event: 'forgot_password', status: 'step', step: 'route_hit', email: email?.toLowerCase() }, 'Forgot password route hit');

    if (!email) {
      // Add span attributes for validation failure
      span.setAttributes({
        'forgot_password.success': false,
        'error.type': 'validation',
        'missing_fields': 'email'
      });
      
      // Log validation failure
      logger.warn({
        type: 'forgot_password_validation_failed',
        reason: 'missing_email'
      }, 'Forgot password failed - email missing');
      
      return res.status(400).json({
        message: "Please provide an email",
      });
    }

    // Add email to span
    span.setAttributes({
      'user.email': email.toLowerCase()
    });

    // Find user with DB tracing
    const user = await traceDbQuery('SELECT', 'users', async () => {
      return await User.findOne({ email });
    });

    if (!user) {
      // Add span attributes for user not found
      span.setAttributes({
        'forgot_password.success': false,
        'error.type': 'user_not_found',
        'user.exists': false
      });
      
      // Log user not found
      logger.info({
        type: 'forgot_password_user_not_found',
        email: email.toLowerCase()
      }, 'Forgot password failed - user not found');
      
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Add user ID to span
    span.setAttributes({
      'user.id': user._id.toString(),
      'user.exists': true
    });

    logger.debug({ event: 'forgot_password', status: 'step', step: 'user_found', userFound: !!user, email: email.toLowerCase() }, 'Forgot password user lookup complete');

    if (user.authProvider?.includes('google') && !user.password) {
      span.setAttributes({
        'forgot_password.success': false,
        'error.type': 'oauth_account',
        'auth_provider': user.authProvider?.join(',') || 'unknown'
      });

      logger.info({
        type: 'forgot_password_failed',
        email: email.toLowerCase(),
        reason: 'google_login_account'
      }, 'Forgot password rejected for Google login account');

      return res.status(400).json({
        message: 'This account uses Google login. Please continue with Google.',
      });
    }

    // Check password reset cooldown
    if (
      user.passwordResetAt &&
      Date.now() - new Date(user.passwordResetAt).getTime() <
        COOLDOWN_AFTER_RESET
    ) {
      // Add span attributes for rate limiting
      span.setAttributes({
        'forgot_password.success': false,
        'error.type': 'rate_limited',
        'cooldown_remaining_ms': COOLDOWN_AFTER_RESET - (Date.now() - new Date(user.passwordResetAt).getTime())
      });
      
      // Log rate limit hit
      logger.warn({
        type: 'forgot_password_rate_limited',
        userId: user._id.toString(),
        email: email.toLowerCase(),
        lastResetAt: user.passwordResetAt
      }, 'Forgot password rate limited - password recently updated');
      
      return res.status(429).json({
        message: "Password was recently updated. Try again later.",
      });
    }

    // Generate token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashed = hashToken(rawToken); // Make sure hashToken function is defined

    // Delete old tokens with DB tracing
    await traceDbQuery('DELETE', 'resettokens', async () => {
      return await ResetToken.deleteMany({ userId: user._id });
    });

    // Create new reset token with DB tracing
    const resetToken = await traceDbQuery('INSERT', 'resettokens', async () => {
      return await ResetToken.create({
        userId: user._id,
        token: hashed,
        expiresAt: Date.now() + 10 * 60 * 1000,
        lastSeenAt: Date.now(),
      });
    });

    await traceDbQuery('UPDATE', 'resettokens', async () => {
      return await resetToken.save();
    });

    const link = `https://api-gateway-snowy.vercel.app/reset-password?token=${rawToken}`;
    
    logger.debug({ event: 'forgot_password', status: 'step', step: 'token_generated', email: email.toLowerCase() }, 'Forgot password token generated');
    
    // Add token generation attributes to span
    span.setAttributes({
      'token.generated': true,
      'token.expires_minutes': 10
    });

    // Send email in background (don't wait)
    // Log email attempt but don't await
    logger.info({
      type: 'password_reset_email_attempt',
      userId: user._id.toString(),
      email: email.toLowerCase(),
    }, 'Sending password reset email in background');
    
    sendEmail({
      to: user.email,
      subject: "Password Reset Request",
      html: forgotPasswordTemplate(link),
    }).catch((err) => {
      logger.error({
        event: 'password_reset_email',
        status: 'error',
        error: err.message,
        stack: err.stack,
        userId: user._id.toString(),
        email: email.toLowerCase(),
      }, 'Failed to send password reset email');
    });

    logger.debug({ event: 'forgot_password', status: 'step', step: 'email_dispatched', email: email.toLowerCase() }, 'Forgot password email dispatched');

    // Success
    const duration = Date.now() - startTime;
    
    span.setAttributes({
      'forgot_password.success': true,
      'forgot_password.duration_ms': duration,
      'token.sent': true
    });
    
    // Log success
    logger.info({
      type: 'forgot_password_success',
      userId: user._id.toString(),
      email: email.toLowerCase(),
      duration_ms: duration,
    }, 'Password reset link sent successfully');

    res.status(200).json({
      message: "Password reset link sent to email",
    });

    logger.debug({ event: 'forgot_password', status: 'step', step: 'response_sent', email: email.toLowerCase() }, 'Forgot password response sent');
    
  } catch (error: any) {
    // Error handling with span and logger
    const duration = Date.now() - startTime;
    
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message || 'Forgot password failed'
    });
    
    span.setAttributes({
      'forgot_password.success': false,
      'error.type': error.name || 'UnknownError',
      'error.message': error.message,
      'forgot_password.duration_ms': duration
    });
    
    // Log the error
    logger.error({
      type: 'forgot_password_error',
      error: error.message,
      stack: error.stack,
      email: req.body?.email?.toLowerCase(),
      duration_ms: duration,
    }, 'Forgot password failed with server error');
    
    return res.status(500).json({
      message: "Server error",
    });
  } finally {
    span.end();
  }
};

const resetPassword = async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  // Start span for reset password operation
  const span = tracer.startSpan('user.reset_password', {
    attributes: {
      'operation': 'password_reset',
    }
  });

  try {
    const { token, password, confirmPassword } = req.body;

    // Log the attempt
    logger.info({
      type: 'reset_password_attempt',
      hasToken: !!token,
      hasPassword: !!password,
      hasConfirmPassword: !!confirmPassword,
    }, 'Reset password attempt started');

    // 1. Validate required fields
    if (!token || !password || !confirmPassword) {
      span.setAttributes({
        'reset_password.success': false,
        'error.type': 'validation',
        'missing_fields': `${!token ? 'token ' : ''}${!password ? 'password ' : ''}${!confirmPassword ? 'confirmPassword' : ''}`
      });
      
      logger.warn({
        type: 'reset_password_validation_failed',
        reason: 'missing_fields',
        missingToken: !token,
        missingPassword: !password,
        missingConfirmPassword: !confirmPassword,
      }, 'Reset password failed - missing required fields');
      
      return res.status(400).json({
        message: "Please provide all required fields",
      });
    }

    // 2. Check if passwords match
    if (password !== confirmPassword) {
      span.setAttributes({
        'reset_password.success': false,
        'error.type': 'password_mismatch',
      });
      
      logger.warn({
        type: 'reset_password_validation_failed',
        reason: 'password_mismatch',
      }, 'Reset password failed - passwords do not match');
      
      return res.status(400).json({
        message: "Passwords do not match",
      });
    }

    // 3. Hash the token for lookup
    const hashStart = Date.now();
    const hashed = hashToken(token);
    const hashDuration = Date.now() - hashStart;
    
    span.setAttributes({
      'token.hash_time_ms': hashDuration
    });

    // 4. Find valid reset token with DB tracing
    const record = await traceDbQuery('SELECT', 'resettokens', async () => {
      return await ResetToken.findOne({
        token: hashed,
        expiresAt: { $gt: Date.now() },
      });
    });

    if (!record) {
      span.setAttributes({
        'reset_password.success': false,
        'error.type': 'invalid_token',
        'token.valid': false,
        'token.expired': true
      });
      
      logger.warn({
        type: 'reset_password_failed',
        reason: 'invalid_or_expired_token',
        hashedTokenPrefix: hashed.substring(0, 8), // Log only prefix for security
      }, 'Reset password failed - invalid or expired token');
      
      return res.status(400).json({
        message: "Invalid or expired token",
      });
    }

    // Add token info to span
    span.setAttributes({
      'token.valid': true,
      'token.user_id': record.userId.toString(),
      'token.expires_at': new Date(record.expiresAt).toISOString(),
    });

    logger.info({
      type: 'reset_token_validated',
      userId: record.userId.toString(),
      tokenExpiresAt: record.expiresAt,
    }, 'Reset token validated successfully');

    // 5. Find user with DB tracing
    const user = await traceDbQuery('SELECT', 'users', async () => {
      return await User.findById(record.userId);
    });

    if (!user) {
      span.setAttributes({
        'reset_password.success': false,
        'error.type': 'user_not_found',
        'user.id': record.userId.toString(),
      });
      
      logger.warn({
        type: 'reset_password_failed',
        reason: 'user_not_found',
        userId: record.userId.toString(),
      }, 'Reset password failed - user not found');
      
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Add user info to span
    span.setAttributes({
      'user.id': user._id.toString(),
      'user.email': user.email,
    });

    // 6. Hash and update password
    const saltRounds = 10;
    const hashStartTime = Date.now();
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const hashDuration2 = Date.now() - hashStartTime;
    
    span.setAttributes({
      'password.hash_rounds': saltRounds,
      'password.hash_time_ms': hashDuration2,
    });

    // Update user password
    user.password = hashedPassword;
    user.passwordResetAt = new Date();
    
    await traceDbQuery('UPDATE', 'users', async () => {
      return await user.save();
    });

    // 7. Delete all tokens for user with DB tracing
    const deleteResult = await traceDbQuery('DELETE', 'resettokens', async () => {
      return await ResetToken.deleteMany({ userId: user._id });
    });

    span.setAttributes({
      'tokens_deleted_count': deleteResult.deletedCount || 0,
    });

    // Success
    const duration = Date.now() - startTime;
    
    span.setAttributes({
      'reset_password.success': true,
      'reset_password.duration_ms': duration,
    });
    
    logger.info({
      type: 'reset_password_success',
      userId: user._id.toString(),
      email: user.email,
      duration_ms: duration,
      tokensDeleted: deleteResult.deletedCount || 0,
    }, 'Password reset successful');
    
    res.status(200).json({
      message: "Password reset successful",
    });
    
  } catch (error: any) {
    // Error handling with span and logger
    const duration = Date.now() - startTime;
    
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message || 'Reset password failed'
    });
    
    span.setAttributes({
      'reset_password.success': false,
      'error.type': error.name || 'UnknownError',
      'error.message': error.message,
      'reset_password.duration_ms': duration,
    });
    
    logger.error({
      type: 'reset_password_error',
      error: error.message,
      stack: error.stack,
      duration_ms: duration,
    }, 'Reset password failed with server error');
    
    return res.status(500).json({
      message: "Server error",
    });
  } finally {
    span.end();
  }
};


const resendResetLink = async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  // Start span for resend reset link operation
  const span = tracer.startSpan('user.resend_reset_link', {
    attributes: {
      'operation': 'resend_password_reset_link',
    }
  });

  try {
    const { email } = req.body;

    // Log the attempt
    logger.info({
      type: 'resend_reset_link_attempt',
      email: email?.toLowerCase(),
      hasEmail: !!email,
    }, 'Resend reset link attempt started');

    // 1. Validate email
    if (!email) {
      span.setAttributes({
        'resend_link.success': false,
        'error.type': 'validation',
        'missing_fields': 'email'
      });
      
      logger.warn({
        type: 'resend_reset_link_validation_failed',
        reason: 'missing_email'
      }, 'Resend reset link failed - email missing');
      
      return res.status(400).json({
        message: "Please provide an email",
      });
    }

    // Add email to span
    span.setAttributes({
      'user.email': email.toLowerCase()
    });

    // 2. Find user with DB tracing
    const user = await traceDbQuery('SELECT', 'users', async () => {
      return await User.findOne({ email });
    });

    if (!user) {
      span.setAttributes({
        'resend_link.success': false,
        'error.type': 'user_not_found',
        'user.exists': false
      });
      
      logger.info({
        type: 'resend_reset_link_user_not_found',
        email: email.toLowerCase()
      }, 'Resend reset link failed - user not found');
      
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Add user ID to span
    span.setAttributes({
      'user.id': user._id.toString(),
      'user.exists': true
    });

    // 3. Find existing token with DB tracing
    const existingToken = await traceDbQuery('SELECT', 'resettokens', async () => {
      return await ResetToken.findOne({ userId: user._id });
    });

    if (!existingToken) {
      span.setAttributes({
        'resend_link.success': false,
        'error.type': 'no_reset_request',
        'token.exists': false
      });
      
      logger.warn({
        type: 'resend_reset_link_failed',
        reason: 'no_reset_request_found',
        userId: user._id.toString(),
        email: email.toLowerCase()
      }, 'Resend reset link failed - no reset request found');
      
      return res.status(400).json({
        message: "No reset request found, please initiate forgot password again",
      });
    }

    // Add token info to span
    span.setAttributes({
      'token.exists': true,
      'token.resend_count': existingToken.resendCount,
      'token.created_at': existingToken.createdAt?.toISOString(),
    });

    // 4. Check resend count limit
    if (existingToken.resendCount >= 3) {
      span.setAttributes({
        'resend_link.success': false,
        'error.type': 'max_resend_attempts',
        'token.resend_count': existingToken.resendCount,
        'max_allowed': 3
      });
      
      logger.warn({
        type: 'resend_reset_link_rate_limited',
        reason: 'max_resend_attempts',
        userId: user._id.toString(),
        email: email.toLowerCase(),
        resendCount: existingToken.resendCount
      }, 'Resend reset link failed - maximum resend attempts reached');
      
      return res.status(429).json({
        message: "Maximum resend attempts reached, please try again later",
      });
    }

    // 5. Check password reset cooldown
    if (
      user.passwordResetAt &&
      Date.now() - new Date(user.passwordResetAt).getTime() <
        COOLDOWN_AFTER_RESET
    ) {
      const cooldownRemaining = COOLDOWN_AFTER_RESET - (Date.now() - new Date(user.passwordResetAt).getTime());
      
      span.setAttributes({
        'resend_link.success': false,
        'error.type': 'password_recently_reset',
        'cooldown_remaining_ms': cooldownRemaining
      });
      
      logger.warn({
        type: 'resend_reset_link_rate_limited',
        reason: 'password_recently_updated',
        userId: user._id.toString(),
        email: email.toLowerCase(),
        lastResetAt: user.passwordResetAt,
        cooldownRemainingMs: cooldownRemaining
      }, 'Resend reset link failed - password recently updated');
      
      return res.status(429).json({
        message: "Password was recently updated. Try again later.",
      });
    }

    // 6. Check resend cooldown (60 seconds)
    const timeSinceLastSeen = Date.now() - existingToken.lastSeenAt.getTime();
    
    if (timeSinceLastSeen < 60000) {
      const waitTimeRemaining = 60000 - timeSinceLastSeen;
      
      span.setAttributes({
        'resend_link.success': false,
        'error.type': 'resend_cooldown',
        'cooldown_remaining_ms': waitTimeRemaining,
        'time_since_last_seen_ms': timeSinceLastSeen
      });
      
      logger.warn({
        type: 'resend_reset_link_rate_limited',
        reason: 'resend_cooldown',
        userId: user._id.toString(),
        email: email.toLowerCase(),
        waitTimeRemainingMs: waitTimeRemaining
      }, 'Resend reset link failed - wait before retry');
      
      return res.status(429).json({ message: "Wait before retry" });
    }

    // 7. Generate new token
    const tokenGenerationStart = Date.now();
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashed = hashToken(rawToken);
    const tokenGenerationDuration = Date.now() - tokenGenerationStart;
    
    span.setAttributes({
      'token.generation_time_ms': tokenGenerationDuration,
      'token.old_resend_count': existingToken.resendCount
    });

    // 8. Update existing token
    const updateStart = Date.now();
    existingToken.token = hashed;
    existingToken.expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    existingToken.resendCount += 1;
    existingToken.lastSeenAt = new Date(Date.now());
    
    await traceDbQuery('UPDATE', 'resettokens', async () => {
      return await existingToken.save();
    });
    
    const updateDuration = Date.now() - updateStart;
    
    span.setAttributes({
      'token.update_time_ms': updateDuration,
      'token.new_resend_count': existingToken.resendCount,
      'token.expires_minutes': 10
    });

    logger.info({
      type: 'reset_token_updated',
      userId: user._id.toString(),
      email: email.toLowerCase(),
      resendCount: existingToken.resendCount,
      oldResendCount: existingToken.resendCount - 1
    }, 'Reset token updated and resent');

    // 9. Generate reset link
    const link = `https://api-gateway-snowy.vercel.app/reset-password?token=${rawToken}`;
    
    // 10. Send email in background (don't wait)
    logger.info({
      type: 'password_reset_email_attempt',
      userId: user._id.toString(),
      email: email.toLowerCase(),
      resendCount: existingToken.resendCount
    }, 'Sending password reset email in background');
    
    sendEmail({
      to: "rahulkarki0608@gmail.com", // Note: Consider changing to user.email
      subject: "Password Reset Request",
      html: forgotPasswordTemplate(link),
    }).catch((err: any) => {
      logger.error({
        event: 'password_reset_email',
        status: 'error',
        error: err.message,
        stack: err.stack,
        userId: user._id.toString(),
        email: email.toLowerCase(),
      }, 'Failed to send password reset email');
    });

    // Success
    const duration = Date.now() - startTime;
    
    span.setAttributes({
      'resend_link.success': true,
      'resend_link.duration_ms': duration,
      'token.sent': true,
      'token.resend_count': existingToken.resendCount
    });
    
    logger.info({
      type: 'resend_reset_link_success',
      userId: user._id.toString(),
      email: email.toLowerCase(),
      duration_ms: duration,
      resendCount: existingToken.resendCount
    }, 'Password reset link resent successfully');

    res.status(200).json({
      message: "Password reset link resent to email",
    });
    
  } catch (error: any) {
    // Error handling with span and logger
    const duration = Date.now() - startTime;
    
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message || 'Resend reset link failed'
    });
    
    span.setAttributes({
      'resend_link.success': false,
      'error.type': error.name || 'UnknownError',
      'error.message': error.message,
      'resend_link.duration_ms': duration,
    });
    
    logger.error({
      type: 'resend_reset_link_error',
      error: error.message,
      stack: error.stack,
      email: req.body?.email?.toLowerCase(),
      duration_ms: duration,
    }, 'Resend reset link failed with server error');
    
    return res.status(500).json({
      message: "Server error",
    });
  } finally {
    span.end();
  }
};

const logout = async (req: Request, res: Response) => {
  clearAuthCookies(res);
  clearCsrfCookie(res);

  return res.status(200).json({
    message: "Logged out successfully",
  });
};

export {
  signUp,
  login,
  googleLogin,
  getMe,
  logout,
  forgotPassword,
  resetPassword,
  resendResetLink,
};
