import mongoose, { Schema, InferSchemaType } from 'mongoose';

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    avatar: { type: String, default: '' },
    coverImage: { type: String },
    bio: { type: String },
    role: { type: String, enum: ['admin', 'user'], default: 'user' },
    isBanned: { type: Boolean, default: false },
    workplace: { type: String },
    education: { type: String },
    location: { type: String },
    website: { type: String },
    isOnline: { type: Boolean, default: false },
    lastActive: { type: Date },
    resetTokenHash: { type: String },
    resetTokenExpires: { type: Date },
    blockedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: { createdAt: 'joinDate', updatedAt: false } }
);

export type UserDoc = InferSchemaType<typeof userSchema>;
export const UserModel = mongoose.models.User || mongoose.model('User', userSchema);
