import {
  moveDraggedToOffset,
  raiseDragged,
  returnDraggedToStart,
  swapDraggedWithWatcher,
} from '../.helpers/index.js'
import type {
  DragAreaEventListenerFor,
  DragAreaEventMap,
  DragInstruction,
  RestoredDragStyle,
  SwapEventDetail,
} from '../.types/types.js'
import { drag } from '../drag/index.js'
import { startWatch, stopWatch } from '../watch/index.js'

export class DragArea {
  public readonly members: readonly HTMLElement[]
  private readonly eventTarget = new EventTarget()
  private readonly restoredStyles = new Map<HTMLElement, RestoredDragStyle>()

  constructor(
    elements: Iterable<Element>,
    private readonly animationDuration: number = 200
  ) {
    this.members = Array.from(elements).filter(
      (element): element is HTMLElement => element instanceof HTMLElement
    )

    for (const item of this.members) {
      void item.addEventListener('pointerdown', (event) => {
        const restoredStyle = raiseDragged(item)
        for (const animation of item.getAnimations()) animation.cancel()
        item.dataset.dragging = 'true'
        item.style.transition = 'none'
        void drag(
          event,
          (dragged, watcher) => {
            void swapDraggedWithWatcher(
              dragged,
              watcher,
              this.animationDuration
            )
            void this.eventTarget.dispatchEvent(
              new CustomEvent<DragAreaEventMap['swap']>('swap', {
                detail: { thisEl: dragged, withEl: watcher },
              })
            )
          },
          undefined,
          (_dragged, { thisEl, x, y }, pointerEvent) => {
            void this.eventTarget.dispatchEvent(
              new CustomEvent<DragAreaEventMap['drag']>('drag', {
                detail: { pointerEvent, thisEl, x, y },
              })
            )
          }
        )
        for (const other of this.members)
          if (other !== item) void startWatch(other, item)

        const stop = (): void => {
          if (item.dataset.dragging !== 'true') return
          delete item.dataset.dragging
          void returnDraggedToStart(item, this.animationDuration, restoredStyle)
          void this.eventTarget.dispatchEvent(
            new CustomEvent<DragAreaEventMap['settle']>('settle', {
              detail: { thisEl: item },
            })
          )
          for (const other of this.members)
            if (other !== item) void stopWatch(other, item)
        }

        void item.addEventListener('pointerup', stop, { once: true })
        void item.addEventListener('pointercancel', stop, { once: true })
      })
    }
  }

  remoteDrag({ thisEl, x, y }: DragInstruction): void {
    for (const animation of thisEl.getAnimations()) animation.cancel()
    if (!this.restoredStyles.has(thisEl)) {
      void this.restoredStyles.set(thisEl, raiseDragged(thisEl))
      thisEl.style.transition = 'none'
    }
    void moveDraggedToOffset(thisEl, x, y)
  }

  remoteSwap({ thisEl, withEl }: SwapEventDetail): void {
    void swapDraggedWithWatcher(thisEl, withEl, this.animationDuration)
  }

  remoteSettle({ thisEl }: DragAreaEventMap['settle']): void {
    const restoredStyle = this.restoredStyles.get(thisEl)
    void this.restoredStyles.delete(thisEl)
    void returnDraggedToStart(thisEl, this.animationDuration, restoredStyle)
  }

  getMemberById(id: string): HTMLElement | undefined {
    return this.members.find((member) => member.id === id)
  }

  addEventListener<K extends keyof DragAreaEventMap>(
    type: K,
    listener: DragAreaEventListenerFor<K> | null,
    options?: boolean | AddEventListenerOptions
  ): void {
    void this.eventTarget.addEventListener(
      type,
      listener as EventListenerOrEventListenerObject | null,
      options
    )
  }

  removeEventListener<K extends keyof DragAreaEventMap>(
    type: K,
    listener: DragAreaEventListenerFor<K> | null,
    options?: boolean | EventListenerOptions
  ): void {
    void this.eventTarget.removeEventListener(
      type,
      listener as EventListenerOrEventListenerObject | null,
      options
    )
  }
}
