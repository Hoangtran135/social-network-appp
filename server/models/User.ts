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
    isBot: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'joinDate', updatedAt: false } }
);

// email/username already get a unique index for free; role is checked on every admin
// route and text search on name/username/bio backs GET /api/search.
userSchema.index({ role: 1 });
userSchema.index({ name: 'text', username: 'text', bio: 'text' });

export type UserDoc = InferSchemaType<typeof userSchema>;
export const UserModel = mongoose.models.User || mongoose.model('User', userSchema);
