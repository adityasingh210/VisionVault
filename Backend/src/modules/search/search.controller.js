import { hybridSearch } from "../../ai/search.service.js";
import { env } from "../../config/env.js";
export async function search(req, res) {
  const { q, limit: rawLimit, offset: rawOffset } = req.query;

const limit = Number(rawLimit ?? env.DEFAULT_PAGE_SIZE);
const offset = Number(rawOffset ?? 0);

  const { results, total, signals, parsedQuery } = await hybridSearch(
    q,
    req.user.id,
    { limit, offset }
  );

  const totalPages  = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return res.json({
    data: results,
    pagination: {
      total,
      limit,
      offset,
      page: currentPage,
      totalPages,
      hasNextPage: offset + limit < total,
      hasPrevPage: offset > 0,
    },
    meta: {
      query: q,
      parsedQuery,
      signals,
    },
  });
}