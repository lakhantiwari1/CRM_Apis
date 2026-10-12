const mongoose = require('mongoose');

const DEAL_STAGES = ['Qualification', 'Discovery', 'Proposal', 'Negotiation', 'Won', 'Lost'];
const CLOSED_STAGES = ['Won', 'Lost'];
const ACTIVE_STAGES = ['Qualification', 'Discovery', 'Proposal', 'Negotiation'];

const dealSchema = new mongoose.Schema(
  {
    dealName: {
      type: String,
      required: [true, 'Deal name is required'],
      trim: true,
      minlength: [2, 'Deal name must be at least 2 characters'],
      maxlength: [200, 'Deal name cannot exceed 200 characters'],
    },
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer reference is required'],
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    dealValue: {
      type: Number,
      required: [true, 'Deal value is required'],
      min: [0.01, 'Deal value must be greater than zero'],
    },
    probability: {
      type: Number,
      required: [true, 'Probability is required'],
      min: [0, 'Probability cannot be less than 0'],
      max: [100, 'Probability cannot exceed 100'],
      default: 50,
    },
    expectedRevenue: {
      type: Number,
      min: [0, 'Expected revenue cannot be negative'],
    },
    expectedClosingDate: {
      type: Date,
    },
    actualClosingDate: {
      type: Date,
    },
    stage: {
      type: String,
      enum: {
        values: DEAL_STAGES,
        message: `Stage must be one of: ${DEAL_STAGES.join(', ')}`,
      },
      default: 'Qualification',
    },
    previousStage: {
      type: String,
      enum: [...DEAL_STAGES, null],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    lostReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Lost reason cannot exceed 500 characters'],
    },
    isClosed: {
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

// Indexes
dealSchema.index({ stage: 1 });
dealSchema.index({ assignedTo: 1 });
dealSchema.index({ customer: 1 });
dealSchema.index({ lead: 1 });
dealSchema.index({ isClosed: 1 });
dealSchema.index({ createdAt: -1 });
dealSchema.index({ expectedClosingDate: 1 });
dealSchema.index({ dealValue: 1 });
dealSchema.index({ dealName: 'text', description: 'text' });
dealSchema.index({ assignedTo: 1, stage: 1 });

// Pre-save: auto-calculate expectedRevenue and enforce business rules
dealSchema.pre('save', function (next) {
  // Auto-calculate expected revenue
  if (this.isModified('dealValue') || this.isModified('probability')) {
    this.expectedRevenue = parseFloat(((this.dealValue * this.probability) / 100).toFixed(2));
  }

  // Set isClosed flag
  if (this.isModified('stage')) {
    this.isClosed = CLOSED_STAGES.includes(this.stage);
    if (this.stage === 'Won' && !this.actualClosingDate) {
      this.actualClosingDate = new Date();
    }
  }

  next();
});

// Virtual: days until closing
dealSchema.virtual('daysUntilClosing').get(function () {
  if (!this.expectedClosingDate) return null;
  const today = new Date();
  const diff = this.expectedClosingDate - today;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

const Deal = mongoose.model('Deal', dealSchema);

module.exports = { Deal, DEAL_STAGES, CLOSED_STAGES, ACTIVE_STAGES };
