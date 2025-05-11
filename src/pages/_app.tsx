import type { AppProps } from 'next/app'
import { AuthProvider } from '@/contexts/AuthContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import '../styles/globals.css';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Toaster } from "@/components/ui/toaster"
import { useEffect, useState } from 'react';
import Head from 'next/head';

export default function App({ Component, pageProps }: AppProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);
    const colorScheme = computedStyle.getPropertyValue('--mode').trim().replace(/"/g, '');
    if (colorScheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.add('light');
    }
    setMounted(true);
  }, []);

  // Prevent flash while theme loads
  if (!mounted) {
    return null;
  }

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover" />
        <meta name="theme-color" content="#ffffff" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="format-detection" content="telephone=no" />
      </Head>
      <div className="min-h-screen mobile-safe-top mobile-safe-bottom">
        <AuthProvider>
          <NotificationProvider>
            <ProtectedRoute>
              <Component {...pageProps} />
            </ProtectedRoute>
            <Toaster />
          </NotificationProvider>
        </AuthProvider>
      </div>
    </>
  )
}