import { ClipboardCheck } from 'lucide-react'
import { getTeamTodoData } from '@/lib/weekend/team/todos.actions'
import { Typography } from '@/components/ui/typography'
import { Separator } from '@/components/ui/separator'
import { isNil } from 'lodash'
import { TeamMemberTodoClient } from './team-member-todo.client'

/**
 * Displays the signed-in team member's TODO list for their active weekend.
 * Server component that fetches data and delegates rendering to client wrapper.
 */
export async function TeamMemberTodo() {
  const todoData = await getTeamTodoData()

  if (isNil(todoData)) {
    return null
  }

  const { urls, completionState, items, groupMemberId } = todoData
  const serializableItems = items.map((item) => ({
    ...item,
    checkCompletion: undefined,
    params: undefined,
  }))

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm sm:p-6">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
          <ClipboardCheck className="h-5 w-5 text-secondary-foreground" />
        </div>
        <div>
          <Typography variant="h3">Team Member Checklist</Typography>
          <Separator className="mt-2 w-12 bg-primary" />
        </div>
      </div>
      <div className="space-y-1">
        {/*
         * this server / client boundary only exists because we chose to allow
         * some TODO items to be marked off from the client side.
         * If we remove this assumption and save everything in the DB, we can remove this
         * in favor of a simpler, single component
         */}
        <TeamMemberTodoClient
          items={serializableItems}
          urls={urls}
          completionState={completionState}
          groupMemberId={groupMemberId}
        />
      </div>
    </div>
  )
}
