/**
 * Logging Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Logger, generateRequestId } from '../utils/logging';

describe('Logger', () => {
  let consoleLogSpy: any;
  let consoleErrorSpy: any;
  let consoleWarnSpy: any;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should log info messages', () => {
    const logger = new Logger('test-request-id', 'test-user-id');
    logger.info('Test message');

    expect(consoleLogSpy).toHaveBeenCalled();
    const logCall = consoleLogSpy.mock.calls[0][0];
    const logEntry = JSON.parse(logCall);
    expect(logEntry.level).toBe('info');
    expect(logEntry.message).toBe('Test message');
    expect(logEntry.request_id).toBe('test-request-id');
    expect(logEntry.user_id).toBe('test-user-id');
  });

  it('should log errors', () => {
    const logger = new Logger('test-request-id');
    const error = new Error('Test error');
    logger.error('Error occurred', error);

    expect(consoleErrorSpy).toHaveBeenCalled();
    const logCall = consoleErrorSpy.mock.calls[0][0];
    const logEntry = JSON.parse(logCall);
    expect(logEntry.level).toBe('error');
    expect(logEntry.error.message).toBe('Test error');
  });

  it('should log tool calls', () => {
    const logger = new Logger('test-request-id');
    logger.toolCall('test_tool', { arg: 'value' }, 123);

    expect(consoleLogSpy).toHaveBeenCalled();
    const logCall = consoleLogSpy.mock.calls[0][0];
    const logEntry = JSON.parse(logCall);
    expect(logEntry.tool_name).toBe('test_tool');
    expect(logEntry.duration_ms).toBe(123);
  });

  it('should generate request IDs', () => {
    const id1 = generateRequestId();
    const id2 = generateRequestId();

    expect(id1).toBeTruthy();
    expect(id2).toBeTruthy();
    expect(id1).not.toBe(id2);
  });
});

