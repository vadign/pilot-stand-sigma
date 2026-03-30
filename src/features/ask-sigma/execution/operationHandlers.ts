import type { AskSigmaOperation } from '../types'
import type { AskSigmaExecutionHandler } from './context'
import { coreOperationHandlers } from './coreHandlers'
import { transportOperationHandlers } from './transportHandlers'

export const operationHandlers: Partial<Record<AskSigmaOperation, AskSigmaExecutionHandler>> = {
  ...coreOperationHandlers,
  ...transportOperationHandlers,
}
