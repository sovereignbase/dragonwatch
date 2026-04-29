import { drag } from '../drag/index.js'

export function stopDrag(pointerEvent: PointerEvent): void {
  const target = pointerEvent.currentTarget
  if (!(target instanceof HTMLElement)) return

  target.removeEventListener('pointermove', drag)
  target.removeEventListener('pointerup', stopDrag)
  target.removeEventListener('pointercancel', stopDrag)

  if (target.hasPointerCapture(pointerEvent.pointerId)) {
    target.releasePointerCapture(pointerEvent.pointerId)
  }
}
