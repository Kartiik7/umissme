import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    spaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CoupleSpace',
      required: [true, 'Space ID is required'],
    },
    sender: {
      type: String,
      required: [true, 'Sender name is required'],
      trim: true,
      maxlength: [50, 'Sender name must be 50 characters or fewer'],
    },
    text: {
      type: String,
      required: [true, 'Message text cannot be empty'],
      trim: true,
      maxlength: [500, 'Message must be 500 characters or fewer'],
    },
    type: {
      type: String,
      enum: ['text', 'ping'],
      default: 'text',
    },
    sent: {
      type: Boolean,
      default: true,
    },
    delivered: {
      type: Boolean,
      default: false,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    seen: {
      type: Boolean,
      default: false,
    },
    seenAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      index: { expires: 0 },
    },
  },
  { timestamps: true }
);

// Index for efficient conversation queries
messageSchema.index({ spaceId: 1, createdAt: 1 });

const Message = mongoose.model('Message', messageSchema);
export default Message;
