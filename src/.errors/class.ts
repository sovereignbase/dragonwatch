export type DragonwatchErrorCode = 'EXAMPLE_ERROR_CODE'

export class DragonwatchError extends Error {
  readonly code: DragonwatchErrorCode

  constructor(code: DragonwatchErrorCode, message?: string) {
    const detail = message ?? code
    super(`{@sovereignbase/dragonwatch} ${detail}`)
    this.code = code
    this.name = 'DragonwatchError'
  }
}
