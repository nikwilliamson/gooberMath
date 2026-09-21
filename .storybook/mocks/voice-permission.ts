/** Storybook stand-in for src/voice/permission.ts: the prompt is always granted. */
import { action } from 'storybook/actions'

export const MIC_CONSTRAINTS: MediaTrackConstraints = { channelCount: 1 }

export async function primeMicPermission(): Promise<boolean> {
  action('voice.primeMicPermission')()
  return true
}
