'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { isNil } from 'lodash'
import {
  getMemberNavIcon,
  type MemberNav,
  type SerializableMemberNavItem,
} from '@/lib/member/navigation'
import { Button } from '@/components/ui/button'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'

const PLACEHOLDER = 'What are you looking for?'

/**
 * The top-bar search: a plain-language jump list over the pages this member
 * can see. Opens from the pill, the phone icon button, or ⌘K / Ctrl+K.
 */
export function SearchPalette({ nav }: { nav: MemberNav }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen((value) => !value)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const go = (item: SerializableMemberNavItem) => {
    setOpen(false)
    router.push(item.href)
  }

  const groups = [
    { heading: 'Go to', items: nav.main },
    { heading: 'Account', items: nav.footer },
  ]

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden h-9 w-[340px] items-center gap-2.5 rounded-full border border-border bg-background px-4 text-left text-sm text-muted-foreground transition-colors hover:border-ring/60 hover:text-foreground md:flex"
        aria-label="Search this site"
      >
        <Search className="size-4 shrink-0" aria-hidden />
        <span className="flex-1 truncate">{PLACEHOLDER}</span>
        <kbd className="hidden rounded border border-border bg-muted px-1.5 font-sans text-[11px] text-muted-foreground lg:inline">
          ⌘K
        </kbd>
      </button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Search this site"
      >
        <Search className="size-5" aria-hidden />
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search"
        description="Jump to a page"
      >
        <CommandInput placeholder={PLACEHOLDER} />
        <CommandList>
          <CommandEmpty>Nothing here by that name.</CommandEmpty>
          {groups.map((group) => (
            <CommandGroup key={group.heading} heading={group.heading}>
              {group.items.map((item) => {
                const Icon = getMemberNavIcon(item.key)
                return (
                  <CommandItem
                    key={item.key}
                    value={item.title}
                    onSelect={() => go(item)}
                  >
                    {!isNil(Icon) && <Icon aria-hidden />}
                    <span>{item.title}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  )
}
