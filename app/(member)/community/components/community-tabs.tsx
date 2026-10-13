'use client'

import type { ReactNode } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useQueryParam } from '@/hooks/url-state'
import { stringMarshaller } from '@/lib/marshallers'
import { cn } from '@/lib/utils'

const TABS = ['people', 'board'] as const
type CommunityTab = (typeof TABS)[number]

function parseTab(value: string): CommunityTab {
  return TABS.find((tab) => tab === value) ?? 'people'
}

/**
 * The weekend hub's underline tabs (see `components/weekend-hub/hub-tabs`),
 * layered over the Radix trigger so keyboard and ARIA behaviour come along.
 */
const TRIGGER_CLASSES = cn(
  '-mb-px h-auto min-h-11 flex-none rounded-none border-0 border-b-2 border-transparent bg-transparent px-0.5 py-0 text-sm font-medium text-muted-foreground shadow-none transition-colors hover:text-foreground',
  'data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-none',
  'dark:text-muted-foreground dark:data-[state=active]:border-primary dark:data-[state=active]:bg-transparent dark:data-[state=active]:text-foreground'
)

type CommunityTabsProps = {
  people: ReactNode
  board: ReactNode
}

/**
 * People and Board as two tabs, kept in `?tab=` (History API, like the
 * directory's own URL state) so either one can be linked to directly.
 */
export function CommunityTabs({ people, board }: CommunityTabsProps) {
  const [tabParam, setTabParam] = useQueryParam(
    'tab',
    stringMarshaller('people')
  )
  const tab = parseTab(tabParam)

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => setTabParam(parseTab(value))}
      className="gap-4"
    >
      <TabsList className="h-auto w-full justify-start gap-6 rounded-none border-b border-border bg-transparent p-0 md:gap-7">
        <TabsTrigger value="people" className={TRIGGER_CLASSES}>
          People
        </TabsTrigger>
        <TabsTrigger value="board" className={TRIGGER_CLASSES}>
          Board
        </TabsTrigger>
      </TabsList>
      <TabsContent value="people">{people}</TabsContent>
      <TabsContent value="board">{board}</TabsContent>
    </Tabs>
  )
}
