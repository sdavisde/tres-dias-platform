'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { isEmpty, isNil } from 'lodash'
import { isErr, ok } from '@/lib/results'
import { toastError } from '@/lib/toast-error'
import { formatPhoneNumber } from '@/lib/utils'
import { addressSchema, type Address } from '@/lib/users/validation'
import {
  formatCommunityWeekendRef,
  parseCommunityWeekendRef,
  toCommunityWeekendRef,
} from '@/lib/weekend/weekend-reference'
import { groupExperienceByCommunity } from '@/lib/users/experience'
import { updateUserRoles } from '@/services/identity/roles'
import {
  updateUserContactInfo,
  updateUserAddress,
  updateUserBasicInfo,
} from '@/services/identity/user'
import {
  upsertUserExperience,
  deleteUserExperience,
} from '@/actions/user-experience'
import {
  combineAutoSaveStatus,
  useAutoSave,
  type AutoSaveStatus,
} from '@/hooks/use-auto-save'
import type { CHARole } from '@/lib/weekend/types'
import type { MasterRosterMember } from '@/services/master-roster/types'
import type { UserExperience } from '@/lib/users/experience'
import type {
  ContactFields,
  AddressFields,
  CommunityFields,
  NewExperienceEntry,
} from '../types'

export type FieldErrors<T> = Partial<Record<keyof T, string>>

/** Lets a section ask for its change to skip the debounce (selects, pickers). */
export type SectionChange<T> = (
  fields: T,
  options?: { immediate?: boolean }
) => void

interface UseUserEditFormOptions {
  member: MasterRosterMember
  roles: Array<{ id: string; label: string; permissions: string[] }>
  canEdit: boolean
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateContact(contact: ContactFields): FieldErrors<ContactFields> {
  const email = contact.email.trim()
  if (email === '') return { email: 'Email is required' }
  if (!EMAIL_PATTERN.test(email)) return { email: 'Enter a valid email' }
  return {}
}

function validateAddress(address: AddressFields): FieldErrors<AddressFields> {
  const parsed = addressSchema.safeParse(address)
  if (parsed.success) return {}
  const errors: FieldErrors<AddressFields> = {}
  for (const issue of parsed.error.issues) {
    const field = issue.path[0] as keyof AddressFields
    errors[field] ??= issue.message
  }
  return errors
}

function validateCommunity(
  community: CommunityFields
): FieldErrors<CommunityFields> {
  const number = community.weekendNumber.trim()
  if (community.weekendCommunity === '' && number !== '') {
    return { weekendCommunity: 'Pick a community' }
  }
  if (
    community.weekendCommunity !== '' &&
    !(/^\d+$/.test(number) && parseInt(number) > 0)
  ) {
    return { weekendNumber: 'Enter the weekend number' }
  }
  return {}
}

const isCompleteEntry = (entry: NewExperienceEntry) =>
  entry.cha_role !== '' && entry.community !== '' && entry.weekend_number !== ''

function initialContact(member: MasterRosterMember): ContactFields {
  return {
    firstName: member.firstName ?? '',
    lastName: member.lastName ?? '',
    phone: formatPhoneNumber(member.phoneNumber) ?? '',
    email: member.email ?? '',
    gender: member.gender ?? '',
  }
}

function initialAddress(member: MasterRosterMember): AddressFields {
  return {
    addressLine1: member.address?.addressLine1 ?? '',
    addressLine2: member.address?.addressLine2 ?? '',
    city: member.address?.city ?? '',
    state: member.address?.state ?? '',
    zip: member.address?.zip ?? '',
  }
}

function initialCommunity(member: MasterRosterMember): CommunityFields {
  const attendedRef = parseCommunityWeekendRef(
    member.communityInformation.weekendAttended
  )
  const essentialsDate = member.communityInformation.essentialsTrainingDate
  return {
    churchAffiliation: member.communityInformation.churchAffiliation ?? '',
    weekendCommunity: attendedRef?.community ?? '',
    weekendNumber: attendedRef?.number.toString() ?? '',
    essentialsDate: isNil(essentialsDate)
      ? undefined
      : new Date(essentialsDate),
    skills: member.communityInformation.specialGiftsAndSkills ?? [],
    isClergy: member.communityInformation.isClergy,
  }
}

/**
 * Form state for the People editor. Each section auto-saves on its own once it
 * is valid, so a typo in the address never holds back a phone number change.
 * Mount it once per person (the editor body is keyed by member id): the
 * baseline for "unsaved" is the member as it was when the editor opened.
 */
export function useUserEditForm({
  member,
  roles,
  canEdit,
}: UseUserEditFormOptions) {
  const router = useRouter()
  const refresh = () => router.refresh()

  const [contact, setContact] = useState(() => initialContact(member))
  const [address, setAddress] = useState(() => initialAddress(member))
  const [community, setCommunity] = useState(() => initialCommunity(member))
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>(
    () => member.roles?.map((r) => r.id) ?? []
  )
  const [newExperience, setNewExperience] = useState<NewExperienceEntry[]>([])
  const [deletedExperienceIds, setDeletedExperienceIds] = useState<string[]>([])
  const [pendingDeletes, setPendingDeletes] = useState(0)
  const [customSkill, setCustomSkill] = useState('')

  const contactErrors = validateContact(contact)
  const addressErrors = validateAddress(address)
  const communityErrors = validateCommunity(community)

  const contactSave = useAutoSave({
    value: contact,
    isValid: isEmpty(contactErrors),
    enabled: canEdit,
    errorMessage: 'Unable to save contact info. Please try again.',
    onSaved: refresh,
    save: (fields) => {
      const phoneDigits = fields.phone.replace(/\D/g, '')
      return updateUserContactInfo(member.id, {
        first_name: fields.firstName !== '' ? fields.firstName : null,
        last_name: fields.lastName !== '' ? fields.lastName : null,
        phone_number: phoneDigits !== '' ? phoneDigits : null,
        email: fields.email.trim(),
        gender: fields.gender !== '' ? fields.gender : null,
      })
    },
  })

  const addressSave = useAutoSave({
    value: address,
    isValid: isEmpty(addressErrors),
    enabled: canEdit,
    errorMessage: 'Unable to save the address. Please try again.',
    onSaved: refresh,
    save: (fields) => updateUserAddress(member.id, fields as Address),
  })

  const communitySave = useAutoSave({
    value: community,
    isValid: isEmpty(communityErrors),
    enabled: canEdit,
    errorMessage: 'Unable to save community info. Please try again.',
    onSaved: refresh,
    save: (fields) =>
      updateUserBasicInfo(member.id, {
        church_affiliation: fields.churchAffiliation,
        weekend_attended: {
          community: fields.weekendCommunity,
          weekend_number: fields.weekendNumber.trim(),
        },
        essentials_training_date: fields.essentialsDate,
        special_gifts_and_skills:
          fields.skills.length > 0 ? fields.skills : undefined,
        is_clergy: fields.isClergy,
      }),
  })

  const rolesSave = useAutoSave({
    value: selectedRoleIds,
    enabled: canEdit,
    delay: 0,
    errorMessage: 'Unable to update roles. Please try again.',
    onSaved: refresh,
    save: async (roleIds) =>
      (await updateUserRoles({ userId: member.id, roleIds })) ?? ok(null),
  })

  // New experience rows save once all three fields are filled in; until then
  // the editor reads "Not saved" so a half-entered row isn't silently dropped.
  const unsavedExperience = newExperience.filter((e) => !e.saved)
  const experienceSave = useAutoSave({
    value: unsavedExperience,
    isValid: unsavedExperience.every(isCompleteEntry),
    enabled: canEdit,
    errorMessage: 'Unable to save experience. Please try again.',
    onSaved: refresh,
    save: async (entries) => {
      for (const entry of entries) {
        const result = await upsertUserExperience(member.id, {
          cha_role: entry.cha_role as CHARole,
          community: entry.community,
          weekend_number: entry.weekend_number,
          rollo: entry.rollo !== '' ? entry.rollo : null,
        })
        if (isErr(result)) return result
        setNewExperience((prev) =>
          prev.map((e) => (e.key === entry.key ? { ...e, saved: true } : e))
        )
      }
      return ok(null)
    },
  })

  const deleteExperience = async (id: string) => {
    setDeletedExperienceIds((prev) => [...prev, id])
    setPendingDeletes((n) => n + 1)
    const result = await deleteUserExperience(id)
    setPendingDeletes((n) => n - 1)
    if (isErr(result)) {
      // The row comes back, so the screen still matches what's saved.
      setDeletedExperienceIds((prev) => prev.filter((d) => d !== id))
      toastError('Unable to remove that experience. Please try again.', {
        error: result.error,
      })
      return
    }
    refresh()
  }

  const deleteStatus: AutoSaveStatus = pendingDeletes > 0 ? 'saving' : 'idle'

  const saveStatus = combineAutoSaveStatus([
    contactSave.status,
    addressSave.status,
    communitySave.status,
    rolesSave.status,
    experienceSave.status,
    deleteStatus,
  ])

  const retry = () => {
    void contactSave.flush()
    void addressSave.flush()
    void communitySave.flush()
    void rolesSave.flush()
    void experienceSave.flush()
  }

  const experience = useMemo(() => member.experience ?? [], [member.experience])

  const totalDTTDWeekends = useMemo(() => {
    if (experience.length === 0) return 0
    const grouped = groupExperienceByCommunity(experience)
    return grouped.find((g) => g.community === 'DTTD')?.records.length ?? 0
  }, [experience])

  const visibleExperience: UserExperience[] = experience.filter(
    (e) => !deletedExperienceIds.includes(e.id)
  )

  // A saved row stays on screen (read-only) until the refreshed roster carries
  // it, so it doesn't blink out between the save and the refresh.
  const displayedNewExperience = newExperience.filter(
    (entry) =>
      !entry.saved ||
      !experience.some(
        (record) =>
          record.cha_role === entry.cha_role &&
          record.weekend_reference ===
            formatCommunityWeekendRef(
              toCommunityWeekendRef({
                community: entry.community,
                number: parseInt(entry.weekend_number),
              })
            )
      )
  )

  const roleOptions = roles.map((role) => ({
    value: role.id,
    label: role.label,
  }))

  const updateContact: SectionChange<ContactFields> = (fields, options) => {
    if (options?.immediate === true) contactSave.saveImmediately()
    setContact(fields)
  }

  const updateCommunity: SectionChange<CommunityFields> = (fields, options) => {
    if (options?.immediate === true) communitySave.saveImmediately()
    setCommunity(fields)
  }

  const toggleSkill = (skill: string) => {
    communitySave.saveImmediately()
    setCommunity((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter((s) => s !== skill)
        : [...prev.skills, skill],
    }))
  }

  const addCustomSkill = () => {
    const trimmed = customSkill.trim()
    if (trimmed !== '') {
      communitySave.saveImmediately()
      setCommunity((prev) => ({
        ...prev,
        skills: [...prev.skills, trimmed],
      }))
      setCustomSkill('')
    }
  }

  const addExperience = () =>
    setNewExperience((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        saved: false,
        cha_role: '',
        community: 'DTTD',
        weekend_number: '',
        rollo: '',
      },
    ])

  const updateExperience = (
    key: string,
    entry: NewExperienceEntry,
    options?: { immediate?: boolean }
  ) => {
    if (options?.immediate === true) experienceSave.saveImmediately()
    setNewExperience((prev) => prev.map((e) => (e.key === key ? entry : e)))
  }

  const removeExperience = (key: string) =>
    setNewExperience((prev) => prev.filter((e) => e.key !== key))

  /**
   * Dev-only: drops plausible values into the editable fields so the form can
   * be exercised without hand-typing. Never rendered outside `yarn dev`.
   */
  const fillWithTestData = () => {
    setContact((prev) => ({
      ...prev,
      firstName: prev.firstName !== '' ? prev.firstName : 'Test',
      lastName: prev.lastName !== '' ? prev.lastName : 'Person',
      phone: '(830) 555-0163',
      gender: prev.gender !== '' ? prev.gender : 'male',
    }))
    setAddress({
      addressLine1: '123 Dusty Trail',
      addressLine2: 'Apt 4B',
      city: 'Kerrville',
      state: 'TX',
      zip: '78028',
    })
    setCommunity((prev) => ({
      ...prev,
      churchAffiliation: 'First Baptist Kerrville',
      weekendCommunity: 'DTTD',
      weekendNumber: '9',
      essentialsDate: new Date(2024, 2, 1),
    }))
  }

  return {
    // State
    contact,
    updateContact,
    contactErrors,
    address,
    setAddress,
    addressErrors,
    community,
    updateCommunity,
    communityErrors,
    selectedRoleIds,
    setSelectedRoleIds,
    newExperience: displayedNewExperience,
    customSkill,
    setCustomSkill,
    saveStatus,
    retry,
    // Derived
    totalDTTDWeekends,
    visibleExperience,
    roleOptions,
    // Helpers
    toggleSkill,
    addCustomSkill,
    addExperience,
    updateExperience,
    removeExperience,
    deleteExperience,
    fillWithTestData,
  }
}
