import mongoose from 'mongoose';

const coupleSpaceSchema = new mongoose.Schema(
  {
    spaceName: {
      type: String,
      required: [true, 'Space name is required'],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [2, 'Space name must be at least 2 characters'],
      maxlength: [60, 'Space name must be 60 characters or fewer'],
    },
    friendOneName: {
      type: String,
      required: [true, 'Friend one name is required'],
      trim: true,
      maxlength: [50, 'Friend one name must be 50 characters or fewer'],
    },
    friendTwoName: {
      type: String,
      required: [true, 'Friend two name is required'],
      trim: true,
      maxlength: [50, 'Friend two name must be 50 characters or fewer'],
    },
    accessCode: {
      type: String,
      required: [true, 'Access code is required'],
      trim: true,
      minlength: [20, 'Stored access code hash is invalid'],
      maxlength: [120, 'Stored access code hash is invalid'],
    },
    retentionHours: {
      type: Number,
      default: 168,
      enum: [42, 72, 168, 240],
    },
    friendOneLastSeenAt: {
      type: Date,
      default: null,
    },
    friendTwoLastSeenAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

const CoupleSpace = mongoose.model('CoupleSpace', coupleSpaceSchema);
export default CoupleSpace;
