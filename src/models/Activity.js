const mongoose = require('mongoose');

const ACTIVITY_TYPES = ['Call', 'Email', 'Meeting', 'Demo', 'Follow-up', 'Reminder', 'Note'];
const ACTIVITY_STATUSES = ['Pending', 'Completed', 'Overdue'];
const ENTITY_TYPES = ['Lead', 'Customer', 'Deal'];

const activitySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: [true, 'Activity type is required'],
      enum: {
        values: ACTIVITY_TYPES,
        message: `Type must be one of: ${ACTIVITY_TYPES.join(', ')}`,
      },
    },
    title: {
      type: String,
      required: [true, 'Activity title is required'],
      trim: true,
      minlength: [2, 'Title must be at least 2 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Assigned user is required'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    dueDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: {
        values: ACTIVITY_STATUSES,
        message: `Status must be one of: ${ACTIVITY_STATUSES.join(', ')}`,
      },
      default: 'Pending',
    },
    completedDate: {
      type: Date,
    },
    // Polymorphic relationship
    relatedEntityType: {
      type: String,
      enum: {
        values: [...ENTITY_TYPES, null],
        message: `Entity type must be one of: ${ENTITY_TYPES.join(', ')}`,
      },
    },
    relatedEntityId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'relatedEntityType',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
activitySchema.index({ assignedTo: 1 });
activitySchema.index({ status: 1 });
activitySchema.index({ dueDate: 1 });
activitySchema.index({ relatedEntityId: 1, relatedEntityType: 1 });
activitySchema.index({ createdAt: -1 });
activitySchema.index({ type: 1 });
activitySchema.index({ dueDate: 1, status: 1 });
activitySchema.index({ title: 'text', description: 'text' });

// Virtual: check if overdue
activitySchema.virtual('isOverdue').get(function () {
  if (this.status === 'Completed') return false;
  if (!this.dueDate) return false;
  return new Date() > this.dueDate;
});

// Pre-find hook to auto-mark overdue activities
activitySchema.pre(/^find/, function (next) {
  this._startTime = Date.now();
  next();
});

const Activity = mongoose.model('Activity', activitySchema);

module.exports = { Activity, ACTIVITY_TYPES, ACTIVITY_STATUSES, ENTITY_TYPES };
