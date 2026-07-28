import CallUI from './Call/CallUI'

/**
 * GlobalCallOverlay - Renders the active call UI on top of all routes.
 * Placed once in App.tsx, inside CallProvider.
 */
export default function GlobalCallOverlay() {
  return <CallUI />
}

