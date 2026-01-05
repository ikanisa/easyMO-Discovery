import { onCLS, onINP, onLCP } from 'web-vitals';
import { MonitoringService } from './monitoring';

const RUM_ENDPOINT = import.meta.env.VITE_RUM_ENDPOINT;

const sendMetric = (metric: { name: string; value: number; id: string }) => {
  const payload = {
    name: metric.name,
    value: metric.value,
    id: metric.id,
    path: window.location.pathname,
  };

  if (RUM_ENDPOINT) {
    navigator.sendBeacon(RUM_ENDPOINT, JSON.stringify(payload));
    return;
  }

  MonitoringService.captureMessage(`WebVitals ${metric.name}: ${metric.value.toFixed(2)}`, 'info');
};

export const initVitals = () => {
  try {
    onCLS(sendMetric);
    onLCP(sendMetric);
    onINP(sendMetric);
  } catch (error) {
    MonitoringService.captureException(error, { context: 'WebVitalsInit' });
  }
};
