import { intersects } from '../.helpers/index.js'
import type { DragMoveCallback, IntersectionCallback } from '../.types/types.js'

export function drag(
  pointerEvent: PointerEvent,
  onIntersectingStart?: IntersectionCallback,
  onIntersectingStop?: IntersectionCallback,
  onMove?: DragMoveCallback
): void {
  const target = pointerEvent.target
  if (!(target instanceof HTMLElement)) return
  const ownerDocument = target.ownerDocument
  const position = target.style.position
  const userSelect = ownerDocument.body.style.userSelect
  const zIndex = target.style.zIndex
  let watcher: HTMLElement | undefined
  let intersecting = false

  const closestWatcher = (event: PointerEvent): HTMLElement | undefined => {
    const elements = target.ownerDocument.elementsFromPoint(
      event.clientX,
      event.clientY
    )
    for (const element of elements) {
      if (element instanceof HTMLElement && element !== target) {
        if (element.dataset.dragonWatches === target.dataset.dragonwatchId)
          return element
      }
    }
  }

  const move = (event: PointerEvent): void => {
    if (event.pointerId !== pointerEvent.pointerId) return
    const x = Number(target.dataset.x ?? 0) + event.movementX
    const y = Number(target.dataset.y ?? 0) + event.movementY
    target.dataset.x = String(x)
    target.dataset.y = String(y)
    target.style.transform = `translate(${x}px, ${y}px)`
    void onMove?.(target, { x, y }, event)
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
    if (event.pointerId !== pointerEvent.pointerId) return
    void ownerDocument.removeEventListener('pointermove', move, true)
    void ownerDocument.removeEventListener('pointerup', stop, true)
    void ownerDocument.removeEventListener('pointercancel', stop, true)
    ownerDocument.body.style.userSelect = userSelect
    target.style.position = position
    target.style.zIndex = zIndex
    if (target.hasPointerCapture(event.pointerId))
      void target.releasePointerCapture(event.pointerId)
    if (event.target !== target) {
      void target.dispatchEvent(
        new PointerEvent(event.type, { pointerId: event.pointerId })
      )
    }
  }
  ownerDocument.body.style.userSelect = 'none'
  if (ownerDocument.defaultView?.getComputedStyle(target).position === 'static')
    target.style.position = 'relative'
  target.style.zIndex = '2147483647'
  void target.setPointerCapture(pointerEvent.pointerId)
  void ownerDocument.addEventListener('pointermove', move, true)
  void ownerDocument.addEventListener('pointerup', stop, true)
  void ownerDocument.addEventListener('pointercancel', stop, true)
}
