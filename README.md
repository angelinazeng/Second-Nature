# Second-Nature

- `frontend/`: React + Vite app (Snap & Sort UI from Figma)
- `backend/`: FastAPI server + PyTorch CNN that classifies photos of items

## Task 1: Find out where an item goes

The Snap screen sends a photo to `POST /api/classify`. A ResNet-18 CNN, fine-tuned on
[TrashNet](https://huggingface.co/datasets/garythung/trashnet) (cardboard, glass, metal,
paper, plastic, trash), returns the item, the bin, and a "why" explanation. If the top
prediction is under 80% confident, the app shows the "not totally sure" state that leads to
Task 2 (Ask the community).

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
