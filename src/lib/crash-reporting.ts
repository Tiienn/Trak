import * as Sentry from '@sentry/react-native';

let initialized = false;

function originOnly(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  try {
    return new URL(value).origin;
  } catch {
    return undefined;
  }
}

/**
 * Starts release crash reporting only when a DSN is configured. Trak handles
 * health-adjacent data, so request bodies, user identity, console breadcrumbs,
 * screenshots, view hierarchies, tracing, and replay are intentionally omitted.
 */
export function initializeCrashReporting() {
  if (initialized) return;
  initialized = true;

  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();
  const explicitlyDisabled = process.env.EXPO_PUBLIC_SENTRY_ENABLED === 'false';
  Sentry.init({
    dsn,
    enabled: Boolean(dsn) && !explicitlyDisabled && !__DEV__,
    sendDefaultPii: false,
    attachScreenshot: false,
    attachViewHierarchy: false,
    enableCaptureFailedRequests: false,
    tracesSampleRate: 0,
    profilesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    maxBreadcrumbs: 50,
    beforeBreadcrumb(breadcrumb) {
      const category = breadcrumb.category ?? '';
      if (category === 'console' || category.startsWith('ui.') || category === 'touch') {
        return null;
      }

      if (['fetch', 'http', 'xhr'].includes(category) && breadcrumb.data) {
        const origin = originOnly(breadcrumb.data.url);
        breadcrumb.data = origin ? { method: breadcrumb.data.method, url: origin } : {};
        delete breadcrumb.message;
        return breadcrumb;
      }

      delete breadcrumb.data;
      delete breadcrumb.message;
      return breadcrumb;
    },
    beforeSend(event) {
      delete event.user;
      delete event.request;
      delete event.extra;
      delete event.message;
      delete event.logentry;
      event.exception?.values?.forEach((exception) => {
        exception.value = 'Application error';
      });
      return event;
    },
  });
}
