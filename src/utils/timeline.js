const { Timeline } = require('../models/Timeline');

/**
 * Create a timeline entry for a CRM event
 */
const createTimelineEntry = async (params, session = null) => {
  const {
    action,
    entityType,
    entityId,
    performedBy,
    previousValue = null,
    newValue = null,
    description = null,
    metadata = null,
  } = params;

  const entry = new Timeline({
    action,
    entityType,
    entityId,
    performedBy,
    previousValue,
    newValue,
    description,
    metadata,
  });

  if (session) {
    await entry.save({ session });
  } else {
    await entry.save();
  }

  return entry;
};

/**
 * Bulk create timeline entries (for transaction use)
 */
const createManyTimelineEntries = async (entries, session = null) => {
  const options = session ? { session } : {};
  return Timeline.insertMany(entries, options);
};

module.exports = { createTimelineEntry, createManyTimelineEntries };
