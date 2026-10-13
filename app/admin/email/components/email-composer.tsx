'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { isNil } from 'lodash'
import { ArrowLeft, FlaskConical, Send, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { AutoSaveStatusIndicator } from '@/components/auto-save/auto-save-status'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAutoSave } from '@/hooks/use-auto-save'
import { isDevMode } from '@/lib/dev-mode'
import { isErr } from '@/lib/results'
import { toastError } from '@/lib/toast-error'
import {
  deleteCommunityEmailDraft,
  renderCommunityEmailPreview,
  saveCommunityEmailDraft,
  sendCommunityEmail,
  sendCommunityEmailTest,
} from '@/services/community-email/actions'
import type {
  AudienceOptions,
  Broadcast,
  DeliveryMode,
  DraftUpdate,
} from '@/services/community-email/types'
import { FIRST_NAME_FIELD } from '@/services/community-email/content-constants'
import { AudiencePicker, useAudiencePreview } from './audience-picker'
import { describeAudience } from './audience-label'
import { RichTextEditor } from './rich-text-editor'

type EmailComposerProps = {
  email: Broadcast
  options: AudienceOptions
  senderEmail: string
  fromName: string
  deliveryMode: DeliveryMode
}

/** Visible text in the editor's HTML, for the "is there a message" check. */
function hasText(html: string): boolean {
  return html.replace(/<[^>]*>/g, '').trim() !== ''
}

/**
 * Writing a community email: who it goes to, the subject and the message.
 * Auto-saves as a draft; sending is the one explicit, confirmed step.
 */
export function EmailComposer({
  email,
  options,
  senderEmail,
  fromName,
  deliveryMode,
}: EmailComposerProps) {
  const router = useRouter()
  const [draft, setDraft] = useState<DraftUpdate>({
    subject: email.subject,
    bodyHtml: email.bodyHtml,
    audience: email.audience,
  })
  const [tab, setTab] = useState('write')
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [testing, setTesting] = useState(false)
  const [sending, setSending] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  // The editor owns its content after mount; bumping this remounts it with
  // new content (dev-mode test data).
  const [editorKey, setEditorKey] = useState(0)

  const { status, saveImmediately, flush } = useAutoSave({
    value: draft,
    save: (value) => saveCommunityEmailDraft(email.id, value),
    errorMessage: 'Unable to save this draft. Please try again.',
  })

  const { preview: audiencePreview, loading: audienceLoading } =
    useAudiencePreview(draft.audience)
  const recipientCount = audiencePreview?.count ?? 0

  const update = (patch: Partial<DraftUpdate>) =>
    setDraft((current) => ({ ...current, ...patch }))

  const problem =
    draft.subject.trim() === ''
      ? 'Add a subject first.'
      : !hasText(draft.bodyHtml)
        ? 'Write a message first.'
        : null

  const loadPreview = async () => {
    setPreviewHtml(null)
    const result = await renderCommunityEmailPreview({
      subject: draft.subject,
      bodyHtml: draft.bodyHtml,
    })
    if (isNil(result) || isErr(result)) {
      toastError('Unable to show the preview. Please try again.', {
        error: result?.error,
      })
      return
    }
    setPreviewHtml(result.data)
  }

  const sendTest = async () => {
    if (!isNil(problem)) {
      toast.error(problem)
      return
    }
    setTesting(true)
    const result = await sendCommunityEmailTest({
      subject: draft.subject,
      bodyHtml: draft.bodyHtml,
    })
    setTesting(false)
    if (isNil(result) || isErr(result)) {
      toastError('Unable to send the test email. Please try again.', {
        error: result?.error,
      })
      return
    }
    toast.success(`Test sent to ${result.data}`)
  }

  const send = async () => {
    setSending(true)
    await flush()
    const result = await sendCommunityEmail(email.id)
    if (isNil(result) || isErr(result)) {
      setSending(false)
      setConfirmOpen(false)
      toastError('Unable to send this email. Please try again.', {
        error: result?.error,
      })
      return
    }
    const { sentCount, skippedCount, failedCount } = result.data
    if (failedCount > 0) {
      toast.warning(
        `Sent to ${sentCount}; ${failedCount} could not be delivered.`
      )
    } else if (skippedCount > 0) {
      toast.success(
        `Sent to ${sentCount}. ${skippedCount} skipped on this test deployment.`
      )
    } else {
      toast.success(`Sent to ${sentCount} people.`)
    }
    router.refresh()
  }

  const deleteDraft = async () => {
    const result = await deleteCommunityEmailDraft(email.id)
    if (isNil(result) || isErr(result)) {
      toastError('Unable to delete this draft. Please try again.', {
        error: result?.error,
      })
      return
    }
    router.push('/admin/email')
  }

  const fillWithTestData = () => {
    update({
      subject: 'Secuela this Thursday',
      bodyHtml: `<p>Hi ${FIRST_NAME_FIELD},</p><p>Join us for secuela this <strong>Thursday at 7pm</strong> in the fellowship hall. Bring a friend!</p><ul><li>Worship</li><li>Fourth day talk</li><li>Dessert</li></ul><p>De Colores!</p>`,
    })
    setEditorKey((key) => key + 1)
  }

  const sandboxOthers =
    deliveryMode.kind === 'sandbox'
      ? (audiencePreview?.people ?? []).filter(
          (person) => !deliveryMode.allowed.includes(person.email)
        ).length
      : 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="size-11">
            <Link href="/admin/email" aria-label="Back to all emails">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="font-serif text-2xl font-semibold tracking-tight">
              {draft.subject.trim() === '' ? 'New email' : draft.subject}
            </h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              Draft
              <AutoSaveStatusIndicator status={status} onRetry={flush} />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="h-11">
                <Trash2 className="size-4" />
                Delete draft
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this draft?</AlertDialogTitle>
                <AlertDialogDescription>
                  It hasn&apos;t been sent to anyone. This can&apos;t be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep it</AlertDialogCancel>
                <AlertDialogAction onClick={deleteDraft}>
                  Delete draft
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button
            variant="outline"
            className="h-11"
            disabled={testing}
            onClick={sendTest}
          >
            <FlaskConical className="size-4" />
            {testing ? 'Sending test…' : 'Send test to me'}
          </Button>
          <AlertDialog
            open={confirmOpen}
            onOpenChange={(open) => !sending && setConfirmOpen(open)}
          >
            <Button
              className="h-11"
              disabled={audienceLoading || recipientCount === 0}
              onClick={() => {
                if (!isNil(problem)) {
                  toast.error(problem)
                  return
                }
                setConfirmOpen(true)
              }}
            >
              <Send className="size-4" />
              Review &amp; send
            </Button>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Send to {recipientCount}{' '}
                  {recipientCount === 1 ? 'person' : 'people'}?
                </AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <dl className="grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-1.5 text-left text-sm">
                    <dt className="text-muted-foreground">To</dt>
                    <dd>{describeAudience(draft.audience, options)}</dd>
                    <dt className="text-muted-foreground">From</dt>
                    <dd>{fromName}</dd>
                    <dt className="text-muted-foreground">Replies go to</dt>
                    <dd className="break-all">{senderEmail}</dd>
                    <dt className="text-muted-foreground">Subject</dt>
                    <dd>{draft.subject}</dd>
                  </dl>
                </AlertDialogDescription>
              </AlertDialogHeader>
              {deliveryMode.kind === 'sandbox' && (
                <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                  Test deployment: only{' '}
                  {deliveryMode.allowed.length > 0
                    ? deliveryMode.allowed.join(', ')
                    : 'allow-listed addresses'}{' '}
                  will actually get it. The other {sandboxOthers} will be
                  recorded as skipped.
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                This can&apos;t be unsent.
              </p>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={sending}>Cancel</AlertDialogCancel>
                <Button disabled={sending} onClick={send}>
                  {sending ? 'Sending…' : 'Send now'}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {deliveryMode.kind === 'sandbox' && (
        <Alert>
          <FlaskConical className="size-4" />
          <AlertTitle>Test deployment</AlertTitle>
          <AlertDescription>
            Sends from here only reach {senderEmail}
            {deliveryMode.allowed.length > 1 && ' and the allowlist'}. Everyone
            else in the group is recorded as skipped, so you can try the whole
            flow without emailing the community.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="space-y-6">
          <AudiencePicker
            audience={draft.audience}
            options={options}
            preview={audiencePreview}
            loading={audienceLoading}
            onChange={(audience) => {
              saveImmediately()
              update({ audience })
            }}
          />

          {isDevMode() && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              onClick={fillWithTestData}
            >
              Fill with test data
            </Button>
          )}

          <div className="space-y-2">
            <Label htmlFor="email-subject">Subject</Label>
            <Input
              id="email-subject"
              className="h-11"
              maxLength={200}
              placeholder="e.g. Secuela this Thursday"
              value={draft.subject}
              onChange={(event) => update({ subject: event.target.value })}
            />
          </div>

          <Tabs
            value={tab}
            onValueChange={(next) => {
              setTab(next)
              if (next === 'preview') void loadPreview()
            }}
          >
            <TabsList>
              <TabsTrigger value="write">Write</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
            <TabsContent value="write" className="space-y-2">
              <RichTextEditor
                key={editorKey}
                value={draft.bodyHtml}
                onChange={(bodyHtml) => update({ bodyHtml })}
              />
              <p className="text-xs text-muted-foreground">
                <code>{FIRST_NAME_FIELD}</code> becomes each person&apos;s first
                name. Every email ends with an unsubscribe link.
              </p>
            </TabsContent>
            <TabsContent value="preview">
              {isNil(previewHtml) ? (
                <div className="flex h-[480px] items-center justify-center rounded-md border text-sm text-muted-foreground">
                  Loading preview…
                </div>
              ) : (
                <iframe
                  title="Email preview"
                  sandbox=""
                  srcDoc={previewHtml}
                  className="h-[640px] w-full rounded-md border bg-white"
                />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
