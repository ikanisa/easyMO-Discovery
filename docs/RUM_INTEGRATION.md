# Real User Monitoring (RUM) Integration

This document describes how to configure Real User Monitoring for field data collection of Core Web Vitals.

## Overview

RUM collects performance metrics from real users in production, enabling:
- **Field data** (real user experience) vs. lab data (Lighthouse)
- **75th percentile** tracking for Core Web Vitals
- **Budget violation** alerting
- **Trend analysis** over time

## Configuration

### 1. Set Environment Variable

Set `VITE_RUM_ENDPOINT` in your Cloudflare Pages environment variables:

```bash
# Production
VITE_RUM_ENDPOINT=https://your-rum-endpoint.com/api/vitals

# Preview/Staging
VITE_RUM_ENDPOINT=https://staging-rum-endpoint.com/api/vitals
```

### 2. RUM Endpoint Requirements

Your endpoint should accept POST requests with JSON payload:

```typescript
interface MetricPayload {
  name: 'LCP' | 'INP' | 'CLS';
  value: number;
  id: string;
  path: string;
  timestamp: number;
  url: string;
  userAgent: string;
  violatesBudget?: boolean;
  budgetThreshold?: number | null;
}
```

**Example Cloudflare Worker endpoint:**

```typescript
// worker/rum-endpoint.ts
export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const payload = await request.json();
    
    // Store in analytics (D1, KV, or external service)
    await ANALYTICS.write({
      metric: payload.name,
      value: payload.value,
      path: payload.path,
      timestamp: payload.timestamp,
      violatesBudget: payload.violatesBudget || false,
    });

    // Alert on budget violations
    if (payload.violatesBudget) {
      await sendAlert({
        metric: payload.name,
        value: payload.value,
        threshold: payload.budgetThreshold,
        path: payload.path,
      });
    }

    return new Response('OK', { status: 200 });
  },
};
```

## Supported RUM Services

### Option 1: Cloudflare Web Analytics

Free tier available. Configure in Cloudflare Dashboard:
1. Go to Analytics & Logs > Web Analytics
2. Add site
3. Copy JavaScript snippet
4. Use custom endpoint: `https://cloudflareinsights.com/cdn-cgi/rum`

### Option 2: Sentry Performance Monitoring

```bash
npm install @sentry/react @sentry/web-vitals
```

Configure in your app:

```typescript
import * as Sentry from '@sentry/react';
import { browserTracingIntegration } from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [
    browserTracingIntegration(),
  ],
  tracesSampleRate: 1.0,
});
```

### Option 3: Custom Endpoint (Cloudflare Worker/D1)

Use the example worker above to store metrics in D1 or KV.

## Metrics Collected

The following Core Web Vitals are automatically tracked:

1. **LCP (Largest Contentful Paint)**
   - Budget: ≤ 2.5s (75th percentile)
   - Measures loading performance

2. **INP (Interaction to Next Paint)**
   - Budget: ≤ 200ms (75th percentile)
   - Measures interactivity

3. **CLS (Cumulative Layout Shift)**
   - Budget: ≤ 0.1 (75th percentile)
   - Measures visual stability

## Budget Violations

When a metric exceeds its budget threshold, the payload includes:

```json
{
  "violatesBudget": true,
  "budgetThreshold": 2500,
  "name": "LCP",
  "value": 3200
}
```

Use this to:
- **Alert** engineering team
- **Track** regressions
- **Prioritize** performance work

## Querying Field Data

### Calculate 75th Percentile

```sql
-- Example D1 query
SELECT 
  metric_name,
  PERCENTILE(value, 0.75) as p75,
  AVG(value) as avg,
  COUNT(*) as samples
FROM web_vitals
WHERE 
  timestamp > datetime('now', '-7 days')
  AND path = '/'
GROUP BY metric_name;
```

### Compare to Budgets

```sql
SELECT 
  metric_name,
  PERCENTILE(value, 0.75) as p75,
  CASE 
    WHEN metric_name = 'LCP' THEN 2500
    WHEN metric_name = 'INP' THEN 200
    WHEN metric_name = 'CLS' THEN 0.1
  END as budget,
  CASE 
    WHEN PERCENTILE(value, 0.75) > CASE 
      WHEN metric_name = 'LCP' THEN 2500
      WHEN metric_name = 'INP' THEN 200
      WHEN metric_name = 'CLS' THEN 0.1
    END THEN 'FAIL'
    ELSE 'PASS'
  END as status
FROM web_vitals
WHERE timestamp > datetime('now', '-7 days')
GROUP BY metric_name;
```

## Privacy & Compliance

RUM data collection respects user privacy:
- **No PII** collected (only anonymous metrics)
- **No cookies** used
- **Aggregated** data only
- **User consent** not required for anonymous metrics

For GDPR compliance, consider:
- Adding privacy notice about performance monitoring
- Providing opt-out mechanism
- Anonymizing IP addresses if collected

## Testing

### Local Testing

```bash
# Set local endpoint for testing
VITE_RUM_ENDPOINT=http://localhost:8787/api/vitals npm run dev
```

### Verify Metrics Are Sent

1. Open DevTools > Network tab
2. Filter by "beacon" or your RUM endpoint
3. Trigger page navigation/interaction
4. Verify POST requests are sent

### Check Console Logs

When `VITE_RUM_ENDPOINT` is configured, you'll see:
```
✅ RUM endpoint configured: https://your-endpoint.com/api/vitals
```

When not configured:
```
ℹ️ RUM endpoint not configured. Set VITE_RUM_ENDPOINT for field data collection.
```

## Troubleshooting

### Metrics Not Sending

1. Check `VITE_RUM_ENDPOINT` is set correctly
2. Verify endpoint accepts POST requests
3. Check CORS headers if cross-origin
4. Verify `navigator.sendBeacon` is supported

### Budget Violations Not Detected

1. Check budget thresholds in `services/vitals.ts`
2. Verify endpoint receives `violatesBudget` flag
3. Check alerting system is configured

## Documentation

- [Web Vitals Library](https://github.com/GoogleChrome/web-vitals)
- [Cloudflare Web Analytics](https://developers.cloudflare.com/analytics/web-analytics/)
- [Sentry Performance](https://docs.sentry.io/product/performance/)
- [PWA Blueprint](./pwa-world-class-blueprint-gap-analysis.md)

