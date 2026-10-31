export const FARM = {
  name: 'Bashe Dairy Farm',
  shortName: 'BASHE DAIRY FARM',
  country: 'Tanzania',
  address: 'P.O. Box 74, Tabora, Tanzania',
  phone: '+255 612 297 675',
  email: 'info@bdf.co.tz',
  website: 'www.bdf.co.tz',
  animalIdPrefix: 'BDF',
} as const

export function animalId(cow: { id_no?: string } | null | undefined): string {
  const padded = (cow?.id_no || '0001').padStart(4, '0')
  return `${FARM.animalIdPrefix}-${new Date().getFullYear()}-${padded}`
}

export function appBaseUrl(): string {
  return import.meta.env.VITE_APP_URL || window.location.origin
}
