# Second-Nature

- `frontend/`: React + Vite app (Snap & Sort UI from Figma)
- `backend/`: FastAPI server + PyTorch CNN that classifies photos of items

## Task 1: Find out where an item goes

The Snap screen sends a photo to `POST /api/classify`. A ResNet-18 CNN, fine-tuned on
[TrashNet](https://huggingface.co/datasets/garythung/trashnet) (cardboard, glass, metal,
paper, plastic, trash), returns the item, the bin, and a "why" explanation. If the top
prediction is under 80% confident, the app shows the "not totally sure" state that leads to
Task 2 (Ask the community).

## Task 2: Resolve an item the app can't settle

- When a scan isn't confident, **Ask the community** opens a question with the scan photo and the
  model's best guess already filled in. Questions can also be started from the Community tab
  (**Ask a sorting question**), with a photo picked there.
- Posting saves the question to the backend. Three neighbor replies (one waste educator, two
  neighbors) arrive about 3, 7 and 12 seconds later. They are hard-coded in
  `backend/app/neighbor_replies.py`, picked by the "What do you think it is?" answer, and they
  disagree a little on purpose so there is something to compare.
- The question page has a **Compare answers** card that groups replies by the bin they suggest,
  with reply and helpful counts. Replies can be sorted by most helpful or newest, marked helpful,
  and answered.
- **Save to My Guide** on a reply adds that item and the reply text (as a household tip) to
  My Guide, and marks the question resolved. The Community feed lists questions with their status
  (waiting, replies to compare, resolved). The **Questions** filter shows only questions.

## Task 3: Build a household guide and teach others

- **My Guide** collects saved answers (from a scan, or "Save to My Guide" on a community answer).
  It stays saved in the browser after a reload. Items are grouped by bin. Tap one to see why it goes
  there, add a household tip, remove it, or **Teach others** (opens a tip post for that item).
  **Review gaps** lists the materials that aren't in the guide yet.
- **Share guide with family** saves the guide to the backend and copies a link (`/?guide=<id>`).
  The link always shows the latest version. Anyone who opens it sees a read-only guide and can
  add those items to their own guide.
- **Community** shows stories and item tips from the backend. Posts can have a photo and an
  attached guide that readers can open. People can mark posts helpful and reply.
- Guides, posts and replies are stored in SQLite at `backend/data/second_nature.db`, which is
  created on first run and not committed. These endpoints work without the trained model.

## Requirements

- Python 3.10+
- Node 20.19+ or 22.12+

## Run it

You need two terminals: one for the backend, one for the frontend.

### 1. Backend (terminal 1)

```
cd backend
pip install -r requirements.txt
```

The trained model (`backend/models/classifier.pt`) is not stored in git, so train it once
(about 10-15 minutes on a CPU). Download the dataset, then train:

```
curl -L -o trashnet.zip https://huggingface.co/datasets/garythung/trashnet/resolve/main/dataset-resized.zip
python -c "import zipfile; zipfile.ZipFile('trashnet.zip').extractall('trashnet')"
python ml/train.py --data trashnet/dataset-resized
```

If there is an error, use these commands to download, then train:
```
curl.exe -L -o trashnet.zip https://huggingface.co/datasets/garythung/trashnet/resolve/main/dataset-resized.zip
python -c "import zipfile; zipfile.ZipFile('trashnet.zip').extractall('trashnet')"
python ml/train.py --data trashnet/dataset-resized
```

This prints validation accuracy per epoch and a final test accuracy (about 88%), and writes
`models/classifier.pt` and `models/metrics.json`. Then start the API:

```
python -m uvicorn app.main:app --port 8000
```

Wait for "Application startup complete". Check it with http://localhost:8000/api/health.

### 2. Frontend (terminal 2)

```
cd frontend
npm install
npm run dev
```

Open http://localhost:8443. The dev server proxies `/api` to the backend on port 8000, so
the backend must be running for photos to be classified. The app is laid out for a phone, so
use your browser's device toolbar (F12) or a narrow window.

For a production build, run `npm run build` in `frontend/`.

## Try it

Click **Snap or choose a photo** and pick a photo of a bottle, can, cardboard, or paper.
Photos from the TrashNet folders you downloaded work well. A blurry or unrelated image should
show the "We're not totally sure" screen. Stop the backend and upload again to see the error
message.

## Notes

- The model only knows the six TrashNet classes and was trained on clean, single-item photos,
  so accuracy on cluttered real-world photos will be lower.
- Bin names and "why" text are generic (`backend/app/guidance.py`, mirrored in
  `frontend/src/data/catalog.ts`). The city field is a label and does not change the answer yet.
- The confidence cutoff is `CONFIDENCE_THRESHOLD` in `backend/app/main.py`.
- On WSL, if `localhost:8443` does not load from Windows, use the IP from `hostname -I`.
