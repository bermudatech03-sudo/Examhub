'use client'
import { ApolloProvider } from '@apollo/client'
import { Toaster } from 'react-hot-toast'
import { apolloClient } from '@/lib/apollo'
import './globals.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <title>ExamHub — Online Examination Platform</title>
        <meta name="description" content="Secure, scalable online examination platform" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&family=Barlow+Condensed:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-bg-primary text-text-primary font-sans antialiased">
        <ApolloProvider client={apolloClient}>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#181818',
                color: '#ffffff',
                border: '1px solid #2a2a2a',
                borderRadius: '8px'
              },
              success: {
                iconTheme: { primary: '#ff9900', secondary: '#0b0b0b' }
              }
            }}
          />
        </ApolloProvider>
      </body>
    </html>
  )
}
