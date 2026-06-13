export class AppError extends Error {
  /**
   * @param {string} message   
   * @param {number} status    
   * @param {string} code      
   * @param {object} [meta]    
   */
  constructor(message, status, code, meta = undefined) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    this.meta = meta;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message, issues = undefined) {
    super(message, 400, "VALIDATION_ERROR", issues ? { issues } : undefined);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = "Authentication required") {
    super(message, 401, "AUTHENTICATION_ERROR");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to perform this action") {
    super(message, 403, "FORBIDDEN");
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(`${resource} not found`, 404, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  constructor(message) {
    super(message, 409, "CONFLICT");
  }
}

export class UnprocessableError extends AppError {
  constructor(message) {
    super(message, 422, "UNPROCESSABLE");
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Too many requests, please try again later") {
    super(message, 429, "RATE_LIMIT_EXCEEDED");
  }
}

export class InternalError extends AppError {
  constructor(message = "An unexpected error occurred") {
    super(message, 500, "INTERNAL_ERROR");
  }
}


export function isAppError(err) {
  return err instanceof AppError;
}
