'use server'

import { updateTag } from 'next/cache'
import { authorizedAction } from '@/lib/actions/authorized-action'
import * as SettingsService from './settings-service'
import { Permission } from '@/lib/security'
import { TAGS } from '@/lib/cache/tags'
import { isErr, type Result } from '@/lib/results'
import type { SiteSetting } from './types'

/** Drops the cached settings reads after a successful write. */
function invalidatingSettings(
  result: Result<string, SiteSetting>
): Result<string, SiteSetting> {
  if (!isErr(result)) updateTag(TAGS.settings)
  return result
}
import type { NotificationToggleKey } from './site-settings'

type UpdateSettingRequest = {
  key: string
  value: string
}

/**
 * Update a site setting. Requires WRITE_SETTINGS permission.
 */
export const updateSetting = authorizedAction<
  [UpdateSettingRequest],
  SiteSetting
>(Permission.WRITE_SETTINGS, async (_user, { key, value }) => {
  return invalidatingSettings(await SettingsService.updateSetting(key, value))
})

/**
 * Update the address every transactional email is sent from.
 * Requires WRITE_SETTINGS permission.
 */
export const updateSystemEmailAddress = authorizedAction<[string], SiteSetting>(
  Permission.WRITE_SETTINGS,
  async (_user, address) => {
    return invalidatingSettings(
      await SettingsService.updateSystemEmailAddress(address)
    )
  }
)

type SetNotificationToggleRequest = {
  key: NotificationToggleKey
  enabled: boolean
}

/**
 * Turn a notification category on or off.
 * Requires WRITE_SETTINGS permission.
 */
export const setNotificationToggle = authorizedAction<
  [SetNotificationToggleRequest],
  SiteSetting
>(Permission.WRITE_SETTINGS, async (_user, { key, enabled }) => {
  return invalidatingSettings(
    await SettingsService.setNotificationToggle(key, enabled)
  )
})
