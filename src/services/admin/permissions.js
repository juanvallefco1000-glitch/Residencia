const readers = ['ADMIN', 'EDITOR', 'LECTOR']
const writers = ['ADMIN', 'EDITOR']
export function canReadModule(role, module) {
  return ['usuarios', 'empresa'].includes(module) ? role === 'ADMIN' : readers.includes(role)
}
export function canWriteModule(role, module) {
  return ['usuarios', 'empresa'].includes(module) ? role === 'ADMIN' : writers.includes(role)
}
export function canDeleteProduct(role) { return role === 'ADMIN' }
export const userRoles = ['ADMIN', 'EDITOR', 'LECTOR']
export function passwordError(value, confirmation) {
  if ([...value].length < 14 || new TextEncoder().encode(value).length > 72
    || !/\p{L}/u.test(value) || !/[^\p{L}]/u.test(value) || /[\u0000-\u001f\u007f-\u009f]/.test(value)) return 'Usa mínimo 14 caracteres, máximo 72 bytes UTF-8, letras y algún número, símbolo o espacio.'
  return value === confirmation ? '' : 'Las contraseñas no coinciden.'
}
