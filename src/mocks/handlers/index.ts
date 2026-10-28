import { catalogHandlers } from './catalog'
import { controlHandlers } from './control'
import { systemHandlers } from './system'

/** All REST handlers, shared by the browser worker and the Node checks. */
export const restHandlers = [...controlHandlers, ...systemHandlers, ...catalogHandlers]
