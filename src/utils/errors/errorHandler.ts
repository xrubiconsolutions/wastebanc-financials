import { HttpStatus } from '@nestjs/common';
import { BaseError } from './BaseError';
import { errorMessages, errorTypes } from './errorConstants';
import { ErrorProps } from './errorsInterface';

export class UnprocessableEntityError extends BaseError {
  constructor({ message, verboseMessage, httpCode }: ErrorProps) {
    super({
      message: message || errorMessages.unprocessableEntityErrorMessage,
      httpCode: httpCode || HttpStatus.BAD_REQUEST,
      errorType: errorTypes.BAD_REQUEST,
      verboseMessage,
    });
  }
}
