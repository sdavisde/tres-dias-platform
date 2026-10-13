'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { House, type LucideIcon } from 'lucide-react'
import { isNil } from 'lodash'
import { NavUser } from '@/components/admin/sidebar/nav-user'
import {
  ADMIN_NAV_SECTION_ORDER,
  getNavIcon,
  isNavItemActive,
  type SerializableNavItem,
} from '@/lib/admin/navigation'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from '@/components/ui/sidebar'

type AdminSidebarProps = React.ComponentProps<typeof Sidebar> & {
  items: SerializableNavItem[]
}

export function AdminSidebar({ items, ...props }: AdminSidebarProps) {
  const pathname = usePathname()
  const mainItems = items.filter((item) => item.footer !== true)
  const footerItems = items.filter((item) => item.footer === true)
  // Sections the user can't see anything in drop out entirely; the top
  // group always renders because it holds "Back to member site".
  const sections = ADMIN_NAV_SECTION_ORDER.map((section) => ({
    section,
    items: mainItems.filter((item) => item.section === section),
  })).filter(({ section, items }) => isNil(section) || items.length > 0)

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/admin">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary font-serif text-sm font-semibold text-primary-foreground">
                  DT
                </div>
                <div className="flex flex-1 items-center gap-2 text-left leading-tight">
                  <span className="truncate font-medium">Dusty Trails</span>
                  <span className="rounded-full border border-secondary-border bg-secondary px-2 py-0.5 text-[10px] font-bold tracking-wider text-secondary-foreground uppercase">
                    Admin
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {sections.map(({ section, items: sectionItems }) => (
          <SidebarGroup key={section ?? 'top'}>
            {!isNil(section) && (
              <SidebarGroupLabel className="text-[11.5px] font-semibold tracking-[0.1em] text-muted-foreground/80 uppercase">
                {section}
              </SidebarGroupLabel>
            )}
            <SidebarMenu>
              {isNil(section) && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Back to member site">
                    <Link href="/home">
                      <House />
                      <span>Back to member site</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {sectionItems.map((item) => (
                <AdminNavMenuItem
                  key={item.href}
                  item={item}
                  icon={getNavIcon(item.href)}
                  isActive={isNavItemActive(item.href, pathname)}
                />
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarSeparator className="mx-0" />
        {footerItems.length > 0 && (
          <SidebarMenu>
            {footerItems.map((item) => (
              <AdminNavMenuItem
                key={item.href}
                item={item}
                icon={getNavIcon(item.href)}
                isActive={isNavItemActive(item.href, pathname)}
              />
            ))}
          </SidebarMenu>
        )}
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

function AdminNavMenuItem({
  item,
  icon: Icon,
  isActive,
}: {
  item: SerializableNavItem
  icon: LucideIcon | undefined
  isActive: boolean
}) {
  if (item.soon === true) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          aria-disabled
          className="text-muted-foreground/70 hover:bg-transparent hover:text-muted-foreground/70 active:bg-transparent"
          tooltip={`${item.title} — coming soon`}
        >
          {!isNil(Icon) && <Icon />}
          <span>{item.title}</span>
        </SidebarMenuButton>
        <SidebarMenuBadge className="text-[10px] font-bold tracking-wider text-muted-foreground/70">
          SOON
        </SidebarMenuBadge>
      </SidebarMenuItem>
    )
  }
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={item.title}
        // Resting nav text is quieter than the sidebar's own
        // foreground; the active item carries the weight instead.
        className={isActive ? 'font-semibold' : 'text-nav-foreground'}
      >
        <Link href={item.href}>
          {!isNil(Icon) && <Icon />}
          <span>{item.title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}
