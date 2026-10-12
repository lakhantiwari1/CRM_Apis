const mongoose = require('mongoose');

const CUSTOMER_STATUSES = ['Active', 'Inactive', 'Churned', 'Prospect'];

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Customer name is required'],
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
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      country: { type: String, trim: true },
      zipCode: { type: String, trim: true },
    },
    status: {
      type: String,
      enum: {
        values: CUSTOMER_STATUSES,
        message: `Status must be one of: ${CUSTOMER_STATUSES.join(', ')}`,
      },
      default: 'Active',
    },
    originalLead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
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
    notes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Notes cannot exceed 2000 characters'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
customerSchema.index({ email: 1 });
customerSchema.index({ status: 1 });
customerSchema.index({ assignedTo: 1 });
customerSchema.index({ originalLead: 1 });
customerSchema.index({ createdAt: -1 });
customerSchema.index({ name: 'text', email: 'text', company: 'text' });

const Customer = mongoose.model('Customer', customerSchema);

module.exports = { Customer, CUSTOMER_STATUSES };
