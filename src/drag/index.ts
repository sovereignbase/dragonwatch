import { intersects } from '../.helpers/index.js'
import type { IntersectionCallback } from '../.types/types.js'

export function drag(
  pointerEvent: PointerEvent,
  onIntersectingStart?: IntersectionCallback,
  onIntersectingStop?: IntersectionCallback
): void {
  const target = pointerEvent.target
  if (!(target instanceof HTMLElement)) return
  const maybeWatcher = target.ownerDocument.getElementsByClassName(
    `${target.className}-watcher`
  )[0]
  const watcher = maybeWatcher instanceof HTMLElement ? maybeWatcher : undefined
  let intersecting = false

  const move = (event: PointerEvent): void => {
    const x = Number(target.dataset.x ?? 0) + event.movementX
    const y = Number(target.dataset.y ?? 0) + event.movementY
    target.dataset.x = String(x)
    target.dataset.y = String(y)
    target.style.transform = `translate(${x}px, ${y}px)`
    if (!watcher) return
    const next = intersects(target, watcher)
    if (next === intersecting) return
    intersecting = next
    const callback = next ? onIntersectingStart : onIntersectingStop
    if (typeof callback === 'function') void callback(target, watcher)
  }

  const stop = (event: PointerEvent): void => {
    void target.removeEventListener('pointermove', move)
    void target.removeEventListener('pointerup', stop)
    void target.removeEventListener('pointercancel', stop)
    if (target.hasPointerCapture(event.pointerId)) {
      void target.releasePointerCapture(event.pointerId)
    }
  }
  void target.setPointerCapture(pointerEvent.pointerId)
  void target.addEventListener('pointermove', move)
  void target.addEventListener('pointerup', stop)
  void target.addEventListener('pointercancel', stop)
}
