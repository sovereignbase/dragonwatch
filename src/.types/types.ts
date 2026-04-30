export type IntersectionCallback = (
  dragged: HTMLElement,
  watcher: HTMLElement
) => void

export type DragMoveCallback = (
  dragged: HTMLElement,
  offset: { x: number; y: number },
  pointerEvent: PointerEvent
) => void

export type DragEventDetail = {
  pointerEvent: PointerEvent
  thisEl: HTMLElement
  x: number
  y: number
}

export type SwapEventDetail = {
  thisEl: HTMLElement
  withEl: HTMLElement
}

export type DragAreaEventMap = {
  drag: DragEventDetail
  swap: SwapEventDetail
}

export type DragAreaEventListener<K extends keyof DragAreaEventMap> =
  | ((event: CustomEvent<DragAreaEventMap[K]>) => void)
  | { handleEvent(event: CustomEvent<DragAreaEventMap[K]>): void }

export type DragAreaEventListenerFor<K extends string> =
  K extends keyof DragAreaEventMap
    ? DragAreaEventListener<K>
    : EventListenerOrEventListenerObject

export type DragTargetAction = 'append' | 'replace'

export type DragTargetEventMap = {
  drag: DragEventDetail
  swap: SwapEventDetail
}

export type DragTargetEventListener<K extends keyof DragTargetEventMap> =
  | ((event: CustomEvent<DragTargetEventMap[K]>) => void)
  | { handleEvent(event: CustomEvent<DragTargetEventMap[K]>): void }

export type DragTargetEventListenerFor<K extends string> =
  K extends keyof DragTargetEventMap
    ? DragTargetEventListener<K>
    : EventListenerOrEventListenerObject

export type DropCommit = () => void

export type RestoredDragStyle = {
  transform: string
  transition?: string
}
