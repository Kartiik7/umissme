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
    partnerOneName: {
      type: String,
      required: [true, 'Partner one name is required'],
      trim: true,
      maxlength: [50, 'Name must be 50 characters or fewer'],
    },
    partnerTwoName: {
      type: String,
      required: [true, 'Partner two name is required'],
      trim: true,
      maxlength: [50, 'Name must be 50 characters or fewer'],
    },
    accessCode: {
      type: String,
      required: [true, 'Access code is required'],
      minlength: [4, 'Access code must be at least 4 characters'],
    },
  },
  { timestamps: true }
);

const CoupleSpace = mongoose.model('CoupleSpace', coupleSpaceSchema);
export default CoupleSpace;
