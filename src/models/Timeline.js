const mongoose = require('mongoose');

const TIMELINE_ACTIONS = [
  'lead_created',
  'lead_assigned',
  'lead_reassigned',
  'lead_status_changed',
  'lead_priority_changed',
  'lead_converted',
  'lead_updated',
  'lead_deleted',
  'note_added',
  'followup_created',
  'followup_completed',
  'customer_created',
  'customer_updated',
  'deal_created',
  'deal_stage_changed',
  'deal_assigned',
  'deal_won',
  'deal_lost',
  'deal_updated',
  'activity_created',
  'activity_completed',
  'activity_updated',
  'user_assigned',
];

const TIMELINE_ENTITY_TYPES = ['Lead', 'Customer', 'Deal', 'Activity', 'User'];

const timelineSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: [true, 'Action is required'],
      enum: {
        values: TIMELINE_ACTIONS,
        message: 'Invalid timeline action',
      },
    },
    entityType: {
      type: String,
      required: [true, 'Entity type is required'],
      enum: {
        values: TIMELINE_ENTITY_TYPES,
        message: `Entity type must be one of: ${TIMELINE_ENTITY_TYPES.join(', ')}`,
      },
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Entity ID is required'],
      refPath: 'entityType',
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Performed by is required'],
    },
    previousValue: {
      type: mongoose.Schema.Types.Mixed,
    },
    newValue: {
      type: mongoose.Schema.Types.Mixed,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
timelineSchema.index({ entityId: 1, entityType: 1, createdAt: -1 });
timelineSchema.index({ performedBy: 1 });
timelineSchema.index({ action: 1 });
timelineSchema.index({ createdAt: -1 });

const Timeline = mongoose.model('Timeline', timelineSchema);

module.exports = { Timeline, TIMELINE_ACTIONS, TIMELINE_ENTITY_TYPES };
