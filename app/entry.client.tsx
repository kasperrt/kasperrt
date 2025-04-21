import * as Sentry from '@sentry/react';
import { StrictMode, startTransition } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { HydratedRouter } from 'react-router/dom';

Sentry.init({
  dsn: 'https://096dd02932550ed02dc1b09c73a96e1e@o4509193347203072.ingest.de.sentry.io/4509193348710480',
  tracesSampleRate: 0.1,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.captureConsoleIntegration({ levels: ['error'] }),
    Sentry.extraErrorDataIntegration(),
    Sentry.httpClientIntegration(),
  ],
});

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <HydratedRouter />
    </StrictMode>,
  );
});
