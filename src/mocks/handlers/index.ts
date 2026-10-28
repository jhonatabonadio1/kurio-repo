import { authHandlers } from './auth'
import { cartHandlers } from './cart'
import { catalogHandlers } from './catalog'
import { controlHandlers } from './control'
import { favoriteHandlers } from './favorites'
import { orderHandlers } from './orders'
import { profileHandlers } from './profile'
import { quoteHandlers } from './quotes'
import { systemHandlers } from './system'
import { walletHandlers } from './wallets'

/** All REST handlers, shared by the browser worker and the Node checks. */
export const restHandlers = [...controlHandlers, ...systemHandlers, ...authHandlers, ...catalogHandlers, ...cartHandlers, ...quoteHandlers, ...orderHandlers, ...walletHandlers, ...favoriteHandlers, ...profileHandlers]
