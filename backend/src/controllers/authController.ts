import { Request, Response } from "express";
import { User } from "../models/User";
import { verifyGoogleToken } from "../utils/google";
import bcrypt from "bcrypt";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/generateToken";
import { AuthRequest } from "../middlewares/authMiddleware";
import hashToken from "../utils/hashToken";
import ResetToken from "../models/ResetToken";
import crypto from "crypto"
import {sendEmail} from "../utils/sendEmail"

const COOLDOWN_AFTER_RESET = 5 * 60 * 1000; // 5 min

const signUp = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Please provide name, email and password",
      });
    }

    const check = await User.findOne({ email });

    if (check) {
      return res.status(400).json({
        message: "User already exists with this email",
      });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      authProvider: ["local"],
    });

    await user.save();

    // generate access token and refresh token

    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
    });

    return res.status(201).json({
      message: "User registered successfully",
      accessToken,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error occurred while signing up",
    });
  }
};

const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // 1. Validate input
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    // 2. Find user
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

     if (!user.password) {
      return res.status(400).json({
        message: "This account uses Google login. Please continue with Google.",
      });
    }


    // 4. Compare password
    const isMatch = await bcrypt.compare(password, user.password!);

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // 5. Generate tokens
    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    // 6. Set cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
    });

    // 7. Send response
    res.status(200).json({
      accessToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
    });

  } catch (error) {
    console.error(error); // 👈 always log errors
    res.status(500).json({
      message: "Server error",
    });
  }
};


const googleLogin = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    const payload = await verifyGoogleToken(token);

    if (!payload || !payload.email) {
      return res.status(400).json({ message: "Invalid Google token" });
    }

    // 🔍 Find or create user
    let user = await User.findOne({ email: payload.email });

    const email = payload.email;
    const name = payload.name;
    const googleId = payload.sub;
  
    if (user) {
      // 3. Link Google account if not linked
      if (!user.googleId) {
        user.googleId = googleId;
        await user.save();
      }
    } else {
      // 4. Create new user
      user = await User.create({
        email,
        name,
        googleId,
        authProvider: ["google"],
      });
    }

    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });

    return res.json({
      user,
      message: "Google login successful",
      accessToken,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
}

const getMe = async(req : AuthRequest , res: Response) => {
  try{
    // req.user is set by your authMiddleware
    res.status(200).json({
      user: req.user,
    });
  }catch(err){
    res.status(500).json({
        message: "Server error"
      } 
    )
  }
}

const forgotPassword = async (req: Request, res: Response) => {

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Please provide an email",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }


    if (
      user.passwordResetAt &&
      Date.now() - new Date(user.passwordResetAt).getTime() < COOLDOWN_AFTER_RESET
    ) {
      return res.status(429).json({
        message: "Password was recently updated. Try again later.",
      });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashed = hashToken(rawToken);

    await ResetToken.deleteMany({ userId: user._id }); // remove old tokens

    const resetToken = await ResetToken.create({
      userId: user._id,
      token: hashed,
      expiresAt: Date.now() + 10 * 60 * 1000,
      lastSeenAt: Date.now(),
    });

    await resetToken.save();

    const link = `http://localhost:5173/reset-password?token=${rawToken}`;

    await sendEmail(user.email, link);

    res.status(200).json({
      message: "Password reset link sent to email",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
    });
  }
}

const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password, confirmPassword } = req.body;

    if (!token || !password || !confirmPassword) {
      return res.status(400).json({
        message: "Please provide all required fields",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        message: "Passwords do not match",
      });
    }


    const hashed = hashToken(token);

    const record = await ResetToken.findOne({
      token: hashed,
      expiresAt: { $gt: Date.now() },
    });

    if (!record) {
      return res.status(400).json({
        message: "Invalid or expired token",
      });
    }

    const user = await User.findById(record.userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const saltRounds = 10;

    user.password = await bcrypt.hash(password, saltRounds);
    user.passwordResetAt = new Date();
    await user.save();

    await ResetToken.deleteMany({ userId: user._id }); // remove all tokens for user

    res.status(200).json({
      message: "Password reset successful",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
    });
  }
};

const resendResetLink = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Please provide an email",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const existingToken = await ResetToken.findOne({ userId: user._id });

    if (!existingToken) {
      return res.status(400).json({
        message: "No reset request found, please initiate forgot password again",
      });
    }

    if (existingToken.resendCount >= 3) {
      return res.status(429).json({
        message: "Maximum resend attempts reached, please try again later",
      });
    }

    if (
      user.passwordResetAt &&
      Date.now() - new Date(user.passwordResetAt).getTime() < COOLDOWN_AFTER_RESET
    ) {
      return res.status(429).json({
        message: "Password was recently updated. Try again later.",
      });
    }

    if (Date.now() - existingToken.lastSeenAt.getTime() < 60000) {
      return res.status(429).json({ message: "Wait before retry" });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashed = hashToken(rawToken);

    existingToken.token = hashed;
    existingToken.expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    existingToken.resendCount += 1;
    existingToken.lastSeenAt = new Date(Date.now());

    await existingToken.save();

    const link = `http://localhost:5173/reset-password?token=${rawToken}`;
    await sendEmail(user.email, link);

    res.status(200).json({
      message: "Password reset link resent to email",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
    });
  }
}


export { signUp, login , googleLogin , getMe , forgotPassword , resetPassword , resendResetLink };
