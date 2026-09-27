'use client'

import * as Sentry from '@sentry/nextjs'
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from 'react'
import { getLoggedInUser } from '@/services/identity/user'
import type { User } from '@/lib/users/types'
import { isErr } from '@/lib/results'
import { logger } from '@/lib/logger'
import { isNil } from 'lodash'

type Session = {
  user: User | null
  isAuthenticated: boolean
  loading: boolean
  refreshSession: () => void
}

const sessionContext = createContext<Session | null>(null)

/**
 * Re-reads the signed-in user through the `getLoggedInUser` server action;
 * the one lookup that is still made on demand (after a profile save or an
 * impersonation change) rather than by a server layout.
 */
function useSessionRefresh(apply: (user: User | null) => void) {
  const [loading, setLoading] = useState(false)
  const refreshSession = useCallback(() => {
    setLoading(true)
    getLoggedInUser()
      .then((result) => {
        if (isErr(result)) {
          logger.error(`Error refreshing session: ${result.error}`)
          apply(null)
        } else {
          apply(result.data)
        }
      })
      .catch((error: unknown) => {
        logger.error(`Unexpected error refreshing session: ${String(error)}`)
        apply(null)
      })
      .finally(() => setLoading(false))
  }, [apply])
  return { loading, refreshSession }
}

type SessionProviderProps = {
  children: React.ReactNode
}

/**
 * The root session: no user until a shell inside it provides one. Public
 * pages read this (nobody is signed in there); the member and admin shells
 * wrap their tree in `SessionScope` with the user they resolved on the
 * server, so no page load or navigation pays a lookup for it.
 */
export function SessionProvider({ children }: SessionProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const { loading, refreshSession } = useSessionRefresh(setUser)

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !isNil(user),
      loading,
      refreshSession,
    }),
    [user, loading, refreshSession]
  )

  return (
    <sessionContext.Provider value={value}>{children}</sessionContext.Provider>
  )
}

type SessionScopeProps = {
  /** The user the server layout resolved for this render. */
  user: User
  children: React.ReactNode
}

/**
 * Provides a server-resolved user to everything beneath it, from the render
 * itself — no effect and no state update, so hydration commits the shell
 * as streamed. A `refreshSession` result overrides it until the layout
 * re-renders with a newer user (e.g. after `router.refresh()`).
 */
export function SessionScope({ user, children }: SessionScopeProps) {
  const [override, setOverride] = useState<{
    base: User
    value: User | null
  } | null>(null)
  const apply = useCallback(
    (value: User | null) => setOverride({ base: user, value }),
    [user]
  )
  const { loading, refreshSession } = useSessionRefresh(apply)

  const current =
    !isNil(override) && override.base === user ? override.value : user

  // Tags browser Sentry events with the signed-in user, so a reported bug
  // can be found by who hit it.
  useEffect(() => {
    Sentry.setUser(
      isNil(current)
        ? null
        : {
            id: current.id,
            email: current.email,
            impersonatedBy: current.originalUser?.email,
          }
    )
    return () => Sentry.setUser(null)
  }, [current])
  const value = useMemo(
    () => ({
      user: current,
      isAuthenticated: !isNil(current),
      loading,
      refreshSession,
    }),
    [current, loading, refreshSession]
  )

  return (
    <sessionContext.Provider value={value}>{children}</sessionContext.Provider>
  )
}

export function useSession() {
  const session = useContext(sessionContext)
  if (isNil(session)) {
    throw new Error('useSession must be used within a SessionProvider')
  }
  return session
}
