import { AppError, ERROR_CODES, toAppError } from './AppError';

test('toAppError classifies retryable network failures', () => {
  const result = toAppError({ code: 'database/network-error' }, { operation: 'test' });
  expect(result).toBeInstanceOf(AppError);
  expect(result.code).toBe(ERROR_CODES.NETWORK);
  expect(result.retryable).toBe(true);
  expect(result.context).toEqual({ operation: 'test' });
});

test('toAppError does not wrap an existing AppError', () => {
  const original = new AppError(ERROR_CODES.VALIDATION, 'Invalid');
  expect(toAppError(original)).toBe(original);
});
