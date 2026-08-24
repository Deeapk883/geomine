import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import './globals.css';
import React from 'react';

import type { Viewport } from 'next';

export const metadata = {
  title: 'GeoMine AI - Open-Pit Mining Detection Dashboard',
  description: 'AI-powered satellite imagery mining detection and geological material analysis.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full w-full overflow-hidden">
      <body className="bg-dark-900 text-slate-100 antialiased h-full w-full overflow-hidden fixed inset-0 overscroll-none select-none">
        {children}
      </body>
    </html>
  );
}
