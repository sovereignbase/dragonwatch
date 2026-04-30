export function emitEvent<EventMap, Type extends keyof EventMap & string>(
  eventTarget: EventTarget,
  type: Type,
  detail: EventMap[Type]
): boolean {
  return eventTarget.dispatchEvent(new CustomEvent(type, { detail }))
}
