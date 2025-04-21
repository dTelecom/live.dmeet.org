export const dynamic = "force-dynamic";

import DynamicAppWrapper from '@/components/DynamicAppWrapper';
import "@dtelecom/components-styles";
import "@dtelecom/components-styles/prefabs";
import "@/styles/globals.css";
import React from 'react';
import { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL("https://live.dmeet.org"),
  title: 'dMeet | Livestream',
  description: 'A free, open-source web app for livestreaming — join streams or start your own effortlessly.',
  openGraph: {
    title: 'dMeet | Livestream',
    description: 'A free, open-source web app for livestreaming — join streams or start your own effortlessly.',
    siteName: 'dMeet | Livestream',
    images: ["/og.png"],
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
    <body className={inter.className}>
    <DynamicAppWrapper>
      {children}
    </DynamicAppWrapper>
    </body>
    </html>
  );
}
