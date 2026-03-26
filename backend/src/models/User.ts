import mongoose from "mongoose";
import { Document, Schema } from "mongoose";

export interface IUser extends Document {
    name: string;
    email: string;
    password?: string;
    googleId?: string;
    authProvider: "local" | "google"; 
}

const userSchema = new Schema<IUser>({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
      type: String,
      required: function (this: any) {
        return this.authProvider === "local"; // 👈 key fix
      },
      select: false,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true, // allows multiple docs with null googleId
    },
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local", // 👈 normal signup = local
    },
});

export const User = mongoose.model<IUser>("User", userSchema);
