import type { ListenerFor } from '../../.types/types.js'

export function listenToEvent<EventMap, Type extends string>(
  eventTarget: EventTarget,
  type: Type,
  listener: ListenerFor<EventMap, Type> | null,
  options?: boolean | AddEventListenerOptions
): void {
  void eventTarget.addEventListener(
    type,
    listener as EventListenerOrEventListenerObject | null,
    options
  )
}
