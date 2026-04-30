import {
  returnDraggedToStart,
  swapDraggedWithWatcher,
} from '../.helpers/index.js'
import type {
  DragAreaEventListenerFor,
  DragAreaEventMap,
} from '../.types/types.js'
import { drag } from '../drag/index.js'
import { startWatch, stopWatch } from '../watch/index.js'

export class DragArea {
  private readonly eventTarget = new EventTarget()

  constructor(elements: Iterable<Element>, animationDuration: number = 200) {
    const items = Array.from(elements).filter(
      (element): element is HTMLElement => element instanceof HTMLElement
    )

    for (const item of items) {
      void item.addEventListener('pointerdown', (event) => {
        for (const animation of item.getAnimations()) animation.cancel()
        const originalTransform = item.style.transform
        const originalTransition = item.style.transition
        item.dataset.dragging = 'true'
        item.style.transition = 'none'
        void drag(
          event,
          (dragged, watcher) => {
            void swapDraggedWithWatcher(dragged, watcher, animationDuration)
            void this.eventTarget.dispatchEvent(
              new CustomEvent<DragAreaEventMap['swap']>('swap', {
                detail: { thisEl: dragged, withEl: watcher },
              })
            )
          },
          undefined,
          (dragged, { x, y }, pointerEvent) => {
            void this.eventTarget.dispatchEvent(
              new CustomEvent<DragAreaEventMap['drag']>('drag', {
                detail: { pointerEvent, thisEl: dragged, x, y },
              })
            )
          }
        )
        for (const other of items)
          if (other !== item) void startWatch(other, item)

        const stop = (): void => {
          if (item.dataset.dragging !== 'true') return
          delete item.dataset.dragging
          void returnDraggedToStart(item, animationDuration, {
            transform: originalTransform,
            transition: originalTransition,
          })
          for (const other of items)
            if (other !== item) void stopWatch(other, item)
        }

        void item.addEventListener('pointerup', stop, { once: true })
        void item.addEventListener('pointercancel', stop, { once: true })
      })
    }
  }

  addEventListener<Type extends string>(
    type: Type,
    listener: DragAreaEventListenerFor<Type> | null,
    options?: boolean | AddEventListenerOptions
  ): void {
    void this.eventTarget.addEventListener(
      type,
      listener as EventListenerOrEventListenerObject | null,
      options
    )
  }

  removeEventListener<Type extends string>(
    type: Type,
    listener: DragAreaEventListenerFor<Type> | null,
    options?: boolean | EventListenerOptions
  ): void {
    void this.eventTarget.removeEventListener(
      type,
      listener as EventListenerOrEventListenerObject | null,
      options
    )
  }
}
