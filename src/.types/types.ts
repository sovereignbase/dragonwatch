export type IntersectionCallback = (
  dragged: HTMLElement,
  watcher: HTMLElement
) => void

////////////////////////////////////////////////////

/**
 * Maps event names to their payload shapes.
 */
export type DragAreaEventMap<T> = {
  swap: { thisEl: HTMLElement; withEl: HTMLElement }
  drag: HTMLCursor
}

/**
 * Represents a strongly typed DragArea event listener.
 */
export type DragAreaEventListener<T, K extends keyof DragAreaEventMap<T>> =
  | ((event: CustomEvent<DragAreaEventMap<T>[K]>) => void)
  | { handleEvent(event: CustomEvent<DragAreaEventMap<T>[K]>): void }

/**
 * Resolves an event name to its corresponding DragArea listener type.
 */
export type DragAreaEventListenerFor<
  T,
  K extends string,
> = K extends keyof DragAreaEventMap<T>
  ? DragAreaEventListener<T, K>
  : EventListenerOrEventListenerObject

////////////////////////////////////////////////////

/**
 * Maps event names to their payload shapes.
 */
export type DragTargetEventMap<T> = {
  swap: { thisEl: HTMLElement; withEl: HTMLElement }
  drag: HTMLCursor
}

/**
 * Represents a strongly typed DragTarget event listener.
 */
export type DragTargetEventListener<T, K extends keyof DragTargetEventMap<T>> =
  | ((event: CustomEvent<DragTargetEventMap<T>[K]>) => void)
  | { handleEvent(event: CustomEvent<DragTargetEventMap<T>[K]>): void }

/**
 * Resolves an event name to its corresponding DragTarget listener type.
 */
export type DragTargetEventListenerFor<
  T,
  K extends string,
> = K extends keyof DragTargetEventMap<T>
  ? DragTargetEventListener<T, K>
  : EventListenerOrEventListenerObject
