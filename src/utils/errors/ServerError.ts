import { HttpStatus } from '@nestjs/common';
import { BaseError } from './BaseError';
import { ErrorProps } from './errorsInterface';
import { errorTypes, errorMessages } from '../errors/errorConstants';

export class InternalServerError extends BaseError {
  constructor({ message, verboseMessage }: Partial<ErrorProps>) {
    super({
      message: message || errorMessages.InternalServerErrorMessage,
      httpCode: HttpStatus.INTERNAL_SERVER_ERROR,
      errorType: errorTypes.INTERNAL_SERVER_ERROR,
      verboseMessage,
    });
  }
}

export class ServiceUnavailableError extends BaseError {
  constructor({ message, verboseMessage }: Partial<ErrorProps>) {
    super({
      message: message || errorMessages.serviceUnavailableErrorMessage,
      httpCode: HttpStatus.INTERNAL_SERVER_ERROR,
      errorType: errorTypes.INTERNAL_SERVER_ERROR,
      verboseMessage,
    });
  }
}
