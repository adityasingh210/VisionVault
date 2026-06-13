import * as facesService from "./faces.service.js";

export async function listClusters(req, res) {
  const result = await facesService.listFaceClusters(req.user.id);
  return res.json(result);
}

export async function getCluster(req, res) {
  const result = await facesService.getFaceClusterById(
    req.params.id,
    req.user.id
  );
  return res.json(result);
}
