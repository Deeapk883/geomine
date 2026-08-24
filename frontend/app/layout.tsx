import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import './globals.css';
import React from 'react';

export const metadata = {
  title: 'GeoMine AI - Open-Pit Mining Detection Dashboard',
  description: 'AI-powered satellite imagery mining detection and geological material analysis.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-dark-900 text-slate-100 antialiased h-screen w-screen overflow-hidden">
        {children}
      </body>
    </html>
  );
}
