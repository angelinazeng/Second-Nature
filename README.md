# Second-Nature

- `frontend/`: React + Vite app (Snap & Sort UI from Figma)
- `backend/`: FastAPI server + PyTorch CNN that classifies photos of items

## Task 1: Find out where an item goes

The Snap screen sends a photo to `POST /api/classify`. A ResNet-18 CNN, fine-tuned on
[TrashNet](https://huggingface.co/datasets/garythung/trashnet) (cardboard, glass, metal,
paper, plastic, trash), returns the item, the bin, and a "why" explanation. If the top
prediction is under 80% confident, the app shows the "not totally sure" state that leads to
Task 2 (Ask the community).

## Run it

Requires Node 20.19+ or 22.12+ and Python 3.10+.

```
# 1. Backend
cd backend
pip install -r requirements.txt
# Train the model (downloads nothing automatically; get the dataset first):
curl -L -o /tmp/resized.zip https://huggingface.co/datasets/garythung/trashnet/resolve/main/dataset-resized.zip
unzip /tmp/resized.zip -d /tmp/trashnet
python ml/train.py --data /tmp/trashnet/dataset-resized
uvicorn app.main:app --port 8000

# 2. Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

The app runs at http://localhost:8443 and proxies `/api` to the backend on port 8000.
Training writes `backend/models/classifier.pt` (git-ignored) and `metrics.json`.
