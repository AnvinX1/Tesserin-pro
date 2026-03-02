/**
 * Theme Registry
 *
 * Collects all built-in and community themes into unified arrays.
 * Individual theme files live in ./builtin/ and ./community/.
 */

import type { TesserinTheme } from "./types"
import { BUILTIN_THEMES } from "./builtin"
import { COMMUNITY_THEMES } from "./community"

export { BUILTIN_THEMES, COMMUNITY_THEMES }

export const ALL_THEMES: TesserinTheme[] = [...BUILTIN_THEMES, ...COMMUNITY_THEMES]
