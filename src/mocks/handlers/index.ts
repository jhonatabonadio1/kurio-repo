import { authHandlers } from './auth'
import { cartHandlers } from './cart'
import { catalogHandlers } from './catalog'
import { controlHandlers } from './control'
import { quoteHandlers } from './quotes'
import { systemHandlers } from './system'

/** All REST handlers, shared by the browser worker and the Node checks. */
export const restHandlers = [...controlHandlers, ...systemHandlers, ...authHandlers, ...catalogHandlers, ...cartHandlers, ...quoteHandlers]
