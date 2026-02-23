/**
 * Root Layout
 * 
 * Main application layout with providers and global styles.
 */
import type { Metadata, Viewport } from 'next';
import { Providers } from '@/components/providers';
import './globals.css';

export const metadata: Metadata = {
    title: 'NESSO Botanica | Natural & Essential Oils.',
    description: 'Natural & Essential Oils.',
    keywords: ['botanical', 'knowledge graph', 'AI', 'data visualization', 'plants'],
    authors: [{ name: 'NESSO Botanica Team' }],
    icons: {
        icon: '/logo.png',
    },
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    themeColor: [
        { media: '(prefers-color-scheme: light)', color: '#F8FAFC' },
        { media: '(prefers-color-scheme: dark)', color: '#0A0C10' },
    ],
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            </head>
            <body className="antialiased">
                <Providers>
                    {children}
                </Providers>
            </body>
        </html>
    );
}
