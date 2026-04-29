import { intersects } from '../.helpers/index.js'
import type { IntersectionCallback } from '../.types/types.js'

export function drag(
  pointerEvent: PointerEvent,
  onIntersectingStart?: IntersectionCallback,
  onIntersectingStop?: IntersectionCallback
): void {
  const target = pointerEvent.target
  if (!(target instanceof HTMLElement)) return
  const watcherClass = `${target.className}-watcher`
  let watcher: HTMLElement | undefined
  let intersecting = false

  const closestWatcher = (event: PointerEvent): HTMLElement | undefined => {
    const elements = target.ownerDocument.elementsFromPoint(
      event.clientX,
      event.clientY
    )
    for (const element of elements) {
      let current = element
      while (current instanceof HTMLElement) {
        if (current !== target && current.classList.contains(watcherClass)) {
          return current
        }
        current = current.parentElement as HTMLElement
      }
    }
  }

  const move = (event: PointerEvent): void => {
    const x = Number(target.dataset.x ?? 0) + event.movementX
    const y = Number(target.dataset.y ?? 0) + event.movementY
    target.dataset.x = String(x)
    target.dataset.y = String(y)
    target.style.transform = `translate(${x}px, ${y}px)`
    const nextWatcher = closestWatcher(event)
    const next = nextWatcher ? intersects(target, nextWatcher) : false
    if (intersecting && (!next || nextWatcher !== watcher) && watcher)
      void onIntersectingStop?.(target, watcher)

    if (next && (!intersecting || nextWatcher !== watcher) && nextWatcher)
      void onIntersectingStart?.(target, nextWatcher)

    watcher = nextWatcher
    intersecting = next
  }

  const stop = (event: PointerEvent): void => {
    void target.removeEventListener('pointermove', move)
    void target.removeEventListener('pointerup', stop)
    void target.removeEventListener('pointercancel', stop)
    if (target.hasPointerCapture(event.pointerId))
      void target.releasePointerCapture(event.pointerId)
  }
  void target.setPointerCapture(pointerEvent.pointerId)
  void target.addEventListener('pointermove', move)
  void target.addEventListener('pointerup', stop)
  void target.addEventListener('pointercancel', stop)
}
