import type { Component } from 'vue'
import type { Cow } from '../types'
import { cowLifeStage } from '../utils/age'
import { appBaseUrl } from '../config/farm'
import CowCard from '../components/cards/CowCard.vue'
import BullCard from '../components/cards/BullCard.vue'
import CalfCard from '../components/cards/CalfCard.vue'
import MilkingCard from '../components/cards/MilkingCard.vue'

export type CardType = 'cow' | 'bull' | 'calf' | 'milking'

export interface CardLayout {
  width: number
  orientation: 'portrait' | 'landscape'
}

export const CARD_LAYOUT: Record<CardType, CardLayout> = {
  cow: { width: 794, orientation: 'portrait' },
  calf: { width: 794, orientation: 'portrait' },
  milking: { width: 794, orientation: 'portrait' },
  bull: { width: 1680, orientation: 'landscape' },
}

export const CARD_COMPONENTS: Record<CardType, Component> = {
  cow: CowCard,
  bull: BullCard,
  calf: CalfCard,
  milking: MilkingCard,
}

export function resolveCardType(cow: Cow): CardType {
  const stage = cowLifeStage(cow.birth_date || '', cow.sex || '')
  if (stage === 'bull' || cow.sex === 'Male' || cow.category === 'Bull') return 'bull'
  if (stage === 'calf') return 'calf'
  if (cow.pregnancy_result === 'Pregnant') return 'milking'
  if ((cow.days_in_milk ?? 0) > 0 || (cow.current_daily_milk_yield ?? 0) > 0) return 'milking'
  return 'cow'
}

export function cardLabel(type: CardType): string {
  switch (type) {
    case 'bull': return 'Bull Card'
    case 'calf': return 'Calf Card'
    case 'milking': return 'Milking/Pregnant Card'
    default: return 'Cow Card'
  }
}

export function cowRecordUrl(cow: Cow): string {
  return `${appBaseUrl()}/public/cows/${cow.id}`
}
