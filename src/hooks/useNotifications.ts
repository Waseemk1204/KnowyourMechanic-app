/**
 * Push notifications are disabled for now.
 *
 * The old implementation used Firebase Cloud Messaging (web push) against the
 * retired Node backend. For the Capacitor native app, push should be re-added
 * with @capacitor/push-notifications (native FCM/APNs) wired to Supabase — a
 * separate follow-up. Until then this hook is a safe no-op so callers don't break.
 */
export function useNotifications(_onPendingService?: () => void) {
    // no-op
}
