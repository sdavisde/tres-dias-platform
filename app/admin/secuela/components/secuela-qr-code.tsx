'use client'

import { useRef } from 'react'
import { isNil } from 'lodash'
import { QRCodeCanvas } from 'qrcode.react'
import { Copy, Download, Printer } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { toastError } from '@/lib/toast-error'

const QR_SIZE = 1024
const QR_DISPLAY_SIZE = 192

interface SecuelaQrCodeProps {
  signInUrl: string
  /** Heading printed above the code, e.g. "DTTD #13 Secuela". */
  label: string
  /** "Saturday, October 10, 2026 at 9:00 AM CT", printed under the code. */
  when: string
  location: string | null
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

/**
 * Zero page margins stop the browser printing its own header and footer
 * (date, title, URL, page number); the sign pads itself instead.
 */
const PRINT_STYLES = `
  @page { size: letter portrait; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    color: #2b2420;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .sign {
    height: 100vh;
    padding: 0.75in;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
  }
  .frame {
    width: 100%;
    max-width: 6.5in;
    border: 2px solid #2b2420;
    border-radius: 24px;
    padding: 0.55in 0.5in 0.5in;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .eyebrow {
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: #7a6a5f;
  }
  h1 {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 46px;
    font-weight: 600;
    line-height: 1.1;
    margin-top: 10px;
  }
  .lead { font-size: 20px; margin-top: 10px; color: #4a3f38; }
  .qr {
    width: 3.9in;
    height: 3.9in;
    margin: 0.35in 0 0.3in;
  }
  .steps {
    display: flex;
    gap: 22px;
    justify-content: center;
    font-size: 14px;
    color: #4a3f38;
  }
  .step { display: flex; align-items: center; gap: 8px; }
  .num {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #2b2420;
    color: #fff;
    font-size: 12px;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .details {
    margin-top: 0.3in;
    padding-top: 0.2in;
    border-top: 1px solid #ddd3cb;
    width: 100%;
    font-size: 14px;
    color: #4a3f38;
    line-height: 1.6;
  }
  .url { margin-top: 4px; font-size: 12px; color: #7a6a5f; }
`

function buildPrintSign({
  label,
  when,
  location,
  qrDataUrl,
  displayUrl,
}: {
  label: string
  when: string
  location: string | null
  qrDataUrl: string
  displayUrl: string
}): string {
  const details = [when, location].filter(
    (part): part is string => !isNil(part) && part !== ''
  )
  return `
    <main class="sign">
      <div class="frame">
        <p class="eyebrow">Welcome to Secuela</p>
        <h1>${escapeHtml(label)}</h1>
        <p class="lead">Scan to sign in and let us know you&rsquo;re here</p>
        <img class="qr" src="${qrDataUrl}" alt="Secuela sign-in QR code" />
        <div class="steps">
          <span class="step"><span class="num">1</span>Open your camera</span>
          <span class="step"><span class="num">2</span>Scan the code</span>
          <span class="step"><span class="num">3</span>Tap Confirm Attendance</span>
        </div>
        <div class="details">
          <p>${details.map(escapeHtml).join(' &middot; ')}</p>
          <p class="url">No camera? Visit ${escapeHtml(displayUrl)}</p>
        </div>
      </div>
    </main>
  `
}

/**
 * QR code for the secuela sign-in page. The page always signs people in to
 * the active group, so one code works for every secuela.
 */
export function SecuelaQrCode({
  signInUrl,
  label,
  when,
  location,
}: SecuelaQrCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const getPngDataUrl = () => canvasRef.current?.toDataURL('image/png') ?? null

  const handleDownload = () => {
    const dataUrl = getPngDataUrl()
    if (dataUrl === null) return
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = 'secuela-sign-in-qr.png'
    link.click()
  }

  const handlePrint = () => {
    const dataUrl = getPngDataUrl()
    const printWindow = window.open('', '_blank')
    if (dataUrl === null || printWindow === null) {
      toastError('Unable to open the print view. Please try again.', {
        error: 'Print window blocked or QR canvas missing',
      })
      return
    }
    const doc = printWindow.document
    doc.title = `${label} sign-in`
    doc.head.innerHTML = `<style>${PRINT_STYLES}</style>`
    doc.body.innerHTML = buildPrintSign({
      label,
      when,
      location,
      qrDataUrl: dataUrl,
      displayUrl: signInUrl.replace(/^https?:\/\//, ''),
    })
    const image = doc.querySelector('img')
    if (image?.complete === true) printWindow.print()
    else image?.addEventListener('load', () => printWindow.print())
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(signInUrl)
      toast.success('Sign-in link copied')
    } catch (error) {
      toastError('Unable to copy the link.', { error })
    }
  }

  return (
    <div className="flex w-full flex-col items-center gap-4 md:w-72">
      <div className="rounded-lg border bg-white p-3">
        {/* Rendered large for a crisp PNG/print, displayed small */}
        <QRCodeCanvas
          ref={canvasRef}
          value={signInUrl}
          size={QR_SIZE}
          marginSize={2}
          // The canvas sets inline width/height to `size`, so only an inline
          // style can shrink it on screen
          style={{ width: QR_DISPLAY_SIZE, height: QR_DISPLAY_SIZE }}
        />
      </div>
      <p className="max-w-full break-all text-center text-xs text-muted-foreground">
        {signInUrl}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="outline" onClick={handleDownload}>
          <Download className="mr-2 h-4 w-4" />
          Download PNG
        </Button>
        <Button variant="outline" onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" />
          Print
        </Button>
        <Button variant="ghost" onClick={handleCopy}>
          <Copy className="mr-2 h-4 w-4" />
          Copy link
        </Button>
      </div>
    </div>
  )
}
