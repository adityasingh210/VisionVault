import * as eventsService from "./events.service.js";

export async function listEvents(req, res) {
  const result = await eventsService.listEvents(req.user.id);
  return res.json(result);
}

export async function getEvent(req, res) {
  const result = await eventsService.getEventById(req.params.id, req.user.id);
  return res.json(result);
}

export async function getEventImages(req, res) {
  const result = await eventsService.getEventImages(
    req.params.id,
    req.user.id,
    req.query
  );
  return res.json(result);
}

export async function rebuildEvents(req, res) {
  const result = await eventsService.rebuildEvents(req.user.id);
  return res.status(202).json(result);
}
