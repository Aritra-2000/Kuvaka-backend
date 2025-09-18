import mongoose from 'mongoose';

const offerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [3, 'Name must be at least 3 characters long'],
      maxlength: [100, 'Name cannot be longer than 100 characters'],
    },
    value_props: [
      {
        type: String,
        required: [true, 'At least one value proposition is required'],
        trim: true,
      },
    ],
    ideal_use_cases: [
      {
        type: String,
        required: [true, 'At least one ideal use case is required'],
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
offerSchema.index({ name: 'text' });

// Pre-save hook to ensure at least one value prop and use case
offerSchema.pre('save', function (next) {
  if (this.value_props && this.value_props.length === 0) {
    this.invalidate('value_props', 'At least one value proposition is required');
  }
  if (this.ideal_use_cases && this.ideal_use_cases.length === 0) {
    this.invalidate('ideal_use_cases', 'At least one ideal use case is required');
  }
  next();
});

// Virtual for lead count
offerSchema.virtual('leadCount', {
  ref: 'Lead',
  localField: '_id',
  foreignField: 'offer',
  count: true,
});

// Static method to check if offer exists
offerSchema.statics.offerExists = async function (offerId) {
  const count = await this.countDocuments({ _id: offerId });
  return count > 0;
};

// Query middleware to populate leadCount
offerSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'leadCount',
    select: '-__v',
  });
  next();
});

const Offer = mongoose.model('Offer', offerSchema);

export default Offer;
