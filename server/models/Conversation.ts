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
    kind: { type: String, enum: ['text', 'system', 'call'], default: 'text' },
    content: { type: String, default: '' },
    sharedPostId: { type: Schema.Types.ObjectId, ref: 'Post' },
    callType: { type: String, enum: ['audio', 'video'] },
    callStatus: { type: String, enum: ['completed', 'missed', 'rejected'] },
    callDurationSec: { type: Number },
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

// "my conversations" (participants contains me, newest activity first) and "messages in
// this thread, oldest first" are both hit on every chat page load.
conversationSchema.index({ participants: 1, updatedAt: -1 });
messageSchema.index({ conversation: 1, createdAt: 1 });

export const ConversationModel =
  mongoose.models.Conversation || mongoose.model('Conversation', conversationSchema);
export const MessageModel = mongoose.models.Message || mongoose.model('Message', messageSchema);
