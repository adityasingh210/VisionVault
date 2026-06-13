import multer from "multer";
import { env } from "../config/env.js";
import { ValidationError, UnprocessableError } from "../lib/errors.js";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "image/tiff",
]);

const MAX_FILE_SIZE_BYTES = env.MAX_FILE_SIZE_MB * 1024 * 1024;
const multerInstance = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 20,
  },
  fileFilter(_req, file, cb) {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(
        new ValidationError(
          `File type "${file.mimetype}" is not supported. Allowed: JPEG, PNG, WebP, GIF, HEIC, TIFF`
        )
      );
    }
    cb(null, true);
  },
});

export function uploadSingle(fieldName = "image") {
  return (req, res, next) => {
    multerInstance.single(fieldName)(req, res, (err) => {
      if (!err) return next();
      handleMulterError(err, next);
    });
  };
}

export function uploadMultiple(fieldName = "images", maxCount = 20) {
  return (req, res, next) => {
    multerInstance.array(fieldName, maxCount)(req, res, (err) => {
      if (!err) return next();
      handleMulterError(err, next);
    });
  };
}

function handleMulterError(err, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return next(
        new ValidationError(
          `File exceeds the maximum allowed size of ${env.MAX_FILE_SIZE_MB}MB`
        )
      );
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return next(new ValidationError("Too many files in a single request"));
    }
    return next(new ValidationError(`Upload error: ${err.message}`));
  }

  next(err);
}
