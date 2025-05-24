import type { AppProps } from 'next/app'
import { AuthProvider } from '@/contexts/AuthContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import '../styles/globals.css';
import { ThemeProvider } from '@/contexts/ThemeContext'; // Add this import
import '../styles/mobile-enhancements.css';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Toaster } from "@/components/ui/toaster"
import { useEffect, useState } from 'react';
import Head from 'next/head';

export default function App({ Component, pageProps }: AppProps) {
  // const [mounted, setMounted] = useState(false); // ThemeProvider now handles this

  // useEffect(() => { // ThemeProvider now handles this
  //   const root = document.documentElement;
  //   const computedStyle = getComputedStyle(root);
  //   const colorScheme = computedStyle.getPropertyValue('--mode').trim().replace(/"/g, '');
  //   if (colorScheme === 'dark') {
  //     document.documentElement.classList.add('dark');
  //   } else {
  //     document.documentElement.classList.add('light');
  //   }
  //   setMounted(true);
  // }, []);

  // Prevent flash while theme loads
  // if (!mounted) { // ThemeProvider now handles this
  //   return null;
  // }

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, minimum-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-touch-fullscreen" content="yes" />
      </Head>
      <div className="min-h-screen mobile-safe-top mobile-safe-bottom">
        <ThemeProvider> {/* Add ThemeProvider here */}
          <AuthProvider>
            <NotificationProvider>
              <ProtectedRoute>
                <Component {...pageProps} />
              </ProtectedRoute>
              <Toaster />
            </NotificationProvider>
          </AuthProvider>
        </ThemeProvider> {/* Close ThemeProvider here */}
      </div>
    </>
  )
}