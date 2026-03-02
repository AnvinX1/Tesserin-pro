import type { TesserinPlugin } from "../types"
import wordCountPlugin from "./word-count"
import dailyQuotePlugin from "./daily-quote"
import backlinksPlugin from "./backlinks"

export { wordCountPlugin, dailyQuotePlugin, backlinksPlugin }

/** Core plugins — always active */
export const BUILT_IN_PLUGINS: TesserinPlugin[] = [
  wordCountPlugin,
  dailyQuotePlugin,
  backlinksPlugin,
]
