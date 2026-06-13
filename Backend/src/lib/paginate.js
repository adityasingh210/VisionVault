import { env } from "../config/env.js";

/**
 *
 * @param {object} query  req.query
 * @returns {{ page: number, limit: number, skip: number }}
 */
export function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page ?? 1, 10) || 1);
  const rawLimit = parseInt(query.limit ?? env.DEFAULT_PAGE_SIZE, 10) || env.DEFAULT_PAGE_SIZE;
  const limit = Math.min(Math.max(1, rawLimit), env.MAX_PAGE_SIZE);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 *
 * @param {Array}  data        
 * @param {number} total       
 * @param {number} page       
 * @param {number} limit       
 * @returns {object}
 */
export function paginatedResponse(data, total, page, limit) {
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}
