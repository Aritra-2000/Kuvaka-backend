import mongoose from 'mongoose';

const leadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email'],
    },
    role: {
      type: String,
      required: [true, 'Role is required'],
      trim: true,
    },
    industry: {
      type: String,
      required: [true, 'Industry is required'],
      trim: true,
    },
    company: {
      type: String,
      trim: true,
      default: '',
    },
    linkedin: {
      type: String,
      trim: true,
      default: '',
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    score: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    score_reason: {
      type: String,
      default: '',
      trim: true,
    },
    is_processed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
leadSchema.index({ email: 1 }, { unique: true });
leadSchema.index({ role: 1 });
leadSchema.index({ industry: 1 });
leadSchema.index({ score: -1 });
leadSchema.index({ is_processed: 1 });

// Pre-save hook to ensure email is unique
leadSchema.pre('save', async function (next) {
  if (this.isModified('email')) {
    const existingLead = await this.constructor.findOne({ email: this.email });
    if (existingLead && !existingLead._id.equals(this._id)) {
      this.invalidate('email', 'Email already exists');
    }
  }
  next();
});

// Static method to get leads by score range
leadSchema.statics.findByScoreRange = async function (min, max, limit = 100) {
  return this.find({
    score: { $gte: min, $lte: max },
    is_processed: true,
  })
    .sort({ score: -1 })
    .limit(limit)
    .lean();
};

// Static method to get unprocessed leads
leadSchema.statics.getUnprocessedLeads = async function (limit = 100) {
  return this.find({ is_processed: false })
    .sort({ createdAt: 1 })
    .limit(limit)
    .lean();
};

// Static method to get leads by industry
leadSchema.statics.getLeadsByIndustry = async function (industry, limit = 100) {
  return this.find({ industry, is_processed: true })
    .sort({ score: -1 })
    .limit(limit)
    .lean();
};

const Lead = mongoose.model('Lead', leadSchema);

export default Lead;
