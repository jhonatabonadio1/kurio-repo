import Decimal from 'decimal.js'

import type { EthAmount } from '@/contracts/money'

/**
 * Exact ETH math on decimal strings. Values never pass through `number`,
 * so 0.1 + 0.2 stays 0.3. The API's quote is still the source of truth
 * for totals; the UI only formats what it receives.
 */
const D = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP })

/** Wei precision. */
const MAX_DECIMALS = 18

const toEth = (value: Decimal.Value): EthAmount =>
  new D(value).toDecimalPlaces(MAX_DECIMALS).toFixed() as EthAmount

export const eth = {
  of: (value: Decimal.Value) => toEth(value),
  zero: '0' as EthAmount,
  add: (...values: string[]) => toEth(values.reduce((sum, v) => sum.plus(v), new D(0))),
  sub: (a: string, b: string) => toEth(new D(a).minus(b)),
  mul: (a: string, factor: Decimal.Value) => toEth(new D(a).times(factor)),
  /** a × percent / 100, rounded down to 6 decimals (never charges a fraction more). */
  percentOf: (a: string, percent: number) =>
    toEth(new D(a).times(percent).dividedBy(100).toDecimalPlaces(6, Decimal.ROUND_DOWN)),
  cmp: (a: string, b: string) => new D(a).comparedTo(b),
  eq: (a: string, b: string) => new D(a).equals(b),
  isZero: (a: string) => new D(a).isZero(),
  max: (...values: string[]) => toEth(D.max(...values)),
  min: (...values: string[]) => toEth(D.min(...values)),
}

/**
 * "1.19 ETH", "0.016 ETH", "26.846 ETH": at least 2 decimals (as in the
 * Figma), up to 6, trailing zeros removed beyond the second decimal.
 */
export function formatEth(value: string, { unit = true }: { unit?: boolean } = {}): string {
  const d = new D(value)
  const fixed = d.toDecimalPlaces(6, Decimal.ROUND_HALF_UP).toFixed()
  const [int, frac = ''] = fixed.split('.')
  const trimmed = frac.replace(/0+$/, '').padEnd(2, '0')
  const text = `${int}.${trimmed}`
  return unit ? `${text} ETH` : text
}
