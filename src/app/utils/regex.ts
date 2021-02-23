/**
 * Creates a RegExp from the given string, converting asterisks to .* expressions,
 * and escaping all other characters.
 */
export function wildcardToRegExp(s) {
  return new RegExp("^" + s.split(/\*+/).map(regExpEscape).join(".*") + "$");
}

/**
 * RegExp-escapes all characters in the given string.
 */
export function regExpEscape(s) {
  return s.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&");
}
