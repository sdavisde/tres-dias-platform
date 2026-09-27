import { test, expect, type Page } from '@playwright/test'
import { isNil } from 'lodash'
import { AUTH_HINTS, AUTH_MESSAGES } from '@/lib/auth/auth-errors'
import { deleteAuthUser, e2eEmail } from './fixtures/auth-users'
import { readPersonas, type Personas } from './fixtures/personas'
import { seedPassword } from './fixtures/seed'
import { adminClient } from './fixtures/supabase'

/**
 * Sign-in and registration through the real /login and /join forms, logged
 * out (no storageState). Covers FR-2.6: the happy paths land on /home, and
 * every failure shows the repository's own message from lib/auth/auth-errors.ts
 * rather than raw GoTrue text.
 *
 * Auth budget: this file makes 1 + 1 + 1 + 2 + 1 + 0 = 6 sign-in/sign-up
 * requests (signup is signUp then signInWithPassword); plus 2 in setup = 8 per
 * run, 16 with a retry, against GoTrue's local limit of 30 per 5 minutes.
 */

const PASSWORD = 'e2e-Pass-123' // 12 characters
const SUBMIT = 'button[type="submit"]'

let personas: Personas

// Every account this file creates, so a failed test still gets cleaned up.
const createdEmails: string[] = []

test.beforeAll(() => {
  personas = readPersonas()
})

test.afterEach(async () => {
  while (createdEmails.length > 0) {
    const email = createdEmails.pop()
    if (!isNil(email)) await deleteAuthUser(email)
  }
})

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page.locator(SUBMIT).click()
}

type Registration = {
  email: string
  password: string
  confirmPassword: string
  firstName: string
  lastName: string
}

async function fillRegistration(page: Page, r: Registration) {
  await page.goto('/join')
  await page.locator('#firstName').fill(r.firstName)
  await page.locator('#lastName').fill(r.lastName)
  await page.getByRole('button', { name: 'Female', exact: true }).click()
  await page.locator('#email').fill(r.email)
  await page.locator('#password').fill(r.password)
  await page.locator('#confirmPassword').fill(r.confirmPassword)
}

test('signing in as a seeded user lands on /home and greets them', async ({
  page,
}) => {
  const { email, firstName } = personas.seededUser
  if (isNil(firstName)) {
    throw new Error('personas.seededUser has no first name (Seed Invariant S5)')
  }

  await signIn(page, email, seedPassword())

  await page.waitForURL(/\/home/)
  await expect(
    page.getByRole('heading', { level: 1, name: `Hi ${firstName}` })
  ).toBeVisible()
})

test('a wrong password shows the invalid-credentials message and a reset hint', async ({
  page,
}) => {
  await signIn(page, personas.seededUser.email, 'not-the-password')

  const alert = page.locator('[data-testid="auth-error"]')
  await expect(alert).toContainText(AUTH_MESSAGES.invalidCredentials)
  const hint = page.locator('[data-testid="auth-error-hint"]')
  await expect(hint).toHaveText(AUTH_HINTS.resetPassword.text)
  await expect(page).toHaveURL(/\/login/)

  await hint.click()
  await page.waitForURL(/\/forgot-password/)
})

test('an unknown email shows the same message as a wrong password', async ({
  page,
}) => {
  await signIn(page, `e2e-unknown-${Date.now()}@example.com`, 'not-a-password')

  // The same constant as the wrong-password case: the two are
  // indistinguishable, so the form never reveals which emails have accounts.
  await expect(page.locator('[data-testid="auth-error"]')).toContainText(
    AUTH_MESSAGES.invalidCredentials
  )
  await expect(page.locator('[data-testid="auth-error-hint"]')).toHaveText(
    AUTH_HINTS.resetPassword.text
  )
  await expect(page).toHaveURL(/\/login/)
})

test('registering on /join lands on /home and creates a public.users row', async ({
  page,
}) => {
  const email = e2eEmail()
  createdEmails.push(email)
  const firstName = 'E2E'
  const lastName = `Signup${Date.now()}`

  await fillRegistration(page, {
    email,
    password: PASSWORD,
    confirmPassword: PASSWORD,
    firstName,
    lastName,
  })
  await page.locator(SUBMIT).click()
  await page.waitForURL(/\/home/)

  // The on_auth_user_change trigger (sync_users) copies the signup metadata.
  const { data, error } = await adminClient()
    .from('users')
    .select('first_name, last_name')
    .eq('email', email)
    .maybeSingle()
  expect(error).toBeNull()
  expect(data).toEqual({ first_name: firstName, last_name: lastName })
})

test('registering an existing email offers to switch to sign in', async ({
  page,
}) => {
  await fillRegistration(page, {
    email: personas.seededUser.email,
    password: PASSWORD,
    confirmPassword: PASSWORD,
    firstName: 'E2E',
    lastName: 'Duplicate',
  })
  await page.locator(SUBMIT).click()

  const alert = page.locator('[data-testid="auth-error"]')
  await expect(alert).toContainText(AUTH_MESSAGES.alreadyRegistered)
  const hint = page.locator('[data-testid="auth-error-hint"]')
  await expect(hint).toHaveText(AUTH_HINTS.goToSignIn.text)

  await hint.click()
  await expect(page.locator(SUBMIT)).toHaveText('Sign In')
  await expect(alert).toBeHidden()
})

test('mismatched passwords are caught before any auth request', async ({
  page,
}) => {
  await fillRegistration(page, {
    email: e2eEmail(),
    password: PASSWORD,
    confirmPassword: `${PASSWORD}-different`,
    firstName: 'E2E',
    lastName: 'Mismatch',
  })

  const authRequests: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/auth/v1/')) authRequests.push(request.url())
  })
  await page.locator(SUBMIT).click()

  await expect(page.locator('[data-testid="auth-error"]')).toContainText(
    'Passwords do not match'
  )
  expect(authRequests).toEqual([])
})
