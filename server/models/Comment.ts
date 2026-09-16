import mongoose, { Schema } from 'mongoose';

const commentSchema = new Schema(
  {
    post: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, default: '' },
    image: { type: String },
    taggedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    parent: { type: Schema.Types.ObjectId, ref: 'Comment' },
  },
  { timestamps: true }
);

// The per-post comment fetch (GET /comments?postId=) is the hot path — indexed so it stays
// fast regardless of how many comments the collection accumulates overall.
commentSchema.index({ post: 1, createdAt: 1 });

export const CommentModel = mongoose.models.Comment || mongoose.model('Comment', commentSchema);
