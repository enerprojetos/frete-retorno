export function brlFromCents(cents: number | null | undefined) {
  const v = typeof cents === 'number' ? cents : 0
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v / 100)
}
