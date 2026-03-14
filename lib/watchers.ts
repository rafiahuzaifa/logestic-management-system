/**
 * Watcher engine — checks configured watchers and sends email alerts.
 *
 * How it works:
 * 1. User configures a Watcher: entity="product", event="low_stock", emailTo="mgr@company.com", threshold=10
 * 2. When stock drops → we call triggerWatchers({ entityType:'product', eventType:'low_stock', ... })
 * 3. We find all active watchers matching entity+event, optionally check threshold
 * 4. Send email to watcher.emailTo
 * 5. Log to EmailLog table
 */

import { prisma } from './prisma'
import { sendEmail, alertEmailHtml } from './email'

type TriggerInput = {
  entityType: string           // 'product' | 'shipment' | 'sales_order' | 'purchase_order' | 'invoice'
  eventType:  string           // 'low_stock' | 'status_change' | 'delayed' | 'overdue' | 'created' | 'paid'
  entityId?:  string
  title:      string
  message:    string
  details?:   Record<string, string>
  numericValue?: number        // e.g. current stock level — compared to threshold
}

const APP_URL = process.env.NEXTAUTH_URL || process.env.FRONTEND_URL || 'https://lsm-ashy.vercel.app'

const entityPath: Record<string, string> = {
  product:        'inventory',
  shipment:       'shipments',
  sales_order:    'sales-orders',
  purchase_order: 'purchase-orders',
  invoice:        'invoices',
}

export async function triggerWatchers(input: TriggerInput) {
  try {
    // Find all active watchers matching entity + event
    const watchers = await prisma.watcher.findMany({
      where: {
        entityType: input.entityType,
        eventType:  input.eventType,
        isActive:   true,
      },
    })

    if (!watchers.length) return

    for (const watcher of watchers) {
      // Threshold check: if watcher has a threshold, only fire if value <= threshold
      if (watcher.threshold !== null && input.numericValue !== undefined) {
        if (input.numericValue > Number(watcher.threshold)) continue
      }

      const html = alertEmailHtml({
        title:    input.title,
        message:  input.message,
        entity:   entityPath[input.entityType],
        entityId: input.entityId,
        details:  input.details,
        appUrl:   APP_URL,
      })

      const result = await sendEmail({
        to:      watcher.emailTo,
        subject: `[SharpTel LSM] ${input.title}`,
        html,
      })

      // Log every attempt
      await prisma.emailLog.create({
        data: {
          to:      watcher.emailTo,
          subject: `[SharpTel LSM] ${input.title}`,
          status:  result.ok ? 'sent' : 'failed',
        },
      })
    }
  } catch (err) {
    // Watcher failures must NEVER break the main flow
    console.error('[Watchers]', err)
  }
}
