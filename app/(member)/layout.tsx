import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getLoggedInUser } from '@/services/identity/user'
import { getCachedActiveGroupId } from '@/services/weekend/cached'
import { isErr, Results } from '@/lib/results'
import { Permission, userHasPermission } from '@/lib/security'
import { getMemberNav, getTabBarItems } from '@/lib/member/navigation'
import { MemberSidebar } from '@/components/member/sidebar'
import { TopBar } from '@/components/member/top-bar'
import { TabBar } from '@/components/member/tab-bar'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { Footer } from '@/components/footer'
import { SessionScope } from '@/components/auth/session-provider'

export const metadata: Metadata = {
  title: 'Dusty Trails Tres Dias',
  description:
    'Being like-minded, having the same love, being one in spirit and of one mind. Phil 2:2',
}

/** Kept apart from admin's cookie so the two shells collapse independently. */
const SIDEBAR_COOKIE = 'member_sidebar_state'

/**
 * The member shell: sidebar on desktop, tab bar on phones, top bar on both.
 * Every signed-in page lives under this layout; the proxy already bounces
 * anonymous visitors to /login, so the redirect here is a backstop.
 */
export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [userResult, cookieStore, activeGroupResult] = await Promise.all([
    getLoggedInUser(),
    cookies(),
    getCachedActiveGroupId(),
  ])
  if (isErr(userResult)) {
    redirect('/login')
  }
  const user = userResult.data
  // Roster points at the active group's hub; without one it falls back to
  // the weekends index, so a failed lookup degrades rather than breaks.
  const nav = getMemberNav(user, {
    activeGroupId: Results.unwrapOr(activeGroupResult, null),
  })
  const sidebarOpen = cookieStore.get(SIDEBAR_COOKIE)?.value !== 'false'

  return (
    <SessionScope user={user}>
      {/* 264px per the VerbNav board; overridden here so other sidebar
          consumers keep the primitive's default. */}
      <SidebarProvider
        defaultOpen={sidebarOpen}
        cookieName={SIDEBAR_COOKIE}
        style={{ '--sidebar-width': '16.5rem' } as React.CSSProperties}
      >
        <MemberSidebar nav={nav} />
        {/* min-w-0 lets this flex item shrink below its content's width, so wide
          children (tables, kanban boards) scroll inside their own container
          instead of stretching the whole page horizontally. The bottom padding
          clears the fixed tab bar on phones. */}
        <SidebarInset className="min-w-0 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
          <TopBar
            nav={nav}
            showAdmin={userHasPermission(user, [Permission.READ_ADMIN_PORTAL])}
          />
          <div className="flex min-h-[80vh] w-full min-w-0 flex-1 flex-col">
            {children}
          </div>
          <Footer />
        </SidebarInset>
        <TabBar items={getTabBarItems(nav)} />
      </SidebarProvider>
    </SessionScope>
  )
}
