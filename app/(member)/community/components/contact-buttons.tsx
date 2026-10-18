import { isNil } from 'lodash'
import { Mail, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'

type ContactButtonsProps = {
  name: string
  phoneNumber: string | null
  email: string | null
}

/** Call and email shortcuts; each is left out when the person hasn't given one. */
export function ContactButtons({
  name,
  phoneNumber,
  email,
}: ContactButtonsProps) {
  const digits = phoneNumber?.replace(/\D/g, '') ?? ''

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      {digits !== '' && (
        <Button asChild variant="outline" size="icon-sm">
          <a href={`tel:${digits}`} aria-label={`Call ${name}`}>
            <Phone className="size-4" />
          </a>
        </Button>
      )}
      {!isNil(email) && email !== '' && (
        <Button asChild variant="outline" size="icon-sm">
          <a href={`mailto:${email}`} aria-label={`Email ${name}`}>
            <Mail className="size-4" />
          </a>
        </Button>
      )}
    </div>
  )
}
