import { callBackend } from './api';

export const logAgentEvent = async (event_type: string, metadata?: Record<string, unknown>) => {
  try {
    await callBackend({
      action: 'create_request',
      event_type,
      metadata: metadata || {},
    });
  } catch {
    // Telemetry is best-effort
  }
};

