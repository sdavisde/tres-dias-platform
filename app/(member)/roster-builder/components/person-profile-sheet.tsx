'use client'

import { isNil } from 'lodash'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { RosterBuilderCommunityMember } from '@/services/roster-builder'
import type { MemberAssignment } from './roster-builder-types'
import { PersonProfile, RosterAssignmentNotice } from './person-profile'

/**
 * The board's read-only profile for someone already in a slot, opened from
 * the info button on their card.
 */
export function PersonProfileSheet({
  open,
  member,
  assignment,
  onClose,
}: {
  open: boolean
  member: RosterBuilderCommunityMember | null
  assignment: MemberAssignment | undefined
  onClose: () => void
}) {
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="right"
        className="flex flex-col gap-0 p-0 sm:max-w-lg"
      >
        <SheetDescription className="sr-only">
          Contact details and service history for this team member.
        </SheetDescription>
        {isNil(member) ? (
          <SheetTitle className="sr-only">No person selected</SheetTitle>
        ) : (
          <ScrollArea key={member.id} className="min-h-0 flex-1">
            <PersonProfile
              member={member}
              nameAsSheetTitle
              action={
                isNil(assignment) ? undefined : (
                  <RosterAssignmentNotice assignment={assignment} />
                )
              }
            />
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  )
}
