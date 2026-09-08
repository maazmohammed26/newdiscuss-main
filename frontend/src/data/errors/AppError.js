export const ERROR_CODES = Object.freeze({
  NETWORK: 'NETWORK',
  AUTH: 'AUTH',
  PERMISSION: 'PERMISSION',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMIT: 'RATE_LIMIT',
  VALIDATION: 'VALIDATION',
  MEDIA: 'MEDIA',
  NOTIFICATION: 'NOTIFICATION',
  UNKNOWN: 'UNKNOWN',
});

export class AppError extends Error {
  constructor(code, message, options = {}) {
    super(message, options.cause ? { cause: options.cause } : undefined);
    this.name = 'AppError';
    this.code = code;
    this.retryable = Boolean(options.retryable);
    this.context = options.context || {};
  }
}

export const toAppError = (error, context = {}) => {
  if (error instanceof AppError) return error;

  const providerCode = String(error?.code || '').toLowerCase();
  if (providerCode.includes('permission-denied')) {
    return new AppError(ERROR_CODES.PERMISSION, 'You do not have permission to access this data.', {
      cause: error,
      context,
    });
  }
  if (providerCode.includes('auth') || providerCode.includes('user-token')) {
    return new AppError(ERROR_CODES.AUTH, 'Your session is no longer valid.', {
      cause: error,
      context,
    });
  }
  if (providerCode.includes('network') || error?.name === 'TypeError') {
    return new AppError(ERROR_CODES.NETWORK, 'The network is unavailable.', {
      cause: error,
      retryable: true,
      context,
    });
  }

  return new AppError(ERROR_CODES.UNKNOWN, 'Discuss could not complete the request.', {
    cause: error,
    retryable: false,
    context,
  });
};
