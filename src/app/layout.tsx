/**
 * Root Layout
 * 
 * Main application layout with providers and global styles.
 */
import type { Metadata } from 'next';
import { Providers } from '@/components/providers';
import './globals.css';

export const metadata: Metadata = {
    title: 'Neural Nexus | Knowledge Graph Platform',
    description: 'Enterprise-grade knowledge extraction and visualization platform',
    keywords: ['knowledge graph', 'AI', 'data visualization', 'graph database'],
    authors: [{ name: 'Neural Nexus Team' }],
    viewport: 'width=device-width, initial-scale=1',
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
