"""Hard-coded neighbor replies for Task 2 (Ask the community).

There are no other real users in the prototype, so each new question gets three canned replies
picked by the asker's best guess. They deliberately disagree a little so the asker has
something to compare. `delay` is seconds after posting before the reply shows up.
"""

EXPERT = {"author": "Maya K.", "role": "Waste educator"}
NEIGHBOR_A = {"author": "Jordan P.", "role": ""}
NEIGHBOR_B = {"author": "Sam T.", "role": ""}

REPLIES = {
    "cardboard": [
        {**EXPERT, "answer_key": "cardboard", "helpful": 12, "delay": 3,
         "text": "Plain cardboard: flatten it and recycle it. Tear off any greasy or wax-coated parts first, those go in the trash."},
        {**NEIGHBOR_A, "answer_key": "trash", "helpful": 2, "delay": 7,
         "text": "Ours had a shiny wax coating and the hauler left it behind. Waxed boxes go in the trash."},
        {**NEIGHBOR_B, "answer_key": "cardboard", "helpful": 5, "delay": 12,
         "text": "If it's a plain brown box, recycling bin. We put ours out flattened every week with no problems."},
    ],
    "paper": [
        {**EXPERT, "answer_key": "paper", "helpful": 11, "delay": 3,
         "text": "Clean, dry paper is recyclable. Try tearing it: if it stretches like plastic instead of tearing, it has a film and goes in the trash."},
        {**NEIGHBOR_A, "answer_key": "trash", "helpful": 4, "delay": 7,
         "text": "If it's a shiny receipt, that's thermal paper and it can't be recycled. Trash it."},
        {**NEIGHBOR_B, "answer_key": "paper", "helpful": 3, "delay": 12,
         "text": "Envelopes and junk mail are fine in recycling, even the ones with little plastic windows."},
    ],
    "glass": [
        {**EXPERT, "answer_key": "glass", "helpful": 13, "delay": 3,
         "text": "Bottles and jars go in the glass bin, rinsed with lids off. Drinking glasses, mirrors and baking dishes melt differently, so those are trash."},
        {**NEIGHBOR_A, "answer_key": "trash", "helpful": 6, "delay": 7,
         "text": "If it's broken, wrap it in paper and put it in the trash so nobody at the sorting line gets cut."},
        {**NEIGHBOR_B, "answer_key": "glass", "helpful": 2, "delay": 12,
         "text": "Jam jars go in our glass bin every week. Just rinse them out first."},
    ],
    "metal": [
        {**EXPERT, "answer_key": "metal", "helpful": 10, "delay": 3,
         "text": "Rinsed cans and clean foil go in recycling. Aerosol cans only if they're completely empty."},
        {**NEIGHBOR_A, "answer_key": "trash", "helpful": 5, "delay": 7,
         "text": "If it's a chip bag that just looks metallic, it's plastic film with a metal layer. That's trash."},
        {**NEIGHBOR_B, "answer_key": "metal", "helpful": 3, "delay": 12,
         "text": "Soup and soda cans are recycling. I crush ours so the bin fits more."},
    ],
    "plastic": [
        {**EXPERT, "answer_key": "plastic", "helpful": 12, "delay": 3,
         "text": "Rigid bottles, tubs and jugs: rinse and recycle. Bags and film can't go curbside, take those to a store drop-off."},
        {**NEIGHBOR_A, "answer_key": "trash", "helpful": 4, "delay": 7,
         "text": "If it's a squishy pouch or a blister pack, that's trash here. Only rigid plastic goes in recycling."},
        {**NEIGHBOR_B, "answer_key": "plastic", "helpful": 2, "delay": 12,
         "text": "Yogurt tubs and milk jugs go in our recycling bin. Rinse them so they don't smell."},
    ],
    # Also used when the asker isn't sure: mixed-material packaging is the usual culprit.
    "trash": [
        {**EXPERT, "answer_key": "trash", "helpful": 14, "delay": 3,
         "text": "A shiny lining or layers fused together means a mixed-material pouch. Facilities can't separate the layers, so it goes in the trash."},
        {**NEIGHBOR_A, "answer_key": "paper", "helpful": 3, "delay": 7,
         "text": "If the inside lining peels off cleanly, recycle the paper part and throw out just the lining."},
        {**NEIGHBOR_B, "answer_key": "trash", "helpful": 5, "delay": 12,
         "text": "We had the same pouches. Our city guide says trash, since there's no recycling symbol on them."},
    ],
}


def replies_for(guess: str | None) -> list[dict]:
    return REPLIES.get(guess or "trash", REPLIES["trash"])
