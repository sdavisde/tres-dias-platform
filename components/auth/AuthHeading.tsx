import type { ReactNode } from 'react'
import { isNil } from 'lodash'

/** Serif title and supporting line at the top of each auth form. */
export default function AuthHeading({
  title,
  description,
  icon,
}: {
  title: string
  description?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="mb-2 space-y-2">
      {icon}
      <h1 className="font-serif text-3xl font-semibold tracking-tight">
        {title}
      </h1>
      {!isNil(description) && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  )
}
