import { createVNode, nextTick, render as vueRender, type Component } from 'vue'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'
import type { Cow } from '../types'
import { compressCowImages } from './imageCompress'
import {
  CARD_COMPONENTS,
  CARD_LAYOUT,
  cowRecordUrl,
  resolveCardType,
  type CardType,
} from '../cards/registry'

async function waitForImages(root: HTMLElement, timeoutMs = 8000): Promise<void> {
  const images = Array.from(root.querySelectorAll('img'))
  await Promise.all(
    images.map(img => {
      if (img.complete) return Promise.resolve()
      return new Promise<void>(resolve => {
        const finish = () => {
          clearTimeout(timer)
          img.removeEventListener('load', finish)
          img.removeEventListener('error', finish)
          resolve()
        }
        const timer = setTimeout(finish, timeoutMs)
        img.addEventListener('load', finish)
        img.addEventListener('error', finish)
      })
    }),
  )
}

export async function renderComponentToCanvas(
  component: Component,
  props: Record<string, unknown>,
  width: number,
  scale = 2,
): Promise<HTMLCanvasElement> {
  const host = document.createElement('div')
  host.setAttribute('data-render-host', '')
  host.style.position = 'fixed'
  host.style.left = '-10000px'
  host.style.top = '0'
  host.style.width = `${width}px`
  host.style.background = '#ffffff'
  host.style.zIndex = '-1'
  document.body.appendChild(host)

  try {
    const vnode = createVNode(component, props)
    vueRender(vnode, host)
    await nextTick()

    if (document.fonts?.ready) await document.fonts.ready

    const el = host.firstElementChild as HTMLElement | null
    if (!el) throw new Error('Component failed to render')

    await waitForImages(el)
    await new Promise(resolve => setTimeout(resolve, 30))

    return await html2canvas(el, {
      scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width,
      imageTimeout: 8000,
      logging: false,
    })
  } finally {
    vueRender(null, host)
    host.remove()
  }
}

export function canvasToPdf(
  canvas: HTMLCanvasElement,
  orientation: 'portrait' | 'landscape',
  margin = 5,
): jsPDF {
  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' })
  const pw = doc.internal.pageSize.getWidth()
  const ph = doc.internal.pageSize.getHeight()
  const imgWidth = pw - margin * 2
  const imgHeight = (canvas.height / canvas.width) * imgWidth
  const maxHeight = ph - margin * 2
  const imgData = canvas.toDataURL('image/jpeg', 0.92)

  if (imgHeight > maxHeight) {
    const s = maxHeight / imgHeight
    doc.addImage(imgData, 'JPEG', margin, margin, imgWidth * s, imgHeight * s)
  } else {
    const yOffset = margin + (maxHeight - imgHeight) / 2
    doc.addImage(imgData, 'JPEG', margin, yOffset, imgWidth, imgHeight)
  }

  return doc
}

export async function makeQrDataUrl(cow: Cow): Promise<string> {
  try {
    return await QRCode.toDataURL(cowRecordUrl(cow), { width: 180, margin: 0 })
  } catch {
    return ''
  }
}

export async function renderCardToCanvas(
  cow: Cow,
  type?: CardType,
  scale = 2,
): Promise<HTMLCanvasElement> {
  const cardType = type ?? resolveCardType(cow)
  const layout = CARD_LAYOUT[cardType]
  const compressed = await compressCowImages(cow)
  const qrDataUrl = await makeQrDataUrl(cow)

  return renderComponentToCanvas(
    CARD_COMPONENTS[cardType],
    { cow: compressed, qrDataUrl },
    layout.width,
    scale,
  )
}

export async function renderCowCardPdf(
  cow: Cow,
  type?: CardType,
  orientation?: 'portrait' | 'landscape',
): Promise<jsPDF> {
  const cardType = type ?? resolveCardType(cow)
  const layout = CARD_LAYOUT[cardType]
  const canvas = await renderCardToCanvas(cow, cardType)
  return canvasToPdf(canvas, orientation ?? layout.orientation, 0)
}
