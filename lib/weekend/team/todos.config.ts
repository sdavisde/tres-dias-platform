import { getMyTeamFeeStatus } from '@/services/payment'
import { isTeamFeeSettled } from '@/lib/payments/checkout-price'
import { hasCompletedAllTeamForms } from '@/services/weekend-group-member/weekend-group-member-service'
import { isOk } from '@/lib/results'
import type { TodoItemConfig } from './todos.types'

/**
 * Configuration for team preparation TODO items.
 * These are displayed on the homepage for team members on active weekends.
 */
export const teamTodoItems: TodoItemConfig[] = [
  {
    id: 'team-info',
    label: 'Complete team forms',
    href: '/team-forms',
    checkCompletion: async ({ user }) => {
      const result = await hasCompletedAllTeamForms(
        user.teamMemberInfo.groupMemberId
      )
      return isOk(result) && result.data
    },
  },
  {
    id: 'team-payment',
    label: 'Pay team fees',
    href: '/payment/team-fee',
    checkCompletion: async ({ user }) => {
      // Done only once the full fee is covered (or the role owes none).
      const result = await getMyTeamFeeStatus(user.teamMemberInfo.groupMemberId)
      return isOk(result) && isTeamFeeSettled(result.data)
    },
  },
  {
    id: 'review-job-description',
    label: 'Review Job Description',
    href: '/files/job-descriptions',
    clientSideCompletion: true,
  },
]
