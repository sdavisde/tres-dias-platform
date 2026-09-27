import * as Sentry from '@sentry/nextjs'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Next.js and Sentry each attach per-request 'close' listeners to the
    // response (~12 total), tripping Node's default limit of 10. They're
    // released with the response, so it isn't a leak.
    const { EventEmitter } = await import('node:events')
    EventEmitter.defaultMaxListeners = 20

    await import('./sentry.server.config')
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

export const onRequestError = Sentry.captureRequestError
