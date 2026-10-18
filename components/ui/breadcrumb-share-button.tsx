'use client'

import { Check, Link2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useShare } from '@/hooks/use-share'
import { cn } from '@/lib/utils'

type BreadcrumbShareButtonProps = {
  /** The page title, used as the label of the native share sheet. */
  title: string
}

/**
 * Copy-link control that sits beside the current page in
 * the admin and member breadcrumb trails. It stays hidden until the breadcrumb bar is
 * hovered or the button is focused, so it never competes with the trail; on
 * touch devices (no hover) it is always shown. It also stays visible while the
 * "copied" check is showing so the confirmation isn't lost when the pointer
 * leaves.
 *
 * The URL is read from the browser rather than `getUrl()` because `SITE_URL`
 * is a server-only env var — it is inlined as `undefined` in client bundles.
 */
export function BreadcrumbShareButton({ title }: BreadcrumbShareButtonProps) {
  const { share, linkCopied } = useShare()

  const handleShare = () => {
    const { origin, pathname, search } = window.location
    // Hash is dropped on purpose: it is view state, not a shareable location.
    void share({ title, url: `${origin}${pathname}${search}` })
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={cn(
            // 44px touch target on phones, compact beside the trail on desktop.
            'text-muted-foreground',
            // `!` so the reveals win over the hide regardless of variant order.
            'transition-opacity [@media(hover:hover)]:opacity-0',
            'group-hover/breadcrumbs:opacity-100! focus-visible:opacity-100!',
            linkCopied && 'opacity-100!'
          )}
          onClick={handleShare}
          aria-label="Copy link to this page"
        >
          {linkCopied ? (
            <Check className="h-4 w-4" aria-hidden />
          ) : (
            <Link2 className="h-4 w-4" aria-hidden />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>Copy link to this page</TooltipContent>
    </Tooltip>
  )
}
