"""Maps CNN class labels to the bin + plain-language "why" shown in the app."""

# color matches the bin-result / item-thumb styles in the frontend
GUIDANCE = {
    "cardboard": {
        "name": "Cardboard",
        "bin": "Recycling bin",
        "color": "green",
        "why": "Clean, dry cardboard is re-pulped into new boxes. Flatten it first, and compost any greasy or food-soiled parts instead.",
    },
    "paper": {
        "name": "Paper",
        "bin": "Recycling bin",
        "color": "green",
        "why": "Clean paper fibers can be pulped and reused several times. Keep it dry and free of food so it doesn't spoil the batch.",
    },
    "glass": {
        "name": "Glass",
        "bin": "Glass bin",
        "color": "green",
        "why": "Glass is endlessly recyclable but breaks into shards that contaminate paper, so many cities collect it separately. Rinse it and leave lids off.",
    },
    "metal": {
        "name": "Metal can or tin",
        "bin": "Recycling bin",
        "color": "green",
        "why": "Aluminum and steel are melted down and made into new cans. Rinse out food and leave the item loose, not bagged.",
    },
    "plastic": {
        "name": "Plastic",
        "bin": "Recycling bin",
        "color": "yellow",
        "why": "Rigid plastic bottles and tubs are accepted curbside once rinsed. Soft plastic like bags and wrap jams sorting machines, so take those to a store drop-off.",
    },
    "trash": {
        "name": "Non-recyclable item",
        "bin": "Trash bin",
        "color": "orange",
        "why": "Mixed or contaminated materials can't be separated by local facilities, so recycling them would spoil other loads.",
    },
}
