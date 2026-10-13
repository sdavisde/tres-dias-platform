import { Users } from 'lucide-react'
import { UserAvatarWithPreview } from '@/components/user-avatar'
import { formatPhoneNumber } from '@/lib/utils'
import type {
  CommunityPosition,
  PositionHolder,
} from '@/services/community/board'
import { ContactButtons } from './contact-buttons'

function holderName(holder: PositionHolder): string {
  const name = [holder.firstName, holder.lastName].filter(Boolean).join(' ')
  return name !== '' ? name : (holder.email ?? 'Unnamed member')
}

function HolderRow({ holder }: { holder: PositionHolder }) {
  const name = holderName(holder)

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <UserAvatarWithPreview
        user={{
          id: holder.id,
          first_name: holder.firstName,
          last_name: holder.lastName,
          email: holder.email,
          phone_number: holder.phoneNumber,
          profilePhoto: holder.profilePhoto,
        }}
        size={32}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{name}</div>
        {holder.phoneNumber !== null && (
          <div className="truncate text-xs tabular-nums text-muted-foreground">
            {formatPhoneNumber(holder.phoneNumber)}
          </div>
        )}
      </div>
      <ContactButtons
        name={name}
        phoneNumber={holder.phoneNumber}
        email={holder.email}
      />
    </div>
  )
}

/**
 * One position: its label on the left, whoever holds it on the right. A
 * committee-typed position says so and lists every member, so a reader can
 * tell "the Treasurer" from "the At-Large Members" at a glance.
 */
function PositionRow({ position }: { position: CommunityPosition }) {
  const isCommittee = position.type === 'COMMITTEE'
  const count = position.holders.length

  return (
    <div className="flex flex-col gap-2.5 border-b border-divider py-3 last:border-b-0 sm:flex-row sm:gap-3.5">
      <div
        className="min-w-0 sm:w-48 sm:shrink-0 sm:pt-1.5"
        title={position.description ?? undefined}
      >
        <div className="text-sm font-semibold">{position.label}</div>
        {isCommittee && (
          <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="size-3.5" />
            Committee
            {count > 0 && ` · ${count} member${count === 1 ? '' : 's'}`}
          </div>
        )}
      </div>
      {count === 0 ? (
        <div className="flex items-center sm:min-h-8">
          <span className="text-sm text-muted-foreground">
            {isCommittee ? 'No members yet' : 'Open'}
          </span>
        </div>
      ) : (
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          {position.holders.map((holder) => (
            <HolderRow key={holder.id} holder={holder} />
          ))}
        </div>
      )}
    </div>
  )
}

type PositionsSectionProps = {
  title: string
  positions: CommunityPosition[]
  emptyMessage: string
}

export function PositionsSection({
  title,
  positions,
  emptyMessage,
}: PositionsSectionProps) {
  return (
    <section>
      <div className="flex items-baseline justify-between gap-3 border-b border-border pb-2">
        <h2 className="font-serif text-lg font-semibold tracking-tight">
          {title}
        </h2>
        {positions.length > 0 && (
          <span className="text-[13px] text-muted-foreground">
            {positions.length}
          </span>
        )}
      </div>
      {positions.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      ) : (
        positions.map((position) => (
          <PositionRow key={position.id} position={position} />
        ))
      )}
    </section>
  )
}
