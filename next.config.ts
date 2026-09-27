import { withSentryConfig } from '@sentry/nextjs/config'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // todo: flip this on for performance benefits after understanding the diffs
  cacheComponents: false,
  experimental: {
    // How long the client router reuses a prefetched or visited segment
    // before asking the server again. Server actions that write call
    // updateTag / revalidatePath and router.refresh(), both of which drop
    // the router cache, so the viewer's own edits are never stale.
    staleTimes: { dynamic: 60, static: 300 },
  },
}

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: 'seans-projects',

  project: 'tres-dias-platform',

  // Only print logs for uploading source maps in CI
  silent: (process.env.CI ?? '') === '',

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Skip source maps on PR previews to cut build time; production builds still upload them.
  sourcemaps: {
    disable: process.env.VERCEL_ENV === 'preview',
  },

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: '/monitoring',
})
