import { drag } from '../drag/index.js'
import { startWatch, stopWatch } from '../watch/index.js'

export function swapify(
  elements: Iterable<Element>,
  animationDuration: number = 200
): void {
  const items = Array.from(elements).filter(
    (element): element is HTMLElement => element instanceof HTMLElement
  )

  for (const item of items) {
    item.addEventListener('pointerdown', (event) => {
      const originalTransform = item.style.transform
      item.dataset.dragging = 'true'
      drag(event, (dragged, watcher) => {
        const draggedRect = dragged.getBoundingClientRect()
        const watcherRect = watcher.getBoundingClientRect()
        const marker = watcher.ownerDocument.createTextNode('')
        void watcher.parentNode?.insertBefore(marker, watcher)
        void dragged.parentNode?.insertBefore(watcher, dragged)
        void marker.parentNode?.insertBefore(dragged, marker)
        marker.remove()
        const nextDraggedRect = dragged.getBoundingClientRect()
        const nextWatcherRect = watcher.getBoundingClientRect()
        const x =
          Number(dragged.dataset.x ?? 0) +
          draggedRect.left -
          nextDraggedRect.left
        const y =
          Number(dragged.dataset.y ?? 0) + draggedRect.top - nextDraggedRect.top
        dragged.dataset.x = String(x)
        dragged.dataset.y = String(y)
        dragged.style.transform = `translate(${x}px, ${y}px)`
        watcher.animate(
          [
            {
              transform: `translate(${watcherRect.left - nextWatcherRect.left}px, ${
                watcherRect.top - nextWatcherRect.top
              }px)`,
            },
            { transform: 'none' },
          ],
          { duration: animationDuration, easing: 'ease' }
        )
      })
      for (const other of items) if (other !== item) startWatch(other, item)

      const stop = (): void => {
        if (item.dataset.dragging !== 'true') return
        delete item.dataset.dragging
        item.style.transform = originalTransform
        delete item.dataset.x
        delete item.dataset.y
        for (const other of items) if (other !== item) stopWatch(other, item)
      }

      item.addEventListener('pointerup', stop, { once: true })
      item.addEventListener('pointercancel', stop, { once: true })
    })
  }
}
