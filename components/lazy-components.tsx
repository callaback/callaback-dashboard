'use client'

import { lazy, Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

// Lazy load heavy components
const InteractionsPanel = lazy(() => import('@/components/interactions-panel'))
const CallbackCalendar = lazy(() => import('@/components/callback-calendar').then(module => ({ default: module.CallbackCalendar })))
const StorageDropzone = lazy(() => import('@/components/storage-dropezone'))

export function LazyInteractionsPanel(props: any) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <InteractionsPanel {...props} />
    </Suspense>
  )
}

export function LazyCallbackCalendar(props: any) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <CallbackCalendar {...props} />
    </Suspense>
  )
}

export function LazyStorageDropzone(props: any) {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <StorageDropzone {...props} />
    </Suspense>
  )
}
