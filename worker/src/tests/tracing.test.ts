/**
 * Tracing Tests
 */

import { describe, it, expect } from 'vitest';
import { Tracer } from '../utils/tracing';

describe('Tracer', () => {
  it('should create tracer with context', () => {
    const tracer = new Tracer('test-request-id', 'test-user-id', 'marketplace');
    const summary = tracer.getSummary();

    expect(summary.requestId).toBe('test-request-id');
    expect(summary.userId).toBe('test-user-id');
    expect(summary.agentType).toBe('marketplace');
  });

  it('should track spans', () => {
    const tracer = new Tracer('test-request-id');
    const span = tracer.startSpan('test-operation', { key: 'value' });

    expect(span.name).toBe('test-operation');
    expect(span.start).toBeGreaterThan(0);

    tracer.endSpan(span);

    expect(span.end).toBeGreaterThan(span.start);
    expect(span.duration).toBe(span.end! - span.start);
  });

  it('should trace async operations', async () => {
    const tracer = new Tracer('test-request-id');

    const result = await tracer.trace('test-operation', async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return 'success';
    });

    expect(result).toBe('success');

    const summary = tracer.getSummary();
    expect(summary.spans.length).toBe(1);
    expect(summary.spans[0].name).toBe('test-operation');
    expect(summary.spans[0].duration).toBeGreaterThan(0);
  });

  it('should track errors in spans', async () => {
    const tracer = new Tracer('test-request-id');

    await expect(
      tracer.trace('test-operation', async () => {
        throw new Error('Test error');
      })
    ).rejects.toThrow('Test error');

    const summary = tracer.getSummary();
    expect(summary.spans[0].error).toBeTruthy();
    expect(summary.spans[0].error!.message).toBe('Test error');
  });

  it('should calculate total duration', () => {
    const tracer = new Tracer('test-request-id');
    const span1 = tracer.startSpan('operation1');
    tracer.endSpan(span1);

    const span2 = tracer.startSpan('operation2');
    tracer.endSpan(span2);

    const totalDuration = tracer.getTotalDuration();
    expect(totalDuration).toBeGreaterThan(0);
  });

  it('should store metadata', () => {
    const tracer = new Tracer('test-request-id');
    tracer.setMetadata('key', 'value');

    const summary = tracer.getSummary();
    expect(summary.metadata?.key).toBe('value');
  });
});

