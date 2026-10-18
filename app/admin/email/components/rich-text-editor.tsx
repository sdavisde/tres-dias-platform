'use client'

import { useState, type ReactNode } from 'react'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Placeholder } from '@tiptap/extensions'
import {
  Bold,
  Heading2,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Underline,
  UserRound,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { FIRST_NAME_FIELD } from '@/services/community-email/content-constants'

type RichTextEditorProps = {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  disabled?: boolean
}

/**
 * The community email editor: a Google Docs-style box with just the
 * formatting an announcement needs. What it produces is sanitized again on
 * the server, so pasting from Word or a web page can't smuggle anything in.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write your message…',
  disabled = false,
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: 'https',
        },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': 'Message',
        class: 'min-h-[280px] px-4 py-3 focus:outline-none',
      },
    },
    onUpdate: ({ editor: current }) => onChange(current.getHTML()),
  })

  const active = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current?.isActive('bold') ?? false,
      italic: current?.isActive('italic') ?? false,
      underline: current?.isActive('underline') ?? false,
      heading: current?.isActive('heading', { level: 2 }) ?? false,
      bulletList: current?.isActive('bulletList') ?? false,
      orderedList: current?.isActive('orderedList') ?? false,
      blockquote: current?.isActive('blockquote') ?? false,
      link: current?.isActive('link') ?? false,
    }),
  })

  const chain = () => editor?.chain().focus()

  return (
    <div
      className={cn(
        'rounded-md border border-input bg-background shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50',
        disabled && 'opacity-60'
      )}
    >
      <div
        role="toolbar"
        aria-label="Formatting"
        className="flex flex-wrap items-center gap-0.5 border-b px-1.5 py-1"
      >
        <ToolbarButton
          label="Bold"
          active={active?.bold}
          onClick={() => chain()?.toggleBold().run()}
        >
          <Bold className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          active={active?.italic}
          onClick={() => chain()?.toggleItalic().run()}
        >
          <Italic className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Underline"
          active={active?.underline}
          onClick={() => chain()?.toggleUnderline().run()}
        >
          <Underline className="size-4" />
        </ToolbarButton>
        <Separator orientation="vertical" className="mx-1 h-5!" />
        <ToolbarButton
          label="Heading"
          active={active?.heading}
          onClick={() => chain()?.toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Bulleted list"
          active={active?.bulletList}
          onClick={() => chain()?.toggleBulletList().run()}
        >
          <List className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          active={active?.orderedList}
          onClick={() => chain()?.toggleOrderedList().run()}
        >
          <ListOrdered className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Quote"
          active={active?.blockquote}
          onClick={() => chain()?.toggleBlockquote().run()}
        >
          <Quote className="size-4" />
        </ToolbarButton>
        <LinkButton
          active={active?.link ?? false}
          currentHref={editor?.getAttributes('link').href as string | undefined}
          onApply={(href) => {
            if (href === '') {
              chain()?.extendMarkRange('link').unsetLink().run()
              return
            }
            chain()?.extendMarkRange('link').setLink({ href }).run()
          }}
        />
        <Separator orientation="vertical" className="mx-1 h-5!" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1.5 text-[13px]"
          onClick={() => chain()?.insertContent(FIRST_NAME_FIELD).run()}
        >
          <UserRound className="size-4" />
          First name
        </Button>
      </div>
      <EditorContent
        editor={editor}
        className={cn(
          'text-[15px] leading-relaxed',
          '[&_p]:my-2 [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1.5 [&_h3]:text-lg [&_h3]:font-semibold',
          '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_li_p]:my-0.5',
          '[&_blockquote]:my-2 [&_blockquote]:border-l-[3px] [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground',
          '[&_a]:text-primary [&_a]:underline',
          '[&_p.is-editor-empty:first-child]:before:pointer-events-none [&_p.is-editor-empty:first-child]:before:float-left [&_p.is-editor-empty:first-child]:before:h-0 [&_p.is-editor-empty:first-child]:before:text-muted-foreground [&_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]'
        )}
      />
    </div>
  )
}

function ToolbarButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string
  active?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      aria-pressed={active ?? false}
      title={label}
      className={cn(active === true && 'bg-accent')}
      onClick={onClick}
    >
      {children}
    </Button>
  )
}

function LinkButton({
  active,
  currentHref,
  onApply,
}: {
  active: boolean
  currentHref: string | undefined
  onApply: (href: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [href, setHref] = useState('')

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) setHref(currentHref ?? '')
        setOpen(next)
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Link"
          title="Link"
          aria-pressed={active}
          className={cn(active && 'bg-accent')}
        >
          <Link2 className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-2" align="start">
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            onApply(href.trim())
            setOpen(false)
          }}
        >
          <Input
            autoFocus
            aria-label="Link address"
            placeholder="https://…"
            value={href}
            onChange={(event) => setHref(event.target.value)}
          />
          <Button type="submit">
            {href.trim() === '' ? 'Remove' : 'Apply'}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground">
          Select text first to turn it into a link.
        </p>
      </PopoverContent>
    </Popover>
  )
}
