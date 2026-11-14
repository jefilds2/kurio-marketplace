import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'
import { eventos } from './eventos'

export const worker = setupWorker(...handlers, eventos)
