export type HttpError = Error & { statusCode: number };

export function toHttpError(statusCode: number, message: string): HttpError {
  const err = new Error(message) as HttpError;
  err.statusCode = statusCode;
  return err;
}
