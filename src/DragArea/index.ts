import { drag } from '../drag/index.js'
import { startWatch, stopWatch } from '../watch/index.js'

export class DragArea {
  constructor(elements: Iterable<Element>, animationDuration: number = 200) {
    const items = Array.from(elements).filter(
      (element): element is HTMLElement => element instanceof HTMLElement
    )

    for (const item of items) {
      item.addEventListener('pointerdown', (event) => {
        for (const animation of item.getAnimations()) animation.cancel()
        const originalTransform = item.style.transform
        const originalTransition = item.style.transition
        item.dataset.dragging = 'true'
        item.style.transition = 'none'
        void drag(event, (dragged, watcher) => {
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
            Number(dragged.dataset.y ?? 0) +
            draggedRect.top -
            nextDraggedRect.top
          dragged.dataset.x = String(x)
          dragged.dataset.y = String(y)
          dragged.style.transform = `translate(${x}px, ${y}px)`
          void watcher.animate(
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
        for (const other of items)
          if (other !== item) void startWatch(other, item)

        const stop = (): void => {
          if (item.dataset.dragging !== 'true') return
          delete item.dataset.dragging
          const currentTransform = item.style.transform || 'none'
          const nextTransform = originalTransform || 'none'
          const animation = item.animate(
            [{ transform: currentTransform }, { transform: nextTransform }],
            { duration: animationDuration, easing: 'ease' }
          )
          item.style.transform = nextTransform
          void animation.finished.finally(() => {
            item.style.transform = originalTransform
            item.style.transition = originalTransition
          })
          delete item.dataset.x
          delete item.dataset.y
          for (const other of items)
            if (other !== item) void stopWatch(other, item)
        }

        void item.addEventListener('pointerup', stop, { once: true })
        void item.addEventListener('pointercancel', stop, { once: true })
      })
    }
  }
  manualSwap(thisEl: HTMLElement, withEl: HTMLElement): void {}
  manualDrag()
}
