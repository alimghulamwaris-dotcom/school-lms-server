/**
 * whatsappRateLimiter.ts
 *
 * Anti-ban rate-limit layer for Baileys WhatsApp sends.
 * Implements the spec from Steps 3–4 of the anti-ban protection design.
 *
 * KEY DESIGN DECISIONS:
 * - State is stored on WhatsAppSession (one doc per school) — already perfectly
 *   scoped to schoolId with unique index, zero cross-school leakage risk.
 * - reserveSendSlot() uses a single atomic findOneAndUpdate so concurrent calls
 *   (e.g. a scheduled campaign tick firing at the same millisecond as an
 *   attendance save) can never double-count: MongoDB's document-level locking
 *   serialises updates to the same schoolId document.
 */

import type { WAPresence, WASocket } from '@whiskeysockets/baileys'
import whatsappSessionModel from '../APIs/whatsapp/_shared/models/whatsappSession.model'

// ---------------------------------------------------------------------------
// Env-configurable constants (Step 7)
// ---------------------------------------------------------------------------

/** Minimum random inter-message delay in ms (default 3 s) */
export const WHATSAPP_MIN_DELAY_MS = process.env.WHATSAPP_MIN_DELAY_MS ? Number(process.env.WHATSAPP_MIN_DELAY_MS) : 3000

/** Maximum random inter-message delay in ms (default 8 s) */
export const WHATSAPP_MAX_DELAY_MS = process.env.WHATSAPP_MAX_DELAY_MS ? Number(process.env.WHATSAPP_MAX_DELAY_MS) : 8000

/** Full (warmed-up) daily send cap (default 40) */
export const WHATSAPP_DAILY_CAP = process.env.WHATSAPP_DAILY_CAP ? Number(process.env.WHATSAPP_DAILY_CAP) : 40

/**
 * Number of days to ramp up from ~10% to 100% of WHATSAPP_DAILY_CAP.
 * On day 1 the effective cap is floor(DAILY_CAP * 0.10).
 * On day WARMUP_DAYS the effective cap equals DAILY_CAP.
 * Beyond WARMUP_DAYS the effective cap stays at DAILY_CAP.
 */
export const WHATSAPP_WARMUP_DAYS = process.env.WHATSAPP_WARMUP_DAYS ? Number(process.env.WHATSAPP_WARMUP_DAYS) : 7

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns today's date as YYYY-MM-DD (local system date) */
export const todayString = (): string => {
    const d = new Date()
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
}

/** Random integer between min (inclusive) and max (inclusive) */
const randomBetween = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min

/** Sleep for the given number of ms */
export const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

// ---------------------------------------------------------------------------
// Step 8: getEffectiveDailyCap
// ---------------------------------------------------------------------------

/**
 * Computes the warmup-scaled effective daily cap for a school.
 *
 * Warmup curve (linear):
 *   day 1  → floor(DAILY_CAP × 0.10)  (10 % of full cap)
 *   day 2  → floor(DAILY_CAP × 0.24)
 *   …
 *   day N  → floor(DAILY_CAP × (0.10 + 0.90 × (N-1)/(WARMUP_DAYS-1)))
 *   day N> WARMUP_DAYS → DAILY_CAP  (full cap, no warmup scaling)
 *
 * If connectedAt is null/undefined the school is treated as fully warmed up
 * (returns full DAILY_CAP). This is intentional: schools that were connected
 * before this feature was deployed should not be penalised.
 *
 * @param connectedAt  The date the Baileys session first went 'open'
 * @returns            The effective cap integer (≥ 1)
 */
export const getEffectiveDailyCap = (connectedAt: Date | null | undefined): number => {
    if (!connectedAt) {
        // No connectedAt → treat as fully warmed up
        return WHATSAPP_DAILY_CAP
    }

    const msPerDay = 24 * 60 * 60 * 1000
    const daysSince = Math.floor((Date.now() - new Date(connectedAt).getTime()) / msPerDay)
    // daysSince = 0 on the first calendar day, 1 on the second, etc.
    const dayNumber = daysSince + 1 // 1-indexed

    if (dayNumber >= WHATSAPP_WARMUP_DAYS) {
        return WHATSAPP_DAILY_CAP
    }

    // Linear interpolation: day 1 → 10%, day WARMUP_DAYS → 100%
    const fraction = 0.1 + 0.9 * ((dayNumber - 1) / Math.max(WHATSAPP_WARMUP_DAYS - 1, 1))
    return Math.max(1, Math.floor(WHATSAPP_DAILY_CAP * fraction))
}

// ---------------------------------------------------------------------------
// Step 9: reserveSendSlot — one conditional atomic findOneAndUpdate
// ---------------------------------------------------------------------------

/**
 * Atomically reserves one send slot for `schoolId` against today's quota.
 *
 * RACE SAFETY:
 *   The date rollover and same-day increment are two branches of one update
 *   pipeline. MongoDB serialises writes to one session document, and the
 *   filter re-evaluates the cap when the write obtains the document lock.
 *   A caller therefore cannot be granted a slot unless its own update matched.
 *
 * @returns true  → slot reserved, caller may send
 *          false → cap reached for today, caller must NOT send
 */
export const reserveSendSlot = async (schoolId: string): Promise<boolean> => {
    const today = todayString()

    // First, load the session to determine the effective cap (we need connectedAt).
    // We do this outside the atomic update because the cap is read-only input.
    const session = await whatsappSessionModel
        .findOne({ schoolId })
        .select({ connectedAt: 1, dailySendCount: 1, dailySendDate: 1 })
        .lean<{ connectedAt?: Date | null; dailySendCount?: number; dailySendDate?: string | null } | null>()

    const connectedAt = session?.connectedAt ?? null
    const effectiveCap = getEffectiveDailyCap(connectedAt)

    // One atomic operation covers every case:
    // - no date / a prior date: start today's count at 1;
    // - today's date and count below cap: increment it;
    // - today's date at cap: match nothing and deny the send.
    //
    // `connectedAt` is read only to derive the warm-up cap. It is not a
    // reservation decision; the date/count decision is entirely atomic here.
    const updated = await whatsappSessionModel.findOneAndUpdate(
        {
            schoolId,
            $expr: {
                $or: [
                    { $ne: [{ $ifNull: ['$dailySendDate', null] }, today] },
                    {
                        $and: [{ $eq: ['$dailySendDate', today] }, { $lt: [{ $ifNull: ['$dailySendCount', 0] }, effectiveCap] }]
                    }
                ]
            }
        },
        [
            {
                $set: {
                    dailySendDate: today,
                    dailySendCount: {
                        $cond: [{ $eq: ['$dailySendDate', today] }, { $add: [{ $ifNull: ['$dailySendCount', 0] }, 1] }, 1]
                    }
                }
            }
        ],
        { new: true }
    )

    // A null result means the document was already at today's cap when this
    // caller acquired its write lock.
    return updated !== null
}

// ---------------------------------------------------------------------------
// Delay + presence helpers (Steps 11–12) — exported so whatsappService can use them
// ---------------------------------------------------------------------------

/**
 * Applies a uniformly random delay between WHATSAPP_MIN_DELAY_MS and
 * WHATSAPP_MAX_DELAY_MS (Step 11).
 */
export const applyInterMessageDelay = (): Promise<void> => {
    const ms = randomBetween(WHATSAPP_MIN_DELAY_MS, WHATSAPP_MAX_DELAY_MS)
    return sleep(ms)
}

/**
 * Simulates human typing presence before a real send (Step 12).
 * Errors are silently swallowed — a presence failure NEVER blocks or breaks
 * the real sock.sendMessage() call.
 *
 * @param sock  The live Baileys WASocket
 * @param jid   The recipient JID (e.g. "923001234567@s.whatsapp.net")
 */
export const simulatePresence = async (sock: WASocket, jid: string): Promise<void> => {
    try {
        await sock.sendPresenceUpdate('composing' as WAPresence, jid)
        await sleep(randomBetween(1000, 3000))
        await sock.sendPresenceUpdate('paused' as WAPresence, jid)
    } catch {
        // Intentionally ignored — presence errors must never propagate (Step 12)
    }
}
