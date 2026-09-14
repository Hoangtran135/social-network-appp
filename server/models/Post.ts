import mongoose, { Schema } from 'mongoose';

const reactionSchema = new Schema(
  {
    type: { type: String, enum: ['like', 'love', 'haha', 'wow', 'sad', 'angry'], required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { _id: false }
);

const postSchema = new Schema(
  {
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    wallOwner: { type: Schema.Types.ObjectId, ref: 'User' },
    content: { type: String, default: '' },
    images: [{ type: String }],
    video: { type: String },
    privacy: { type: String, enum: ['public', 'friends', 'only_me'], default: 'public' },
    feeling: { type: String },
    location: { type: String },
    group: { type: Schema.Types.ObjectId, ref: 'Group' },
    taggedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    reactions: [reactionSchema],
    savedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    commentsCount: { type: Number, default: 0 },
    sharesCount: { type: Number, default: 0 },
    pinned: { type: Boolean, default: false },
    editedAt: { type: Date },
  },
  { timestamps: true }
);

export const PostModel = mongoose.models.Post || mongoose.model('Post', postSchema);
