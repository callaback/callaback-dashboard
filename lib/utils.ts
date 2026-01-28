import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Phone number formatting
export function formatPhoneNumber(phone?: string): string {
  if (!phone || phone.trim() === '') return 'Unknown'
  
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '')
  
  if (cleaned.length === 0) return phone // Return original if no digits
  
  // Handle US numbers (country code 1)
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    const match = cleaned.match(/^1(\d{3})(\d{3})(\d{4})$/)
    if (match) return `+1 (${match[1]}) ${match[2]}-${match[3]}`
  }
  
  // Handle standard US numbers
  if (cleaned.length === 10) {
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/)
    if (match) return `(${match[1]}) ${match[2]}-${match[3]}`
  }
  
  // Handle shorter numbers
  if (cleaned.length === 7) {
    const match = cleaned.match(/^(\d{3})(\d{4})$/)
    if (match) return `${match[1]}-${match[2]}`
  }
  
  // For international numbers, try to format
  if (cleaned.length > 10) {
    // Extract country code (first 1-3 digits)
    const countryCodeMatch = cleaned.match(/^(\d{1,3})(\d{4,})$/)
    if (countryCodeMatch) {
      const [, countryCode, localNumber] = countryCodeMatch
      
      // Try to format local number based on length
      if (localNumber.length === 10) {
        const localMatch = localNumber.match(/^(\d{3})(\d{3})(\d{4})$/)
        if (localMatch) return `+${countryCode} (${localMatch[1]}) ${localMatch[2]}-${localMatch[3]}`
      } else if (localNumber.length >= 6) {
        // Generic formatting for other lengths
        return `+${countryCode} ${localNumber.replace(/(\d{3})(?=\d)/g, '$1 ')}`
      }
    }
  }
  
  // Return with basic formatting if no special case matches
  if (cleaned.length >= 4) {
    // Add spaces every 3 digits
    const formatted = cleaned.replace(/(\d{3})(?=\d)/g, '$1 ')
    return cleaned.length > 10 ? `+${formatted}` : formatted
  }
  
  // Return original if we can't format
  return phone
}

// Time ago formatting
export function formatTimeAgo(dateStr?: string): string {
  if (!dateStr) return '--'
  
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return 'Invalid date'
    
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSecs = Math.floor(diffMs / 1000)
    const diffMins = Math.floor(diffSecs / 60)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)
    const diffWeeks = Math.floor(diffDays / 7)
    const diffMonths = Math.floor(diffDays / 30)
    const diffYears = Math.floor(diffDays / 365)
    
    if (diffSecs < 10) return 'Just now'
    if (diffSecs < 60) return `${diffSecs}s ago`
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    if (diffWeeks < 4) return `${diffWeeks}w ago`
    if (diffMonths < 12) return `${diffMonths}mo ago`
    return `${diffYears}y ago`
  } catch {
    return '--'
  }
}

// Date/time formatting
export function formatDateTime(
  dateStr?: string, 
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateStr) return '--'
  
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return 'Invalid date'
    
    const defaultOptions: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }
    
    return date.toLocaleDateString('en-US', { ...defaultOptions, ...options })
  } catch {
    return '--'
  }
}

// Short date format (Jan 27)
export function formatShortDate(dateStr?: string): string {
  if (!dateStr) return '--'
  
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return 'Invalid date'
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return '--'
  }
}

// Duration formatting
export function formatDuration(seconds?: number): string {
  if (!seconds || seconds === 0 || isNaN(seconds)) return '--'
  
  if (seconds < 60) {
    return `${seconds}s`
  }
  
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  
  if (mins < 60) {
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
  }
  
  const hours = Math.floor(mins / 60)
  const remainingMins = mins % 60
  
  if (remainingMins > 0) {
    return `${hours}h ${remainingMins}m`
  }
  
  return `${hours}h`
}

// Text truncation
export function truncateText(text: string, maxLength: number, addEllipsis: boolean = true): string {
  if (!text || text.length <= maxLength) return text
  
  const truncated = text.substring(0, maxLength)
  return addEllipsis ? `${truncated}...` : truncated
}

// Generate initials from name
export function generateInitials(name?: string): string {
  if (!name || name.trim() === '') return '??'
  
  const trimmed = name.trim()
  const parts = trimmed.split(/\s+/)
  
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase()
  }
  
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

// Capitalize first letter
export function capitalize(str: string): string {
  if (!str || str.trim() === '') return str
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

// Parse tags from comma-separated string
export function parseTags(tagsString: string): string[] {
  if (!tagsString || tagsString.trim() === '') return []
  
  return tagsString
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0)
    .map(capitalize)
}

// Format currency
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `$${amount.toFixed(2)}`
  }
}

// Get color based on status
export function getStatusColor(status: string): {
  bg: string
  text: string
  border: string
} {
  const statusLower = status.toLowerCase()
  
  if (statusLower.includes('completed') || statusLower.includes('delivered') || statusLower.includes('success')) {
    return {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-800 dark:text-green-400',
      border: 'border-green-300 dark:border-green-800',
    }
  }
  
  if (statusLower.includes('pending') || statusLower.includes('progress') || statusLower.includes('scheduled')) {
    return {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-800 dark:text-yellow-400',
      border: 'border-yellow-300 dark:border-yellow-800',
    }
  }
  
  if (statusLower.includes('failed') || statusLower.includes('error') || statusLower.includes('cancelled')) {
    return {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-800 dark:text-red-400',
      border: 'border-red-300 dark:border-red-800',
    }
  }
  
  if (statusLower.includes('new') || statusLower.includes('active')) {
    return {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-800 dark:text-blue-400',
      border: 'border-blue-300 dark:border-blue-800',
    }
  }
  
  // Default/muted
  return {
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-800 dark:text-gray-300',
    border: 'border-gray-300 dark:border-gray-700',
  }
}

// Safe parse JSON
export function safeParseJSON<T>(jsonString: string, fallback: T): T {
  try {
    return JSON.parse(jsonString)
  } catch {
    return fallback
  }
}

// Debounce function
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// Throttle function
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

// Generate random ID
export function generateId(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Check if value is empty
export function isEmpty(value: any): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}

// Deep clone object
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(item => deepClone(item)) as T
  const cloned: any = {}
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key])
    }
  }
  return cloned
}
