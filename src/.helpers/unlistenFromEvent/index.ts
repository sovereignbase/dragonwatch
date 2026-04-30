import type { ListenerFor } from '../../.types/types.js'

export function unlistenFromEvent<EventMap, Type extends string>(
  eventTarget: EventTarget,
  type: Type,
  listener: ListenerFor<EventMap, Type> | null,
  options?: boolean | EventListenerOptions
): void {
  void eventTarget.removeEventListener(
    type,
    listener as EventListenerOrEventListenerObject | null,
    options
  )
}
