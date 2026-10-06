import AuthShell from '@/components/auth/AuthShell'
import AuthForm from '@/components/auth/AuthForm'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle } from 'lucide-react'
import { isNil } from 'lodash'

interface LoginPageProps {
  searchParams: Promise<{ redirectTo?: string; message?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { redirectTo, message } = await searchParams
  return (
    <AuthShell>
      {!isNil(message) && (
        <Alert variant="success" className="mb-6">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
      <AuthForm redirectTo={redirectTo} />
    </AuthShell>
  )
}
