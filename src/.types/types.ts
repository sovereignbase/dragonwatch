export type IntersectionCallback = (
  dragged: HTMLElement,
  watcher: HTMLElement
) => void

export type DragMoveCallback = (
  dragged: HTMLElement,
  offset: DragInstruction,
  pointerEvent: PointerEvent
) => void

export type DragInstruction = {
  thisEl: HTMLElement
  x: number
  y: number
}

export type DragEventDetail = DragInstruction & {
  pointerEvent: PointerEvent
}

export type SwapEventDetail = {
  thisEl: HTMLElement
  withEl: HTMLElement
}

export type SettleEventDetail = {
  thisEl: HTMLElement
}

export type DragAreaEventMap = {
  drag: DragEventDetail
  settle: SettleEventDetail
  swap: SwapEventDetail
}

export type DragAreaEventListener<K extends keyof DragAreaEventMap> =
  | ((event: CustomEvent<DragAreaEventMap[K]>) => void)
  | { handleEvent(event: CustomEvent<DragAreaEventMap[K]>): void }

export type DragAreaEventListenerFor<K extends keyof DragAreaEventMap> =
  DragAreaEventListener<K>

export type DragTargetAction = 'append' | 'replace'

export type DragTargetEventMap = {
  drag: DragEventDetail
  intersecting: SwapEventDetail
  notintersecting: SwapEventDetail
  settle: SettleEventDetail
  swap: SwapEventDetail
}

export type DragTargetEventListener<K extends keyof DragTargetEventMap> =
  | ((event: CustomEvent<DragTargetEventMap[K]>) => void)
  | { handleEvent(event: CustomEvent<DragTargetEventMap[K]>): void }

export type DragTargetEventListenerFor<K extends keyof DragTargetEventMap> =
  DragTargetEventListener<K>

export type DropCommit = () => void

export type RestoredDragStyle = {
  transform: string
  transition?: string
}
