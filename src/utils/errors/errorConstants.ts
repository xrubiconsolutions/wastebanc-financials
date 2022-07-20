export const errorTypes = {
  ACCESS_DENIED: 'ACCESS_DENIED',
  USER_AUTHENTICATION_FALSE: 'USER_AUTHENTICATION_FALSE',
  FILE_SYSTEM_ERROR: 'FILE_SYSTEM_ERROR',
  HTTP_ERROR: 'HTTP_ERROR',
  HTTP_CONNECTION_ERROR: 'HTTP_CONNECTION_ERROR',
  OPERATION_FORBIDDEN: 'OPERATION_FORBIDDEN',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_EXIST: 'RESOURCE_EXIST',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  UNPROCESSABLE_ENTITY: 'UNPROCESSABLE_ENTITY',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  BAD_REQUEST: 'BAD_REQUEST',
};

export const errorMessages = {
  accessDeniedErrorMessage: 'Access denied to requested resource',
  requestedResourceDeniedErrorMessage:
    'You do not have access to requested resource.',
  updateAccessDeniedErrorMessage:
    'You do not have access to requested resource, therefore you cannot update it',
  deleteAccessDeniedErrorMessage:
    'You do not have access to requested resource, therefore you cannot delete it.',
  authenticationErrorMessage: 'Unable to authenticate user',
  fileSystemErrorMessage:
    'Error occured during operation. Please try again later.',
  httpErrorMessage: 'Error occured during operation. Please try again later.',
  httpConnectionErrorMessage:
    'Error occured during operation. Please try again later.',
  operationForbiddenErrorMessage: 'Operation forbidden',
  resourceNotFoundErrorMessage: 'Resource not found',
  resourceExistErrorMessage: 'Resource already exists',
  InternalServerErrorMessage:
    "Error occured during operation. We're currently checking why this happend.",
  serviceUnavailableErrorMessage:
    'Error occured during operation. Please try again later.',
  unprocessableEntityErrorMessage:
    'Unprocessable Entity. Error during payload Validation.',
};
