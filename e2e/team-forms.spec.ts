import type { Page } from '@playwright/test'
import { isNil } from 'lodash'
import { teamFormSteps } from '@/components/team-forms/steps.config'
import { formatPhoneInput } from '@/lib/formatting/phone-input'
import { RECOGNIZED_COMMUNITIES } from '@/lib/communities/whitelist'
import { REQUIRED_FORMS } from '@/lib/weekend/team/required-forms.config'
import {
  readPersonas,
  storageStatePath,
  type Personas,
} from './fixtures/personas'
import { seedPassword } from './fixtures/seed'
import { adminClient } from './fixtures/supabase'
import { expect, test } from './fixtures/team-forms'

/**
 * Team forms (Unit 3): a roster member completes all five forms in order.
 *
 * What the flow relies on (read from the app, task 3.2):
 * - Steps, in order (components/team-forms/steps.config.ts): statement-of-belief,
 *   commitment-form, release-of-claim, camp-waiver, info-sheet.
 * - A locked step renders two ways. In the layout's stepper
 *   (components/team-forms/stepper/step-link.tsx) it is a plain <div>, not a
 *   link. On the /team-forms progress card it is still an <a>, but with
 *   `pointer-events-none` (and `opacity-50 cursor-not-allowed`).
 * - Nothing gates a deep link: the layout computes `maxReachableStepIndex`
 *   only for the stepper and never redirects (FR-3.4).
 * - Validation strings (local to each form component, not exported, so
 *   retyped here):
 *   - Statement of Belief `signature`: "Signature must be at least 2 characters"
 *   - Commitment Form `commitments.N` (10 checkboxes) and `signature`: the
 *     schema's "You must agree to all commitments to proceed." never shows;
 *     react-hook-form files the array refine's issue where
 *     `errors.commitments.message` doesn't see it, so the component's
 *     fallback "You must agree to all commitments." renders instead
 *   - Release of Claim `has_special_needs` (radios yes/no):
 *     "Please select yes or no."; `special_needs_description` when yes:
 *     "Please describe your special needs."; `signature`: "Signature is required"
 *   - Camp Waiver `signature`: "Signature is required"
 * - Team Info required fields (TeamInfoSchema, components/team-forms/schemas.ts):
 *   `address.addressLine1`, `address.city`, `address.state` (2+ chars),
 *   `address.zip` (5+ chars), `basicInfo.church_affiliation`,
 *   `basicInfo.weekend_attended.community` (a select of
 *   RECOGNIZED_COMMUNITIES), `basicInfo.weekend_attended.weekend_number`,
 *   `medicalInfo.emergency_contact_name`, `medicalInfo.emergency_contact_phone`
 *   (10 digits). The address inputs only show when there is no saved address
 *   or "Update my address" is chosen.
 *
 * Structure: the flow is ONE test with a test.step per form, not a chain of
 * serial tests. The teamFormsMember fixture is test-scoped, so separate tests
 * would snapshot, reset and restore between every step and break the chain;
 * one test means the snapshot/restore wraps the whole flow exactly once.
 *
 * Auth budget: the flow reuses the teamForms session from setup (0 logins);
 * the negative case signs in once inside the test: +1, so 9 sign-in/sign-up
 * requests per run (8 before this file), against GoTrue's local limit of 30
 * per 5 minutes.
 */

const SIGNATURE = 'E2E Signature'

const teamInfo = {
  addressLine1: '100 E2E Street',
  city: 'Abilene',
  state: 'TX',
  zip: '79601',
  churchAffiliation: 'E2E Community Church',
  community: RECOGNIZED_COMMUNITIES.DTTD,
  weekendNumber: '12',
  emergencyContactName: 'E2E Emergency Contact',
  emergencyContactPhone: '3255550142',
}

const stepPath = (id: string): string => {
  const step = teamFormSteps.find((s) => s.id === id)
  if (isNil(step)) throw new Error(`No team form step with id ${id}`)
  return step.path
}

const PATHS = {
  statementOfBelief: stepPath('statement-of-belief'),
  commitmentForm: stepPath('commitment-form'),
  releaseOfClaim: stepPath('release-of-claim'),
  campWaiver: stepPath('camp-waiver'),
  infoSheet: stepPath('info-sheet'),
}

/** Matches the URL of a path exactly, ignoring any query string. */
function urlOf(path: string): RegExp {
  return new RegExp(`${path.replace(/[/-]/g, '\\$&')}(\\?.*)?$`)
}

async function sign(page: Page, label: RegExp | string) {
  await page.getByLabel(label).fill(SIGNATURE)
}

test.describe('team forms flow', () => {
  test.use({ storageState: storageStatePath('teamForms') })
  test.describe.configure({ mode: 'serial' })

  test('a roster member completes all five team forms in order', async ({
    page,
    teamFormsMember,
  }) => {
    // Six pages and six server actions in one test; under `yarn dev` each
    // page compiles on first visit, which alone can pass the 30s default.
    test.slow()

    await test.step('a deep link to a later step renders it rather than redirecting', async () => {
      // Documents current behaviour (FR-3.4), not a requirement: the layout
      // never redirects, so Release of Claim renders before steps 1–2 are
      // done. Only the stepper shows it as out of reach.
      await page.goto(PATHS.releaseOfClaim)
      await expect(page).toHaveURL(urlOf(PATHS.releaseOfClaim))
      await expect(
        page.getByRole('heading', { name: 'Release of Claim' })
      ).toBeVisible()
      await expect(
        page
          .getByRole('navigation', { name: 'Progress' })
          .getByRole('link', { name: /Release of Claim/ })
      ).toHaveCount(0)
    })

    await test.step('the home checklist links to the team forms', async () => {
      await page.goto('/home')
      const item = page.getByRole('link', { name: 'Complete team forms' })
      await expect(item).toHaveAttribute('href', '/team-forms')
      await item.click()
      await page.waitForURL(urlOf('/team-forms'))
    })

    await test.step('the progress page starts at 0% with only step 1 open', async () => {
      await expect(
        page.getByRole('heading', { name: 'Team Forms Progress' })
      ).toBeVisible()
      await expect(page.getByText('0%', { exact: true })).toBeVisible()

      const [first, ...later] = teamFormSteps
      const stepper = page.getByRole('navigation', { name: 'Progress' })
      await expect(
        stepper.getByRole('link', { name: new RegExp(first.name) })
      ).toHaveAttribute('href', first.path)

      const firstCard = page.getByRole('link', {
        name: first.name,
        exact: true,
      })
      await expect(firstCard).not.toHaveClass(/pointer-events-none/)

      for (const step of later) {
        // Stepper: a locked step is not a link at all.
        await expect(
          stepper.getByRole('link', { name: new RegExp(step.name) })
        ).toHaveCount(0)
        await expect(
          stepper.getByText(step.name, { exact: true })
        ).toBeVisible()
        // Progress card: still an <a>, but it takes no pointer events.
        const card = page.getByRole('link', { name: step.name, exact: true })
        await expect(card).toHaveClass(/pointer-events-none/)
        await expect(card).toHaveCSS('pointer-events', 'none')
      }
    })

    await test.step('Statement of Belief needs a signature', async () => {
      await page.goto(PATHS.statementOfBelief)
      const submit = page.getByRole('button', { name: 'Agree and Continue' })
      await submit.click()
      await expect(
        page.getByText('Signature must be at least 2 characters')
      ).toBeVisible()

      await sign(page, 'Signature (Type your full name)')
      await submit.click()
      await page.waitForURL(urlOf(PATHS.commitmentForm))
    })

    await test.step('Commitment Form needs every box ticked', async () => {
      const boxes = page.getByRole('checkbox')
      await expect(boxes.first()).toBeVisible()
      const count = await boxes.count()
      expect(count).toBeGreaterThan(1)
      for (let i = 0; i < count - 1; i++) await boxes.nth(i).check()
      await sign(page, 'Signature (Type your full name)')

      const submit = page.getByRole('button', { name: 'Agree and Continue' })
      await submit.click()
      // Spec text was "…to proceed."; the app renders its fallback (see header).
      await expect(
        page.getByText('You must agree to all commitments.', { exact: true })
      ).toBeVisible()
      await expect(page).toHaveURL(urlOf(PATHS.commitmentForm))

      await boxes.nth(count - 1).check()
      await submit.click()
      await page.waitForURL(urlOf(PATHS.releaseOfClaim))
    })

    await test.step('Release of Claim needs a yes/no, and a description for yes', async () => {
      const submit = page.getByRole('button', { name: 'Agree and Submit' })
      await submit.click()
      await expect(page.getByText('Please select yes or no.')).toBeVisible()

      await page.getByRole('radio', { name: 'Yes' }).check()
      await submit.click()
      await expect(
        page.getByText('Please describe your special needs.')
      ).toBeVisible()

      await page.getByRole('radio', { name: 'No' }).check()
      await sign(page, 'Signature (Type your full name)')
      await submit.click()
      await page.waitForURL(urlOf(PATHS.campWaiver))
    })

    await test.step('Camp Waiver is signed and submitted', async () => {
      await sign(page, 'SIGNATURE OF ATTENDEE')
      await page.getByRole('button', { name: 'Agree and Submit' }).click()
      await page.waitForURL(urlOf(PATHS.infoSheet))
    })

    await test.step('Team Info saves and every form reads complete', async () => {
      await expect(
        page.getByRole('heading', { name: 'Team Information' })
      ).toBeVisible()

      // With a saved address the inputs are hidden behind this choice.
      const updateAddress = page.getByLabel('Update my address')
      if ((await updateAddress.count()) > 0) await updateAddress.check()

      await page.getByLabel('Street Address').fill(teamInfo.addressLine1)
      await page.getByLabel('City', { exact: true }).fill(teamInfo.city)
      await page.getByLabel('State', { exact: true }).fill(teamInfo.state)
      await page.getByLabel('Zip Code').fill(teamInfo.zip)
      // The label points at a wrapper <div> (FormControl wraps the icon and
      // the input), so it doesn't label the input; use the placeholder.
      await page.getByPlaceholder('My Church').fill(teamInfo.churchAffiliation)
      await page.getByRole('combobox').click()
      await page
        .getByRole('option', { name: teamInfo.community, exact: true })
        .click()
      await page.getByPlaceholder('Weekend #').fill(teamInfo.weekendNumber)
      await page
        .getByLabel('Emergency Contact Name')
        .fill(teamInfo.emergencyContactName)
      await page
        .getByLabel('Emergency Contact Phone')
        .fill(teamInfo.emergencyContactPhone)

      await page.getByRole('button', { name: 'Save Information' }).click()
      await expect(
        page.getByText('Information saved successfully!')
      ).toBeVisible()
      await page.waitForURL(urlOf('/team-forms'))
      await expect(page.getByText('All forms completed!')).toBeVisible()
    })

    await test.step('the database holds five completions and the emergency contact', async () => {
      const admin = adminClient()
      const { data: completions, error } = await admin
        .from('team_form_completions')
        .select('form_type')
        .eq('weekend_group_member_id', teamFormsMember.groupMemberId)
      expect(error).toBeNull()
      expect((completions ?? []).map((c) => c.form_type).sort()).toEqual(
        REQUIRED_FORMS.map((f) => f.key).sort()
      )

      const { data: medical, error: medicalError } = await admin
        .from('user_medical_profiles')
        .select('emergency_contact_name, emergency_contact_phone')
        .eq('user_id', teamFormsMember.userId)
      expect(medicalError).toBeNull()
      expect(medical).toEqual([
        {
          emergency_contact_name: teamInfo.emergencyContactName,
          emergency_contact_phone: formatPhoneInput(
            teamInfo.emergencyContactPhone
          ),
        },
      ])
    })
  })
})

test.describe('team forms for someone on no roster', () => {
  // Logged out: this test signs in itself, as the non-roster persona.
  test.use({ storageState: { cookies: [], origins: [] } })

  let personas: Personas

  test.beforeAll(() => {
    personas = readPersonas()
  })

  test('a user on no active roster is sent from /team-forms to /home with no error toast', async ({
    page,
  }) => {
    // The one deliberate in-spec login (auth budget: +1, 9 per run).
    await page.goto('/login')
    await page.locator('#email').fill(personas.nonRosterUser.email)
    await page.locator('#password').fill(seedPassword())
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(/\/home/)

    // Documents current behaviour, which differs from FR-3.3: the page would
    // redirect to /?error=UserNotOnRoster, but the layout checks first and
    // redirects to a bare '/', which the proxy sends on to /home. The error
    // param never reaches the browser, and it would show no toast anyway:
    // UserNotOnRoster is not a member of Errors in lib/error.ts, so the
    // Toastbox ignores it.
    await page.goto('/team-forms')
    await page.waitForURL(/\/home$/)
    await expect(page).not.toHaveURL(/error=/)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-sonner-toast]')).toHaveCount(0)
  })
})
