/**
 * GAS Webhook helper — POSTs an export payload to the department's
 * Google Apps Script Web App URL.
 */
const GAS_SECRET = import.meta.env.VITE_GAS_SECRET || ''

/**
 * @param {string} webhookUrl   - departments.gas_webhook_url
 * @param {object} payload      - Full enriched payload (see implementation plan)
 * @returns {Promise<{success: boolean, file_url?: string, error?: string}>}
 */
export async function callGasWebhook(webhookUrl, payload) {
  if (!webhookUrl) {
    return { success: false, error: 'ไม่พบ GAS Webhook URL สำหรับแผนกนี้' }
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GAS-Secret': GAS_SECRET,
      },
      body: JSON.stringify(payload),
      // GAS doesn't support CORS OPTIONS — use no-cors for fire-and-forget
      // but we need the response, so we use a GAS Web App with CORS enabled
    })

    if (!res.ok) {
      const text = await res.text()
      return { success: false, error: `HTTP ${res.status}: ${text}` }
    }

    const data = await res.json()
    return data
  } catch (err) {
    console.error('GAS webhook error:', err)
    return { success: false, error: err.message }
  }
}
