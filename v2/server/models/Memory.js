import mongoose from 'mongoose';

const memorySchema = new mongoose.Schema(
  {
    spaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CoupleSpace',
      required: [true, 'Space ID is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [80, 'Title must be 80 characters or fewer'],
    },
    note: {
      type: String,
      required: [true, 'Note is required'],
      trim: true,
      maxlength: [300, 'Note must be 300 characters or fewer'],
    },
    imageUrl: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Image URL must be 500 characters or fewer'],
    },
    createdBy: {
      type: String,
      required: true,
      trim: true,
      maxlength: [40, 'Creator name must be 40 characters or fewer'],
    },
  },
  { timestamps: true }
);

memorySchema.index({ spaceId: 1, createdAt: -1 });

const Memory = mongoose.model('Memory', memorySchema);
export default Memory;
