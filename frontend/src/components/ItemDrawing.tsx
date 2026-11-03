import { ScanKey } from '../data/catalog'

const drawingFor: Record<ScanKey, 'pizza' | 'bag' | 'cup'> = {
  cardboard: 'pizza',
  paper: 'pizza',
  plastic: 'bag',
  glass: 'cup',
  metal: 'cup',
  trash: 'cup',
}

function ItemDrawing({ item: requested = 'cardboard' }: { item?: ScanKey | 'mystery' }) {
  const item = requested === 'mystery' ? requested : drawingFor[requested]
  if (item === 'bag') {
    return (
      <svg className="item-drawing bag-drawing" viewBox="0 0 240 220">
        <path d="M67 38v44m106-44v44M67 39c0 39 32 37 53 20 21 17 53 19 53-20" />
        <path d="M55 72c39 12 91 12 130 0l-9 121c-35 9-77 9-112 0Z" />
        <path d="M90 117c22-13 45-11 62 4M95 142c18 10 37 10 52-1" />
      </svg>
    )
  }
  if (item === 'cup') {
    return (
      <svg className="item-drawing cup-drawing" viewBox="0 0 240 220">
        <path d="M73 62h94l-13 134H86Z" />
        <path d="M65 48c33-8 77-8 110 0l-8 22H73Z" />
        <path d="M91 108c19-12 38-12 58 0M95 133c17 9 33 9 49 0" />
      </svg>
    )
  }
  if (item === 'mystery') {
    return (
      <svg className="item-drawing mystery-drawing" viewBox="0 0 240 220">
        <path d="M57 73c30-36 90-38 124 0l-12 109c-36 16-70 15-101 0Z" />
        <path d="M92 91c2-18 15-27 30-27 17 0 30 10 30 25 0 23-29 22-29 43v4" />
        <circle cx="123" cy="160" r="4" />
      </svg>
    )
  }
  return (
    <svg className="item-drawing pizza-drawing" viewBox="0 0 260 220">
      <path d="m49 65 174 14-22 111-166-22Z" />
      <path d="m49 65 31-25 171 12-28 27Z" />
      <path d="m62 79 144 11-16 84-136-17Z" />
      <path d="M88 114c22-22 66-13 79 17l-11 29-74-9Z" />
      <path d="m126 114-5 41M89 132l74 9" />
      <circle cx="104" cy="127" r="7" />
      <circle cx="143" cy="139" r="7" />
    </svg>
  )
}

export default ItemDrawing
