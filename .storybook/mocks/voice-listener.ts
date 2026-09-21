/**
 * Storybook stand-in for src/voice/listener.ts: no model download, no mic.
 * The status store is driven by the story instead (see withVoiceStatus).
 */
import { action } from 'storybook/actions'
import type { HeardWord } from '@/voice/voice'

export class VoiceError extends Error {
  constructor(public readonly kind: 'missing' | 'error') {
    super(kind)
  }
}

export interface MicSession {
  close: () => void
  flush: () => void
}

export async function loadModel() {
  action('voice.loadModel')()
  return { client: null, info: { name: 'storybook' } }
}

export async function openMic(
  _ctx: AudioContext,
  _onFinal: (words: HeardWord[], now: number) => void,
  _onLevel: (rms: number, now: number) => void,
): Promise<MicSession> {
  action('voice.openMic')()
  return { close: action('voice.close'), flush: action('voice.flush') }
}

export async function deleteModel() {
  action('voice.deleteModel')()
}
