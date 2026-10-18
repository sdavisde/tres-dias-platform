import sanitizeHtml from 'sanitize-html'
import { escape, isEmpty, isNil } from 'lodash'

/**
 * What the editor is allowed to produce. Anything else (scripts, styles,
 * iframes, event handlers, images from the clipboard) is stripped on save, so
 * the stored body is safe to render in the admin preview and in inboxes.
 */
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p',
    'br',
    'strong',
    'b',
    'em',
    'i',
    'u',
    's',
    'a',
    'ul',
    'ol',
    'li',
    'h2',
    'h3',
    'blockquote',
    'hr',
  ],
  allowedAttributes: { a: ['href', 'target', 'rel'] },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', {
      target: '_blank',
      rel: 'noopener noreferrer',
    }),
  },
}

export function sanitizeBody(html: string): string {
  return sanitizeHtml(html, SANITIZE_OPTIONS)
}

/** True when the body has no visible text (the editor's empty `<p></p>`). */
export function isBodyEmpty(html: string): boolean {
  return isEmpty(
    sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).trim()
  )
}

export { FIRST_NAME_FIELD } from './content-constants'
const FIRST_NAME_PATTERN = /\{\{\s*first_name\s*\}\}/g

/** Used when we don't know someone's first name. */
export const FIRST_NAME_FALLBACK = 'friend'

/** Placeholder the layout renders where each recipient's link goes. */
export const UNSUBSCRIBE_URL_PLACEHOLDER =
  'https://unsubscribe.invalid/__TOKEN__'

/**
 * Fills one recipient's copy of a rendered email: their first name (escaped)
 * and their own unsubscribe link.
 */
export function personalize(
  html: string,
  values: { firstName: string | null; unsubscribeUrl: string }
): string {
  const firstName =
    isNil(values.firstName) || values.firstName.trim() === ''
      ? FIRST_NAME_FALLBACK
      : values.firstName.trim()

  return html
    .replace(FIRST_NAME_PATTERN, escape(firstName))
    .replaceAll(UNSUBSCRIBE_URL_PLACEHOLDER, values.unsubscribeUrl)
}

/** Subject lines are plain text, so the name goes in unescaped. */
export function personalizeSubject(
  subject: string,
  firstName: string | null
): string {
  const name =
    isNil(firstName) || firstName.trim() === ''
      ? FIRST_NAME_FALLBACK
      : firstName.trim()
  return subject.replace(FIRST_NAME_PATTERN, name)
}
