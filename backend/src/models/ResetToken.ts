import mongoose, { Schema , Document } from "mongoose";

export interface IResetToken extends Document {
  userId: mongoose.Types.ObjectId;
  token: string;
  expiresAt: Date;
  resendCount: number;
  lastSeenAt: Date;
}

const resetTokenSchema = new Schema<IResetToken>({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
  token: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  resendCount: { type: Number, default: 0 },
  lastSeenAt: { type: Date, default: Date.now }
});

export default mongoose.model<IResetToken>("ResetToken", resetTokenSchema);