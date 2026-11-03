from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .classifier import Classifier
from .guidance import GUIDANCE

# Below this top-1 probability we tell the user we're unsure (Task 1 -> Task 2 hand-off).
CONFIDENCE_THRESHOLD = 0.8

app = FastAPI(title="Second Nature API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
classifier = Classifier()


@app.get("/api/health")
def health():
    return {"status": "ok", "classes": classifier.classes}


@app.post("/api/classify")
async def classify(image: UploadFile = File(...)):
    data = await image.read()
    try:
        preds = classifier.predict(data)
    except Exception:
        raise HTTPException(status_code=400, detail="Could not read that image.")
    label, confidence = preds[0]
    return {
        "confident": confidence >= CONFIDENCE_THRESHOLD,
        "label": label,
        "confidence": confidence,
        **GUIDANCE[label],
        "alternatives": [{"label": l, "name": GUIDANCE[l]["name"], "confidence": c} for l, c in preds[1:]],
    }
