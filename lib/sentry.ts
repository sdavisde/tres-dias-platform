/**
 * Options shared by the client, server and edge `Sentry.init` calls.
 *
 * Only production builds report, so local `yarn dev` errors stay out of the
 * project. Vercel exposes its environment ('production' | 'preview') to the
 * browser as NEXT_PUBLIC_VERCEL_ENV, which keeps preview and production
 * events separate.
 */
export const sentryOptions = {
  dsn: 'https://5675e62079634277450530edbdb25073@o4512153973424128.ingest.us.sentry.io/4512153984892928',
  enabled: process.env.NODE_ENV === 'production',
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? 'local',
  tracesSampleRate: 0.4,
  dataCollection: {
    // To disable sending user data and HTTP bodies, uncomment the lines below. For more info visit:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#dataCollection
    // userInfo: false,
    // httpBodies: [],
  },
}
