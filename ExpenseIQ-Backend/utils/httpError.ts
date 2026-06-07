// Tiny factory: services throw httpError(statusCode, message) and the
// existing errorHandler picks up err.statusCode + err.message.

import type { HttpError } from '../types/api';

const httpError = (statusCode: number, message: string): HttpError => {
  const err = new Error(message) as HttpError;
  err.statusCode = statusCode;
  return err;
};

export = httpError;
