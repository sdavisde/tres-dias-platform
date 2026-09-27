// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'
import { sentryOptions } from '@/lib/sentry'

Sentry.init({
  ...sentryOptions,
  integrations: [
    // Report every server-side `logger.error` / `logger.fatal` as a Sentry
    // event (with the logged `err` when there is one). Server actions return
    // their failures as Results instead of throwing, so without this Sentry
    // would never see them.
    Sentry.pinoIntegration({
      error: { levels: ['error', 'fatal'] },
      log: { levels: [] },
    }),
  ],
})
