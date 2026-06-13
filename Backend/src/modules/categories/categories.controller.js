import * as categoriesService from "./categories.service.js";

export async function listCategories(req, res) {
  const result = await categoriesService.listCategories(req.user.id);
  return res.json(result);
}

export async function getCategoryImages(req, res) {
  const result = await categoriesService.getImagesByCategory(
    req.params.slug,
    req.user.id,
    req.query
  );
  return res.json(result);
}