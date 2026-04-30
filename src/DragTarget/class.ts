import {
  dropDraggedOnTarget,
  moveDraggedToOffset,
  returnDraggedToStart,
} from '../.helpers/index.js'
import type {
  DragInstruction,
  DragTargetAction,
  DragTargetEventListenerFor,
  DragTargetEventMap,
  SwapEventDetail,
} from '../.types/types.js'
import { drag } from '../drag/index.js'
import { startWatch, stopWatch } from '../watch/index.js'

export class DragTarget {
  private readonly abortController = new AbortController()
  private readonly eventTarget = new EventTarget()
  private used = false

  constructor(
    private readonly dragged: HTMLElement,
    private readonly target: HTMLElement,
    private readonly action: DragTargetAction,
    private readonly animationDuration: number = 200
  ) {
    void this.dragged.addEventListener(
      'pointerdown',
      (event) => {
        if (this.used) return
        let active = false
        void startWatch(this.target, this.dragged)
        void drag(
          event,
          () => {
            active = true
          },
          () => {
            active = false
          },
          (_dragged, { thisEl, x, y }, pointerEvent) => {
            void this.eventTarget.dispatchEvent(
              new CustomEvent<DragTargetEventMap['drag']>('drag', {
                detail: { pointerEvent, thisEl, x, y },
              })
            )
          }
        )

        const stop = (): void => {
          if (this.used) return
          void stopWatch(this.target, this.dragged)
          if (active) {
            this.used = true
            void this.abortController.abort()
            void dropDraggedOnTarget(
              this.dragged,
              this.target,
              () => {
                if (this.action === 'replace')
                  void this.target.replaceWith(this.dragged)
                else void this.target.appendChild(this.dragged)
                void this.eventTarget.dispatchEvent(
                  new CustomEvent<DragTargetEventMap['swap']>('swap', {
                    detail: { thisEl: this.dragged, withEl: this.target },
                  })
                )
              },
              this.animationDuration
            )
          } else {
            void returnDraggedToStart(this.dragged, this.animationDuration)
          }
          active = false
        }

        void this.dragged.addEventListener('pointerup', stop, {
          once: true,
          signal: this.abortController.signal,
        })
        void this.dragged.addEventListener('pointercancel', stop, {
          once: true,
          signal: this.abortController.signal,
        })
      },
      { signal: this.abortController.signal }
    )
  }

  remoteDrag({ thisEl, x, y }: DragInstruction): void {
    if (this.used) return
    void moveDraggedToOffset(thisEl, x, y)
  }

  remoteSwap({ thisEl, withEl }: SwapEventDetail): void {
    if (this.used) return
    this.used = true
    void stopWatch(this.target, this.dragged)
    void this.abortController.abort()
    void dropDraggedOnTarget(
      thisEl,
      withEl,
      () => {
        if (this.action === 'replace') void withEl.replaceWith(thisEl)
        else void withEl.appendChild(thisEl)
      },
      this.animationDuration
    )
  }

  addEventListener<Type extends string>(
    type: Type,
    listener: DragTargetEventListenerFor<Type> | null,
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
    listener: DragTargetEventListenerFor<Type> | null,
    options?: boolean | EventListenerOptions
  ): void {
    void this.eventTarget.removeEventListener(
      type,
      listener as EventListenerOrEventListenerObject | null,
      options
    )
  }
}
