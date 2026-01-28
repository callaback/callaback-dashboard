//app/layout.tsx

export const dynamic = 'force-static'


import React from "react"
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import { VersionBadge } from '@/components/version-badge'
import './globals.css'
import { SpeedInsights } from "@vercel/speed-insights/next"

const geist = Geist({ 
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-geist',
});

const geistMono = Geist_Mono({ 
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-geist-mono',
});


// SEO
const siteConfig = {
  name: 'Callaback',
  title: 'Callaback.com - Professional Call Fielding & Communication Dashboard',
  description: 'Advanced business communication platform with professional call fielding services, integrated phone dialer, intelligent contact management, real-time sync chat, lead tracking, and comprehensive CRM tools. Streamline your business communications with (844) 407-3511.',
  url: 'https://callaback.com',
  phone: '(844) 407-3511',
  phoneRaw: '+18444073511',
  ogImage: 'https://callaback.com/og-image.png',
  creator: '@lightfighter719',
  keywords: [
    'call fielding services',
    'business phone system',
    'contact management',
    'CRM dashboard',
    'lead tracking',
    'professional communication',
    'phone dialer',
    'sync chat',
    'business communications',
    'virtual receptionist',
    'call management',
    'customer relationship management',
    'business automation',
    'sales pipeline',
    'contact center',
    'cloud phone system',
    'VoIP services',
    'business messaging',
    'team collaboration',
    'appointment scheduling',
  ],
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
}

export const metadata: Metadata = {
  // metadata
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  authors: [
    { 
      name: siteConfig.name,
      url: siteConfig.url,
    }
  ],
  creator: siteConfig.name,
  publisher: siteConfig.name,
  generator: 'Next.js',
  
  // robots.txt
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  
  // Open Graph
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteConfig.url,
    title: siteConfig.title,
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: `${siteConfig.name} - Professional Call Fielding Dashboard`,
        type: 'image/png',
      },
      {
        url: `${siteConfig.url}/og-square.png`,
        width: 1200,
        height: 1200,
        alt: `${siteConfig.name} Logo`,
        type: 'image/png',
      },
    ],
  },
  
  // x.com
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.title,
    description: siteConfig.description,
    creator: siteConfig.creator,
    site: siteConfig.creator,
    images: [siteConfig.ogImage],
  },
  

  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
      {
        url: '/favicon-16x16.png',
        sizes: '16x16',
        type: 'image/png',
      },
      {
        url: '/favicon-32x32.png',
        sizes: '32x32',
        type: 'image/png',
      },
    ],
    apple: [
      {
        url: '/apple-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
    other: [
      {
        rel: 'mask-icon',
        url: '/safari-pinned-tab.svg',
        color: '#3b82f6',
      },
    ],
  },
  
  // Manifest
  manifest: '/site.webmanifest',
  
  // App Links
  applicationName: siteConfig.name,
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: siteConfig.name,
  },
  

  formatDetection: {
    telephone: true,
    date: true,
    address: true,
    email: true,
  },
  

  category: 'business',
  classification: 'Business Communication Software',
  

  verification: {
    google: 'your-google-verification-code',
    yandex: 'your-yandex-verification-code',
   
  },
  

  alternates: {
    canonical: siteConfig.url,
    languages: {
      'en-US': siteConfig.url,
    },
  },
  

  other: {
    'msapplication-TileColor': '#3b82f6',
    'theme-color': '#ffffff',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Structured Data (JSON-LD)
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      // Organization
      {
        '@type': 'Organization',
        '@id': `${siteConfig.url}/#organization`,
        name: siteConfig.name,
        url: siteConfig.url,
        logo: {
          '@type': 'ImageObject',
          url: `${siteConfig.url}/logo.png`,
          width: 512,
          height: 512,
        },
        contactPoint: {
          '@type': 'ContactPoint',
          telephone: siteConfig.phoneRaw,
          contactType: 'customer service',
          areaServed: 'US',
          availableLanguage: ['English'],
        },
        sameAs: [
          'https://twitter.com/callaback',
          'https://www.linkedin.com/company/callaback',
          'https://www.facebook.com/callaback',
        ],
      },
      // Website
      {
        '@type': 'WebSite',
        '@id': `${siteConfig.url}/#website`,
        url: siteConfig.url,
        name: siteConfig.name,
        description: siteConfig.description,
        publisher: {
          '@id': `${siteConfig.url}/#organization`,
        },
        inLanguage: 'en-US',
      },
      // WebApplication
      {
        '@type': 'WebApplication',
        name: siteConfig.name,
        url: siteConfig.url,
        description: siteConfig.description,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web Browser',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
        featureList: [
          'Professional Call Fielding',
          'Phone Dialer',
          'Contact Management',
          'Real-time Sync Chat',
          'Lead Tracking',
          'CRM Integration',
          'File Management',
          'API Integration',
          'Appointment Scheduling',
        ],
      },
      // LocalBusiness
      {
        '@type': 'LocalBusiness',
        '@id': `${siteConfig.url}/#localbusiness`,
        name: siteConfig.name,
        image: siteConfig.ogImage,
        telephone: siteConfig.phoneRaw,
        url: siteConfig.url,
        priceRange: '$$',
        address: {
          '@type': 'PostalAddress',
          addressCountry: 'US',
        },
      },
      // Service
      {
        '@type': 'Service',
        serviceType: 'Business Communication Platform',
        provider: {
          '@id': `${siteConfig.url}/#organization`,
        },
        areaServed: {
          '@type': 'Country',
          name: 'United States',
        },
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: 'Communication Services',
          itemListElement: [
            {
              '@type': 'Offer',
              itemOffered: {
                '@type': 'Service',
                name: 'Call Fielding Services',
                description: 'Professional call handling and routing',
              },
            },
            {
              '@type': 'Offer',
              itemOffered: {
                '@type': 'Service',
                name: 'Contact Management',
                description: 'Comprehensive CRM and contact database',
              },
            },
            {
              '@type': 'Offer',
              itemOffered: {
                '@type': 'Service',
                name: 'Lead Tracking',
                description: 'Track and manage sales leads',
              },
            },
          ],
        },
      },
      // BreadcrumbList
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: siteConfig.url,
          },
        ],
      },
    ],
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        
   
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
        
    
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content={siteConfig.name} />
        
  
        <meta name="geo.region" content="US" />
        <meta name="geo.placename" content="United States" />
        
   
        <meta name="rating" content="General" />
        
        {/* Copyright */}
        <meta name="copyright" content={`© ${new Date().getFullYear()} ${siteConfig.name}. All rights reserved.`} />
      </head>
      <body className={`${geist.variable} ${geistMono.variable} font-sans antialiased`}>
                <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <VersionBadge
  version={
    process.env.VERCEL_DEPLOYMENT_ID?.slice(0, 7) ??
    process.env.VERCEL_BUILD_ID?.slice(0, 7) ??
    'local'
  }
/>

        </ThemeProvider>

        <Analytics />
        <SpeedInsights/>
      </body>
    </html>
  )
}
  
