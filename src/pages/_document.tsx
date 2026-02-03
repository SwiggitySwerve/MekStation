import React from 'react';
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document(): React.ReactElement {
  return (
    <Html lang="en">
      <Head>
        {/* Splash Screen - Prevents white flash on load */}
        <style dangerouslySetInnerHTML={{__html: `
          #__splash {
            position: fixed;
            inset: 0;
            background: #0f172a;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 99999;
            transition: opacity 0.3s ease-out;
          }
          #__splash.fade-out {
            opacity: 0;
            pointer-events: none;
          }
          #__splash.hidden {
            display: none;
          }
          #__splash-spinner {
            width: 48px;
            height: 48px;
            border: 3px solid #1e293b;
            border-top-color: #f59e0b;
            border-radius: 50%;
            animation: splash-spin 0.8s linear infinite;
          }
          #__splash-text {
            margin-top: 16px;
            color: #94a3b8;
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 14px;
            letter-spacing: 0.05em;
          }
          @keyframes splash-spin {
            to { transform: rotate(360deg); }
          }
          /* CSS fallback: auto-hide after 5s even if JS fails */
          @keyframes splash-fallback-hide {
            0%, 90% { opacity: 1; }
            100% { opacity: 0; pointer-events: none; }
          }
          #__splash {
            animation: splash-fallback-hide 5s ease-out forwards;
          }
        `}} />

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
        <div id="__splash">
          <div id="__splash-spinner" />
          <div id="__splash-text">Loading MekStation...</div>
        </div>
        <Main />
        <NextScript />
        <script dangerouslySetInnerHTML={{__html: `
          (function() {
            var splash = document.getElementById('__splash');
            if (!splash) return;
            function hideSplash() {
              splash.classList.add('fade-out');
              setTimeout(function() { splash.classList.add('hidden'); }, 300);
            }
            if (document.readyState === 'complete') {
              hideSplash();
            } else {
              window.addEventListener('load', hideSplash);
            }
          })();
        `}} />
      </body>
    </Html>
  )
}
