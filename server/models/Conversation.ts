import mongoose, { Schema } from 'mongoose';

const conversationSchema = new Schema(
  {
    isGroup: { type: Boolean, default: false },
    name: { type: String },
    avatar: { type: String },
    participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    admins: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    nicknames: { type: Map, of: String, default: {} },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

const messageSchema = new Schema(
  {
    conversation: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User' },
    kind: { type: String, enum: ['text', 'system'], default: 'text' },
    content: { type: String, default: '' },
    sharedPostId: { type: Schema.Types.ObjectId, ref: 'Post' },
    attachments: [
      {
        type: { type: String, enum: ['image', 'file'] },
        url: String,
        name: String,
        size: String,
        _id: false,
      },
    ],
    readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isRecalled: { type: Boolean, default: false },
    reactions: { type: Map, of: String, default: {} }, // userId -> emoji
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const ConversationModel =
  mongoose.models.Conversation || mongoose.model('Conversation', conversationSchema);
export const MessageModel = mongoose.models.Message || mongoose.model('Message', messageSchema);
