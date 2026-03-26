import { Request, Response } from "express";
import { User } from "../models/User";
import { verifyGoogleToken } from "../utils/google";
import bcrypt from "bcrypt";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/generateToken";
import { AuthRequest } from "../middlewares/authMiddleware";

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

    // 3. Check auth provider (IMPORTANT FIX)
    if (user.authProvider === "google") {
      return res.status(400).json({
        message: "This account is registered with Google. Please login using Google.",
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

export { signUp, login , googleLogin , getMe };
