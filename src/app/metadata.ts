import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ChatGenius',
  description: 'Next generation chat platform',
  icons: {
    icon: '/favicon.ico',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: '/manifest.json',
  openGraph: {
    title: 'ChatGenius',
    description: 'Next generation chat platform',
    type: 'website',
  },
}; 