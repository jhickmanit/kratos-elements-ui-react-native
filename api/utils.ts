/**
 * Convert flat dot-notation keys to nested object structure.
 *
 * Example:
 *   { "traits.email": "test@example.com", "traits.name.first": "John" }
 * becomes:
 *   { traits: { email: "test@example.com", name: { first: "John" } } }
 */
export function unflattenObject(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};

  for (const key in obj) {
    const value = obj[key];
    const keys = key.split(".");

    let current = result;
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in current)) {
        current[k] = {};
      }
      current = current[k];
    }
    current[keys[keys.length - 1]] = value;
  }

  return result;
}
