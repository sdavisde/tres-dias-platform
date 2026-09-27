'use server'

import { authorizedAction } from '@/lib/actions/authorized-action'
import * as NotificationService from './notification-service'
import { Permission } from '@/lib/security'
import type { ContactInfo } from './types'

// ============================================================================
// Authorized Actions (Require User Session)
// ============================================================================

/**
 * Get contact information by ID.
 * Requires READ_ADMIN_PORTAL permission.
 */
export const getContactInformation = authorizedAction<[string], ContactInfo>(
  Permission.READ_ADMIN_PORTAL,
  async (_user, contactId) => {
    return await NotificationService.getContactInformation(contactId)
  }
)

/**
 * Count of emails successfully sent so far this calendar month.
 * Requires FULL_ACCESS, matching the email_log RLS read policy.
 */
export const getEmailsSentThisMonth = authorizedAction<[], number>(
  Permission.FULL_ACCESS,
  async () => {
    return await NotificationService.getEmailsSentThisMonth()
  }
)

type UpdateContactInformationRequest = {
  contactId: string
  emailAddress: string
}

/**
 * Update contact information email address.
 * Requires WRITE_USER_ROLES permission (board members can update).
 */
export const updateContactInformation = authorizedAction<
  [UpdateContactInformationRequest],
  ContactInfo
>(Permission.WRITE_USER_ROLES, async (_user, { contactId, emailAddress }) => {
  return await NotificationService.updateContactInformation(
    contactId,
    emailAddress
  )
})
