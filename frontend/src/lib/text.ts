/** Strip a trailing bracketed editorial aside from a Name field for card headers,
 * e.g. "Restoran XYZ (⚠️ hygiene complaint reported)" -> "Restoran XYZ".
 * The full annotated name is still shown as-is in the detail view. */
export function displayName(name: string | null): string {
  if (!name) return 'Unnamed entry'
  return name.replace(/\s*\([^)]*\)\s*$/, '').trim() || name
}

export function hasHygieneFlag(notes: string | null): boolean {
  return !!notes && notes.includes('⚠️')
}
