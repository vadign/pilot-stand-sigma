import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export const SessionQrCode = ({
  value,
  className = '',
}: {
  value: string
  className?: string
}) => {
  const [svgMarkup, setSvgMarkup] = useState('')

  useEffect(() => {
    let cancelled = false

    void QRCode.toString(value, {
      type: 'svg',
      errorCorrectionLevel: 'H',
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    }).then((markup: string) => {
      if (cancelled) return
      setSvgMarkup(markup)
    }).catch(() => {
      if (cancelled) return
      setSvgMarkup('')
    })

    return () => {
      cancelled = true
    }
  }, [value])

  return (
    <div
      aria-label="QR-код сессии"
      role="img"
      className={`aspect-square w-full max-w-[280px] rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${className}`.trim()}
    >
      {svgMarkup ? (
        <div
          className="h-full w-full"
          dangerouslySetInnerHTML={{ __html: svgMarkup }}
        />
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-slate-400">
          Готовлю QR-код…
        </div>
      )}
    </div>
  )
}
