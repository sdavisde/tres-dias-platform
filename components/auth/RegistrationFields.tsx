import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GenderToggle } from '@/components/ui/gender-toggle'
import { Checkbox } from '@/components/ui/checkbox'

interface RegistrationFieldsProps {
  firstName: string
  setFirstName: (value: string) => void
  lastName: string
  setLastName: (value: string) => void
  gender: 'male' | 'female' | null
  setGender: (value: 'male' | 'female') => void
  isClergy: boolean
  setIsClergy: (value: boolean) => void
}

export default function RegistrationFields({
  firstName,
  setFirstName,
  lastName,
  setLastName,
  gender,
  setGender,
  isClergy,
  setIsClergy,
}: RegistrationFieldsProps) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="John"
            autoComplete="given-name"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Doe"
            autoComplete="family-name"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Gender</Label>
        <GenderToggle value={gender} onChange={setGender} />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="isClergy"
          checked={isClergy}
          onCheckedChange={(checked) => setIsClergy(checked === true)}
        />
        <Label htmlFor="isClergy" className="font-normal">
          I am ordained clergy
        </Label>
      </div>
    </>
  )
}
