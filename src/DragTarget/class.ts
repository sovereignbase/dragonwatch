import { dropDraggedOnTarget, returnDraggedToStart } from '../.helpers/index.js'
import type {
  DragTargetAction,
  DragTargetEventListenerFor,
  DragTargetEventMap,
} from '../.types/types.js'
import { drag } from '../drag/index.js'
import { startWatch, stopWatch } from '../watch/index.js'

export class DragTarget {
  private readonly eventTarget = new EventTarget()

  constructor(
    private readonly dragged: HTMLElement,
    private readonly target: HTMLElement,
    private readonly action: DragTargetAction,
    private readonly animationDuration: number = 200
  ) {
    void this.dragged.addEventListener('pointerdown', (event) => {
      void this.start(event)
    })
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

  private start(event: PointerEvent): void {
    let active = false
    startWatch(this.target, this.dragged)
    void drag(
      event,
      () => {
        active = true
      },
      () => {
        active = false
      },
      (dragged, { x, y }, pointerEvent) => {
        this.eventTarget.dispatchEvent(
          new CustomEvent<DragTargetEventMap['drag']>('drag', {
            detail: { pointerEvent, thisEl: dragged, x, y },
          })
        )
      }
    )
    const stop = (): void => {
      stopWatch(this.target, this.dragged)
      if (active) {
        dropDraggedOnTarget(
          this.dragged,
          this.target,
          () => {
            this.commit()
            this.eventTarget.dispatchEvent(
              new CustomEvent<DragTargetEventMap['swap']>('swap', {
                detail: { thisEl: this.dragged, withEl: this.target },
              })
            )
          },
          this.animationDuration
        )
      } else {
        returnDraggedToStart(this.dragged, this.animationDuration)
      }
      active = false
    }
    this.dragged.addEventListener('pointerup', stop, { once: true })
    this.dragged.addEventListener('pointercancel', stop, { once: true })
  }

  private commit(): void {
    if (this.action === 'replace') this.target.replaceWith(this.dragged)
    else void this.target.appendChild(this.dragged)
  }
}
