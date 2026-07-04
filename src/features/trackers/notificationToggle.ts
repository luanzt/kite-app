/** The action a notification-toggle tap should take, given the two states. */
export type ToggleAction = 'toggle' | 'request'

/**
 * Pure decision for a notification toggle tap.
 * - OS granted → free on/off ('toggle').
 * - OS denied but preference on → allow turning off ('toggle').
 * - OS denied and preference off → try to request ('request'); the caller
 *   shows the "Open Settings" alert if the request comes back denied.
 */
export function decideToggleAction(
  osGranted: boolean,
  notifyEnabled: boolean
): ToggleAction {
  if (osGranted) return 'toggle'
  if (notifyEnabled) return 'toggle'
  return 'request'
}
