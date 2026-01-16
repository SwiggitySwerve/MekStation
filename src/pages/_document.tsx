import React from 'react';
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document(): React.ReactElement {
  return (
    <Html lang="en">
      <Head>
        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* Favicon */}
        <link rel="icon" href="/icons/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />

        {/* Theme Color */}
        <meta name="theme-color" content="#00bfff" />

        {/* PWA Meta Tags */}
        <meta name="application-name" content="MekStation" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="MekStation" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/* Viewport */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
