// src/modules/images/images.controller.js

import * as imagesService from "./images.service.js";

export async function uploadSingle(req, res) {
  const file = req.file;

  if (!file) {
    return res.status(400).json({
      error: { code: "NO_FILE", message: "No image file was provided" },
    });
  }

  const { succeeded, failed } = await imagesService.uploadImages(
    [file],
    req.user.id
  );

  if (failed.length > 0) {
    return res.status(422).json({ error: failed[0] });
  }

  return res.status(201).json(succeeded[0]);
}

export async function uploadBatch(req, res) {
  const files = req.files;

  if (!files?.length) {
    return res.status(400).json({
      error: { code: "NO_FILES", message: "No image files were provided" },
    });
  }

  const { succeeded, failed } = await imagesService.uploadImages(
    files,
    req.user.id
  );

  let statusCode;
  if (failed.length === 0) statusCode = 201;
  else if (succeeded.length === 0) statusCode = 422;
  else statusCode = 207;

  return res.status(statusCode).json({ succeeded, failed });
}

export async function listImages(req, res) {
  const result = await imagesService.getImages(req.user.id, req.query);
  return res.json(result);
}

export async function getImage(req, res) {
  const image = await imagesService.getImageById(req.params.id, req.user.id);
  return res.json(image);
}

export async function getImageProcessingStatus(req, res) {
  const status = await imagesService.getImageProcessingStatus(
    req.params.id,
    req.user.id
  );
  return res.json(status);
}

export async function deleteImage(req, res) {
  await imagesService.deleteImage(req.params.id, req.user.id);
  return res.status(204).send();
}

export async function bulkDeleteImages(req, res) {
  const result = await imagesService.bulkDeleteImages(
    req.body.imageIds,
    req.user.id
  );
  return res.json(result);
}
export async function searchByOcr(req, res) {
  const result = await imagesService.searchImagesByOcr(req.user.id, req.query);
  return res.json(result);
}
