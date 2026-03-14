/**
 * Email sender using nodemailer + cPanel SMTP (or any SMTP).
 * Configure in .env:
 *   SMTP_HOST=mail.sharptel.pk
 *   SMTP_PORT=587
 *   SMTP_USER=no-reply@sharptel.pk
 *   SMTP_PASS=your_password
 *   SMTP_FROM=SharpTel LSM <no-reply@sharptel.pk>
 */

import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST || 'mail.sharptel.pk',
  port:   Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT || 587) === 465,
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  tls: { rejectUnauthorized: false },
})

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string | string[]
  subject: string
  html: string
  text?: string
}) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[Email] SMTP not configured — skipping email send')
    return { ok: false, reason: 'SMTP not configured' }
  }
  try {
    await transporter.sendMail({
      from:    process.env.SMTP_FROM || process.env.SMTP_USER,
      to:      Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
      text:    text || html.replace(/<[^>]+>/g, ''),
    })
    return { ok: true }
  } catch (err) {
    console.error('[Email] Send failed:', err)
    return { ok: false, reason: String(err) }
  }
}

export function alertEmailHtml({
  title,
  message,
  entity,
  entityId,
  details,
  appUrl,
}: {
  title: string
  message: string
  entity?: string
  entityId?: string
  details?: Record<string, string>
  appUrl?: string
}) {
  const rows = details
    ? Object.entries(details)
        .map(([k, v]) => `<tr><td style="padding:6px 12px;font-weight:600;color:#374151;background:#f9fafb;border:1px solid #e5e7eb">${k}</td><td style="padding:6px 12px;border:1px solid #e5e7eb">${v}</td></tr>`)
        .join('')
    : ''

  const link =
    appUrl && entity && entityId
      ? `<p style="margin-top:16px"><a href="${appUrl}/${entity}/${entityId}" style="background:#387dff;color:white;padding:8px 16px;border-radius:6px;text-decoration:none;font-size:13px">View in LSM →</a></p>`
      : appUrl
      ? `<p style="margin-top:16px"><a href="${appUrl}" style="background:#387dff;color:white;padding:8px 16px;border-radius:6px;text-decoration:none;font-size:13px">Open LSM Dashboard →</a></p>`
      : ''

  return `
<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;background:#f3f4f6;margin:0;padding:20px">
  <div style="max-width:520px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
    <div style="background:#387dff;padding:20px 24px">
      <p style="margin:0;color:white;font-size:11px;letter-spacing:.05em;text-transform:uppercase;opacity:.8">SharpTel LSM Alert</p>
      <h2 style="margin:4px 0 0;color:white;font-size:18px">${title}</h2>
    </div>
    <div style="padding:24px">
      <p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.6">${message}</p>
      ${rows ? `<table style="width:100%;border-collapse:collapse;font-size:13px">${rows}</table>` : ''}
      ${link}
    </div>
    <div style="background:#f9fafb;padding:12px 24px;font-size:11px;color:#9ca3af;border-top:1px solid #e5e7eb">
      This is an automated alert from SharpTel LSM. To manage alerts, visit the dashboard.
    </div>
  </div>
</body>
</html>`
}
