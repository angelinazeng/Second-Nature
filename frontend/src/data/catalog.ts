export type ScanKey = 'pizza' | 'bag' | 'cup'

export const catalog: Record<ScanKey, { name: string; bin: string; why: string; color: string }> = {
  pizza: {
    name: 'Greasy pizza box',
    bin: 'Green bin',
    why: 'Grease prevents cardboard fibers from bonding into new paper. Compost the greasy part and recycle only the clean lid.',
    color: 'green',
  },
  bag: {
    name: 'Plastic shopping bag',
    bin: 'Store drop-off',
    why: 'Soft plastic wraps around sorting equipment. Return it clean and dry to a participating store instead.',
    color: 'yellow',
  },
  cup: {
    name: 'Paper coffee cup',
    bin: 'Trash bin',
    why: 'Its plastic lining is fused to the paper, and Portland facilities cannot separate those layers.',
    color: 'orange',
  },
}
