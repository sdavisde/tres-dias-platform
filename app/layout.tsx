import type { Metadata } from 'next'
import { Fraunces, Source_Sans_3 } from 'next/font/google'
import './globals.css'
import Head from 'next/head'
import { SessionProvider } from '@/components/auth/session-provider'
import { QueryProvider } from '@/components/providers/query-provider'
import { Toastbox } from '@/components/toastbox'
import { Analytics } from '@vercel/analytics/next'

const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  variable: '--font-source-sans',
})

const fraunces = Fraunces({
  subsets: ['latin'],
  axes: ['opsz'],
  variable: '--font-fraunces',
})

// VERCEL_ENV is 'preview' for every non-production Vercel deployment (including
// custom environments). Preview builds get color-inverted icons so the beta tab
// is distinguishable from production. Icons live in /public rather than as
// app/ file conventions, since file-based icons override `metadata.icons`.
const isPreviewDeployment = process.env.VERCEL_ENV === 'preview'

const icons: Metadata['icons'] = isPreviewDeployment
  ? {
      icon: [
        { url: '/icons/preview/favicon.ico', sizes: '48x48' },
        {
          url: '/icons/preview/icon-96.png',
          type: 'image/png',
          sizes: '96x96',
        },
      ],
      apple: { url: '/icons/preview/apple-icon.png', sizes: '180x180' },
    }
  : {
      icon: [
        { url: '/favicon.ico', sizes: '48x48' },
        { url: '/icons/icon.svg', type: 'image/svg+xml' },
        { url: '/icons/icon-96.png', type: 'image/png', sizes: '96x96' },
      ],
      apple: { url: '/icons/apple-icon.png', sizes: '180x180' },
    }

export const metadata: Metadata = {
  title: 'Dusty Trails Tres Dias',
  description:
    'Being like-minded, having the same love, being one in spirit and of one mind. Phil 2:2',
  icons,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${sourceSans.variable} ${fraunces.variable}`}>
      <Head>
        <meta name="apple-mobile-web-app-title" content="DTTD" />
      </Head>
      <body className="font-sans antialiased">
        <QueryProvider>
          <SessionProvider>
            <Analytics />
            {children}
            <Toastbox />
          </SessionProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
