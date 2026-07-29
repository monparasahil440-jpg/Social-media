/**
 * Content sanitization utilities to prevent XSS attacks
 * Basic HTML sanitization for user-generated content
 */

/**
 * Sanitize HTML content by removing potentially dangerous tags and attributes
 * This is a basic sanitizer - for production, consider using a library like DOMPurify
 */
export function sanitizeHTML(html: string): string {
  if (!html) return html

  // Remove script tags and their content
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')

  // Remove dangerous event handlers (onclick, onerror, etc.)
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')

  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '')

  // Remove data: protocol (except for images)
  sanitized = sanitized.replace(/data:(?!image\/)/gi, '')

  // Remove iframe, object, embed tags
  sanitized = sanitized.replace(/<(iframe|object|embed)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi, '')

  // Remove style tags (can contain malicious code)
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')

  return sanitized
}

/**
 * Escape HTML entities in plain text to prevent XSS
 * Use this for content that should be displayed as plain text
 */
export function escapeHTML(text: string): string {
  if (!text) return text

  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }

  return text.replace(/[&<>"']/g, (char) => map[char])
}

/**
 * Sanitize user input for display
 * For posts, comments, bios - use escapeHTML to render as plain text
 * For content that needs basic HTML formatting, use sanitizeHTML
 */
export function sanitizeUserContent(content: string, allowHTML: boolean = false): string {
  if (!content) return content

  if (allowHTML) {
    return sanitizeHTML(content)
  }

  return escapeHTML(content)
}

/**
 * Validate and sanitize URL
 */
export function sanitizeURL(url: string): string {
  if (!url) return url

  try {
    const parsed = new URL(url)
    // Only allow http and https protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return ''
    }
    return url
  } catch {
    return ''
  }
}
