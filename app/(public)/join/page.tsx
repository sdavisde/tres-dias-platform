import AuthShell from '@/components/auth/AuthShell'
import AuthForm from '@/components/auth/AuthForm'

interface JoinPageProps {
  searchParams: Promise<{ redirectTo?: string }>
}

export default async function JoinPage({ searchParams }: JoinPageProps) {
  const { redirectTo } = await searchParams
  return (
    <AuthShell>
      <AuthForm redirectTo={redirectTo} defaultMode="register" />
    </AuthShell>
  )
}
