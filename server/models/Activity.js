import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema(
  {
    spaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CoupleSpace',
      required: [true, 'Space ID is required'],
      index: true,
    },
    type: {
      type: String,
      enum: ['joined', 'ping', 'memory', 'message'],
      required: true,
    },
    actor: {
      type: String,
      required: true,
      trim: true,
      maxlength: [40, 'Actor name must be 40 characters or fewer'],
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: [180, 'Description must be 180 characters or fewer'],
    },
  },
  { timestamps: true }
);

activitySchema.index({ spaceId: 1, createdAt: -1 });

const Activity = mongoose.model('Activity', activitySchema);
export default Activity;
