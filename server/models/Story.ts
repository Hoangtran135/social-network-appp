import mongoose, { Schema } from 'mongoose';

const storySchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['image', 'text'], required: true },
    privacy: { type: String, enum: ['public', 'friends'], default: 'public' },
    mediaUrl: { type: String },
    textContent: { type: String },
    backgroundGradient: { type: String },
    expiresAt: { type: Date, required: true },
    viewers: [
      {
        user: { type: Schema.Types.ObjectId, ref: 'User' },
        viewedAt: { type: Date, default: Date.now },
        _id: false,
      },
    ],
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const StoryModel = mongoose.models.Story || mongoose.model('Story', storySchema);
