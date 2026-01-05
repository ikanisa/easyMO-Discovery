import { onCLS, onINP, onLCP, type Metric } from 'web-vitals';
import { MonitoringService } from './monitoring';

const RUM_ENDPOINT = import.meta.env.VITE_RUM_ENDPOINT;

// Performance budget thresholds (75th percentile targets from blueprint)
const BUDGETS = {
  LCP: 2500, // 2.5s in milliseconds
  INP: 200, // 200ms
  CLS: 0.1, // 0.1
};

/**
 * Sends Web Vitals metrics to RUM endpoint or monitoring service
 * Includes budget violation detection for alerting
 */
const sendMetric = (metric: Metric) => {
  const payload = {
    name: metric.name,
    value: metric.value,
    id: metric.id,
    path: window.location.pathname,
    timestamp: Date.now(),
    url: window.location.href,
    userAgent: navigator.userAgent,
    // Check if metric violates budget
    violatesBudget: false,
    budgetThreshold: null as number | null,
  };

  // Check budget violations
  if (metric.name === 'LCP' && metric.value > BUDGETS.LCP) {
    payload.violatesBudget = true;
    payload.budgetThreshold = BUDGETS.LCP;
  } else if (metric.name === 'INP' && metric.value > BUDGETS.INP) {
    payload.violatesBudget = true;
    payload.budgetThreshold = BUDGETS.INP;
  } else if (metric.name === 'CLS' && metric.value > BUDGETS.CLS) {
    payload.violatesBudget = true;
    payload.budgetThreshold = BUDGETS.CLS;
  }

  // Send to RUM endpoint if configured
  if (RUM_ENDPOINT) {
    try {
      // Use sendBeacon for reliable delivery (doesn't block page unload)
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      navigator.sendBeacon(RUM_ENDPOINT, blob);
      
      // Log budget violations for immediate alerting
      if (payload.violatesBudget) {
        console.warn(
          `⚠️ Budget violation: ${metric.name} = ${metric.value.toFixed(2)} ` +
          `(threshold: ${payload.budgetThreshold})`
        );
      }
    } catch (error) {
      console.error('Failed to send metric to RUM endpoint:', error);
      // Fallback to monitoring service
      MonitoringService.captureMessage(
        `WebVitals ${metric.name}: ${metric.value.toFixed(2)}${payload.violatesBudget ? ' (BUDGET VIOLATION)' : ''}`,
        payload.violatesBudget ? 'warning' : 'info'
      );
    }
    return;
  }

  // Fallback: send to monitoring service
  MonitoringService.captureMessage(
    `WebVitals ${metric.name}: ${metric.value.toFixed(2)}${payload.violatesBudget ? ' (BUDGET VIOLATION)' : ''}`,
    payload.violatesBudget ? 'warning' : 'info'
  );
};

/**
 * Initialize Web Vitals tracking
 * Tracks LCP, INP, and CLS as specified in the blueprint
 */
export const initVitals = () => {
  try {
    // Track Largest Contentful Paint
    onLCP(sendMetric);
    
    // Track Interaction to Next Paint
    onINP(sendMetric);
    
    // Track Cumulative Layout Shift
    onCLS(sendMetric);

    if (RUM_ENDPOINT) {
      console.log('✅ RUM endpoint configured:', RUM_ENDPOINT);
    } else {
      console.log('ℹ️ RUM endpoint not configured. Set VITE_RUM_ENDPOINT for field data collection.');
    }
  } catch (error) {
    MonitoringService.captureException(error, { context: 'WebVitalsInit' });
  }
};
