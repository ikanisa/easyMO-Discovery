/**
 * Error Handling Tests
 */

import { describe, it, expect } from 'vitest';
import {
  WorkerError,
  ErrorCode,
  createErrorResponse,
  wrapOpenAIError,
  withTimeout,
} from '../utils/errors';

describe('Error Handling', () => {
  describe('WorkerError', () => {
    it('should create error with code', () => {
      const error = new WorkerError('Test error', ErrorCode.BAD_REQUEST, 400);
      expect(error.message).toBe('Test error');
      expect(error.code).toBe(ErrorCode.BAD_REQUEST);
      expect(error.statusCode).toBe(400);
    });

    it('should serialize to JSON', () => {
      const error = new WorkerError('Test error', ErrorCode.BAD_REQUEST, 400);
      const json = error.toJSON();
      expect(json.error).toBe('Test error');
      expect(json.code).toBe(ErrorCode.BAD_REQUEST);
    });
  });

  describe('createErrorResponse', () => {
    it('should create response from WorkerError', () => {
      const error = new WorkerError('Test error', ErrorCode.BAD_REQUEST, 400);
      const response = createErrorResponse(error, 'test-request-id');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Test error');
      expect(response.body.code).toBe(ErrorCode.BAD_REQUEST);
      expect(response.body.request_id).toBe('test-request-id');
    });

    it('should wrap generic Error', () => {
      const error = new Error('Generic error');
      const response = createErrorResponse(error);

      expect(response.status).toBe(500);
      expect(response.body.code).toBe(ErrorCode.INTERNAL_ERROR);
    });
  });

  describe('wrapOpenAIError', () => {
    it('should wrap rate limit error', () => {
      const error: any = { status: 429, message: 'Rate limited' };
      const wrapped = wrapOpenAIError(error);

      expect(wrapped.code).toBe(ErrorCode.RATE_LIMIT_EXCEEDED);
      expect(wrapped.statusCode).toBe(429);
      expect(wrapped.retryable).toBe(true);
    });

    it('should wrap 5xx error as retryable', () => {
      const error: any = { status: 502, message: 'Bad gateway' };
      const wrapped = wrapOpenAIError(error);

      expect(wrapped.code).toBe(ErrorCode.OPENAI_ERROR);
      expect(wrapped.statusCode).toBe(502);
      expect(wrapped.retryable).toBe(true);
    });

    it('should wrap 4xx error as non-retryable', () => {
      const error: any = { status: 400, message: 'Bad request' };
      const wrapped = wrapOpenAIError(error);

      expect(wrapped.code).toBe(ErrorCode.OPENAI_ERROR);
      expect(wrapped.statusCode).toBe(400);
      expect(wrapped.retryable).toBe(false);
    });
  });

  describe('withTimeout', () => {
    it('should resolve before timeout', async () => {
      const promise = Promise.resolve('success');
      const result = await withTimeout(promise, 1000);
      expect(result).toBe('success');
    });

    it('should reject on timeout', async () => {
      const promise = new Promise(resolve => setTimeout(resolve, 2000));
      await expect(withTimeout(promise, 100)).rejects.toThrow();
    });
  });
});

