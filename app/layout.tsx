import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'JWT Authentication App',
  description: 'A simple JWT authentication app built with Next.js',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning={true} className="font-sans">
        {children}
        <Toaster 
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#fff',
              color: '#363636',
              padding: '16px',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            },
            success: {
              iconTheme: {
                primary: '#4CAF50',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#f44336',
                secondary: '#fff',
              },
            },
          }}
        />
      </body>
    </html>
  );
} 