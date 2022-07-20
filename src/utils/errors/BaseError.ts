import { ErrorProps } from './errorsInterface';

import { errorTypes, errorMessages } from './errorConstants';
import { Logger, HttpStatus } from '@nestjs/common';

export class BaseError extends Error {
  private httpCode: number;
  private verboseMessage: any;
  private errorType?: string;
  public message: string;
  public error: boolean;

  constructor({ message, httpCode, verboseMessage, errorType }: ErrorProps) {
    super(message);
    this.name = this.constructor.name;
    this.httpCode = httpCode || HttpStatus.INTERNAL_SERVER_ERROR;
    this.message = message || errorMessages.InternalServerErrorMessage;
    this.verboseMessage = verboseMessage;
    this.errorType = errorType || errorTypes.INTERNAL_SERVER_ERROR;

    Error.captureStackTrace(this, () => Logger.error(this));
  }
}
