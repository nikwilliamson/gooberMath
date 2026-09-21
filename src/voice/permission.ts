import { vlog } from './debug'
import { setVoiceStatus } from './status'

export const MIC_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: 1,
}

/**
 * Ask for the mic from the tap that switches voice on, then release it at once,
 * so the permission prompt comes to a grown-up on the map rather than to him in
 * the middle of a countdown. Kept out of the recognizer module on purpose: this
 * has to run inside the tap, before any dynamic import is awaited.
 */
export async function primeMicPermission(): Promise<boolean> {
  if (!navigator.mediaDevices?.getUserMedia) {
    setVoiceStatus({ mic: 'error', error: 'This browser cannot use the microphone.' })
    return false
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: MIC_CONSTRAINTS })
    stream.getTracks().forEach((t) => t.stop())
    setVoiceStatus({ mic: 'off', error: null })
    return true
  } catch (err) {
    const denied = err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'SecurityError')
    setVoiceStatus({ mic: denied ? 'denied' : 'error', error: String(err) })
    vlog('mic-prime-failed', { name: err instanceof DOMException ? err.name : String(err) })
    return false
  }
}
