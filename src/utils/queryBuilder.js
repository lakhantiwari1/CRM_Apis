/**
 * Build MongoDB query from request query params
 */

/**
 * Parse pagination params from request query
 */
const parsePagination = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

/**
 * Parse sort params from request query
 * e.g. ?sort=createdAt,-name  => { createdAt: 1, name: -1 }
 */
const parseSort = (query, defaultSort = { createdAt: -1 }) => {
  if (!query.sort) return defaultSort;

  const sortObj = {};
  const fields = query.sort.split(',');

  for (const field of fields) {
    const trimmed = field.trim();
    if (trimmed.startsWith('-')) {
      sortObj[trimmed.slice(1)] = -1;
    } else {
      sortObj[trimmed] = 1;
    }
  }

  return Object.keys(sortObj).length > 0 ? sortObj : defaultSort;
};

/**
 * Build date range filter
 */
const parseDateRange = (query, field = 'createdAt') => {
  const filter = {};
  if (query.startDate || query.endDate) {
    filter[field] = {};
    if (query.startDate) {
      const start = new Date(query.startDate);
      if (!isNaN(start.getTime())) {
        filter[field].$gte = start;
      }
    }
    if (query.endDate) {
      const end = new Date(query.endDate);
      if (!isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        filter[field].$lte = end;
      }
    }
    if (Object.keys(filter[field]).length === 0) {
      delete filter[field];
    }
  }
  return filter;
};

/**
 * Build text search filter
 */
const parseSearch = (query) => {
  if (!query.search || query.search.trim() === '') return {};
  return { $text: { $search: query.search.trim() } };
};

module.exports = { parsePagination, parseSort, parseDateRange, parseSearch };
