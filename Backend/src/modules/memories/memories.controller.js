// src/modules/memories/memories.controller.js
import * as memoriesService from "./memories.service.js";
export async function getHighlights(req, res) {
  const data = await memoriesService.getHighlights(req.user.id);
  return res.json({ data });
}
export async function getPeople(req, res) {
  const { limit } = req.query;
  const data = await memoriesService.getMostPhotographedPeople(req.user.id, { limit });
  return res.json({ data, total: data.length });
}
export async function getTopEvents(req, res) {
  const { limit, year } = req.query;
  const data = await memoriesService.getTopEvents(req.user.id, { limit, year });
  return res.json({ data, total: data.length });
}
export async function getDocuments(req, res) {
  const { limit } = req.query;
  const data = await memoriesService.getImportantDocuments(req.user.id, { limit });
  return res.json({ data });
}
export async function getMonthlyMemories(req, res) {
  const { year, previewCount } = req.query;
  const data = await memoriesService.getMonthlyMemories(req.user.id, { year, previewCount });
  return res.json({ data, total: data.length });
}
export async function getTravelSummary(req, res) {
  const { year } = req.query;
  const data = await memoriesService.getTravelSummary(req.user.id, { year });
  return res.json({ data });
}