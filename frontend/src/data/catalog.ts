// Keys are the six classes predicted by the CNN (backend/models/classifier.pt).
// Copy mirrors backend/app/guidance.py, which is what /api/classify returns.
export type ScanKey = 'cardboard' | 'paper' | 'glass' | 'metal' | 'plastic' | 'trash'

export type CatalogEntry = { name: string; bin: string; why: string; color: string }

export const catalog: Record<ScanKey, CatalogEntry> = {
  cardboard: {
    name: 'Cardboard',
    bin: 'Recycling bin',
    why: 'Clean, dry cardboard is re-pulped into new boxes. Flatten it first, and compost any greasy or food-soiled parts instead.',
    color: 'green',
  },
  paper: {
    name: 'Paper',
    bin: 'Recycling bin',
    why: "Clean paper fibers can be pulped and reused several times. Keep it dry and free of food so it doesn't spoil the batch.",
    color: 'green',
  },
  glass: {
    name: 'Glass',
    bin: 'Glass bin',
    why: 'Glass is endlessly recyclable but breaks into shards that contaminate paper, so many cities collect it separately. Rinse it and leave lids off.',
    color: 'green',
  },
  metal: {
    name: 'Metal can or tin',
    bin: 'Recycling bin',
    why: 'Aluminum and steel are melted down and made into new cans. Rinse out food and leave the item loose, not bagged.',
    color: 'green',
  },
  plastic: {
    name: 'Plastic',
    bin: 'Recycling bin',
    why: "Rigid plastic bottles and tubs are accepted curbside once rinsed. Soft plastic like bags and wrap jams sorting machines, so take those to a store drop-off.",
    color: 'yellow',
  },
  trash: {
    name: 'Non-recyclable item',
    bin: 'Trash bin',
    why: "Mixed or contaminated materials can't be separated by local facilities, so recycling them would spoil other loads.",
    color: 'orange',
  },
}
