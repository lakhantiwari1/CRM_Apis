const mongoose = require('mongoose');

const LEAD_SOURCES = ['Website', 'Referral', 'Social Media', 'Email', 'Phone', 'Other'];
const LEAD_STATUSES = ['New', 'Contacted', 'Qualified', 'Unqualified', 'Converted', 'Lost'];
const LEAD_PRIORITIES = ['Low', 'Medium', 'High'];

const leadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Lead name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[+]?[\d\s\-().]{7,20}$/, 'Please provide a valid phone number'],
    },
    company: {
      type: String,
      trim: true,
      maxlength: [150, 'Company name cannot exceed 150 characters'],
    },
    source: {
      type: String,
      enum: {
        values: LEAD_SOURCES,
        message: `Source must be one of: ${LEAD_SOURCES.join(', ')}`,
      },
      default: 'Other',
    },
    status: {
      type: String,
      enum: {
        values: LEAD_STATUSES,
        message: `Status must be one of: ${LEAD_STATUSES.join(', ')}`,
      },
      default: 'New',
    },
    priority: {
      type: String,
      enum: {
        values: LEAD_PRIORITIES,
        message: `Priority must be one of: ${LEAD_PRIORITIES.join(', ')}`,
      },
      default: 'Medium',
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
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    isConverted: {
      type: Boolean,
      default: false,
    },
    convertedAt: {
      type: Date,
    },
    convertedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    convertedCustomer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
    },
    convertedDeal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Deal',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
leadSchema.index({ status: 1 });
leadSchema.index({ priority: 1 });
leadSchema.index({ source: 1 });
leadSchema.index({ assignedTo: 1 });
leadSchema.index({ createdBy: 1 });
leadSchema.index({ isConverted: 1 });
leadSchema.index({ createdAt: -1 });
leadSchema.index({ name: 'text', email: 'text', company: 'text', description: 'text' });
leadSchema.index({ assignedTo: 1, status: 1 });
leadSchema.index({ createdAt: 1, status: 1 });

const Lead = mongoose.model('Lead', leadSchema);

module.exports = { Lead, LEAD_SOURCES, LEAD_STATUSES, LEAD_PRIORITIES };
