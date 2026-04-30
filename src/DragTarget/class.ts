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
  public readonly targets: readonly HTMLElement[]

  private readonly abortController = new AbortController()
  private readonly eventTarget = new EventTarget()
  private used = false

  constructor(
    public readonly dragged: HTMLElement,
    targets: HTMLElement | Iterable<HTMLElement>,
    private readonly action: DragTargetAction,
    private readonly animationDuration: number = 200
  ) {
    this.targets =
      targets instanceof HTMLElement ? [targets] : Array.from(targets)

    void this.dragged.addEventListener(
      'pointerdown',
      (event) => {
        if (this.used) return
        let activeTarget: HTMLElement | undefined
        for (const target of this.targets) void startWatch(target, this.dragged)
        void drag(
          event,
          (_dragged, target) => {
            activeTarget = target
            void this.eventTarget.dispatchEvent(
              new CustomEvent<DragTargetEventMap['intersecting']>(
                'intersecting',
                {
                  detail: { thisEl: this.dragged, withEl: target },
                }
              )
            )
          },
          (_dragged, target) => {
            if (activeTarget === target) activeTarget = undefined
            void this.eventTarget.dispatchEvent(
              new CustomEvent<DragTargetEventMap['notintersecting']>(
                'notintersecting',
                {
                  detail: { thisEl: this.dragged, withEl: target },
                }
              )
            )
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
          for (const target of this.targets)
            void stopWatch(target, this.dragged)
          const target = activeTarget
          if (target) {
            this.used = true
            void this.abortController.abort()
            void dropDraggedOnTarget(
              this.dragged,
              target,
              () => {
                if (this.action === 'replace')
                  void target.replaceWith(this.dragged)
                else void target.appendChild(this.dragged)
                void this.eventTarget.dispatchEvent(
                  new CustomEvent<DragTargetEventMap['swap']>('swap', {
                    detail: { thisEl: this.dragged, withEl: target },
                  })
                )
              },
              this.animationDuration
            )
          } else {
            void returnDraggedToStart(this.dragged, this.animationDuration)
          }
          activeTarget = undefined
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
    if (this.used || thisEl !== this.dragged) return
    void moveDraggedToOffset(thisEl, x, y)
  }

  remoteSwap({ thisEl, withEl }: SwapEventDetail): void {
    if (this.used || thisEl !== this.dragged) return
    const target = this.targets.find((target) => target === withEl)
    if (!target) return
    this.used = true
    for (const watchedTarget of this.targets)
      void stopWatch(watchedTarget, this.dragged)
    void this.abortController.abort()
    void dropDraggedOnTarget(
      thisEl,
      target,
      () => {
        if (this.action === 'replace') void target.replaceWith(thisEl)
        else void target.appendChild(thisEl)
      },
      this.animationDuration
    )
  }

  addEventListener<K extends keyof DragTargetEventMap>(
    type: K,
    listener: DragTargetEventListenerFor<K> | null,
    options?: boolean | AddEventListenerOptions
  ): void {
    void this.eventTarget.addEventListener(
      type,
      listener as EventListenerOrEventListenerObject | null,
      options
    )
  }

  removeEventListener<K extends keyof DragTargetEventMap>(
    type: K,
    listener: DragTargetEventListenerFor<K> | null,
    options?: boolean | EventListenerOptions
  ): void {
    void this.eventTarget.removeEventListener(
      type,
      listener as EventListenerOrEventListenerObject | null,
      options
    )
  }
}
