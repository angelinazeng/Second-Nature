import os
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from . import store
from .guidance import GUIDANCE
from .neighbor_replies import replies_for

# Below this top-1 probability we tell the user we're unsure (Task 1 -> Task 2 hand-off).
CONFIDENCE_THRESHOLD = 0.8

ItemKey = Literal["cardboard", "paper", "glass", "metal", "plastic", "trash"]

app = FastAPI(title="Second Nature API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
store.init()

# The model file is not in git; load it lazily so the guide/community endpoints work before training.
_classifier = None


def get_classifier():
    global _classifier
    if _classifier is None:
        try:
            from .classifier import MODEL_PATH, Classifier
        except ImportError:
            raise HTTPException(status_code=503, detail="PyTorch isn't installed. See README: pip install -r requirements.txt")

        if not MODEL_PATH.exists():
            raise HTTPException(status_code=503, detail="Model not trained yet. See README: python ml/train.py")
        _classifier = Classifier()
    return _classifier


@app.get("/api/health")
def health():
    try:
        return {"status": "ok", "classes": get_classifier().classes}
    except HTTPException as err:
        return {"status": "ok", "classes": [], "model": err.detail}


@app.post("/api/classify")
async def classify(image: UploadFile = File(...)):
    classifier = get_classifier()
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


# ---- Task 3: household guide + teaching others ----

class GuideItem(BaseModel):
    key: ItemKey
    tip: str = Field("", max_length=500)


class GuideIn(BaseModel):
    id: str | None = None
    household: str = Field(..., min_length=1, max_length=80)
    city: str = Field(..., min_length=1, max_length=80)
    note: str = Field("", max_length=1000)
    items: list[GuideItem] = Field(..., max_length=50)


class StoryIn(BaseModel):
    kind: Literal["story", "tip"]
    author: str = Field(..., min_length=1, max_length=60)
    city: str = Field(..., min_length=1, max_length=80)
    caption: str = Field(..., min_length=1, max_length=1000)
    item_key: ItemKey | None = None
    guide_id: str | None = None
    # Downscaled JPEG data URL from the browser; capped to keep the DB small.
    photo: str | None = Field(None, max_length=1_500_000, pattern=r"^data:image/(jpeg|png|webp);base64,")


class HelpfulIn(BaseModel):
    delta: Literal[1, -1]


class ReplyIn(BaseModel):
    author: str = Field(..., min_length=1, max_length=60)
    text: str = Field(..., min_length=1, max_length=500)


@app.post("/api/guides")
def save_guide(body: GuideIn):
    with store.connect() as conn:
        return store.save_guide(conn, body.id, body.household, body.city, body.note, [i.model_dump() for i in body.items])


@app.get("/api/guides/{guide_id}")
def get_guide(guide_id: str):
    with store.connect() as conn:
        guide = store.get_guide(conn, guide_id)
    if not guide:
        raise HTTPException(status_code=404, detail="Guide not found.")
    return guide


@app.get("/api/stories")
def list_stories():
    with store.connect() as conn:
        return store.list_stories(conn)


@app.post("/api/stories")
def add_story(body: StoryIn):
    if body.kind == "tip" and not body.item_key:
        raise HTTPException(status_code=422, detail="A tip needs an item.")
    with store.connect() as conn:
        if body.guide_id and not store.get_guide(conn, body.guide_id):
            raise HTTPException(status_code=404, detail="Attached guide not found.")
        return store.add_story(conn, body.kind, body.author, body.city, body.caption.strip(), body.item_key, body.guide_id, body.photo)


@app.post("/api/stories/{story_id}/helpful")
def mark_helpful(story_id: int, body: HelpfulIn):
    with store.connect() as conn:
        story = store.bump_helpful(conn, story_id, body.delta)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found.")
    return story


@app.post("/api/stories/{story_id}/replies")
def add_reply(story_id: int, body: ReplyIn):
    with store.connect() as conn:
        story = store.add_reply(conn, story_id, body.author, body.text.strip())
    if not story:
        raise HTTPException(status_code=404, detail="Story not found.")
    return story


# ---- Task 2: ask the community about an item the app can't settle ----

class QuestionIn(BaseModel):
    author: str = Field(..., min_length=1, max_length=60)
    city: str = Field(..., min_length=1, max_length=80)
    details: str = Field(..., min_length=1, max_length=1000)
    guess: ItemKey | None = None
    photo: str | None = Field(None, max_length=1_500_000, pattern=r"^data:image/(jpeg|png|webp);base64,")


class QuestionReplyIn(BaseModel):
    author: str = Field(..., min_length=1, max_length=60)
    text: str = Field(..., min_length=1, max_length=500)
    answer_key: ItemKey | None = None


class SaveAnswerIn(BaseModel):
    reply_id: int | None


@app.get("/api/questions")
def list_questions():
    with store.connect() as conn:
        return store.list_questions(conn)


@app.post("/api/questions")
def add_question(body: QuestionIn):
    with store.connect() as conn:
        return store.add_question(conn, body.author, body.city, body.details.strip(), body.guess, body.photo, replies_for(body.guess))


@app.get("/api/questions/{question_id}")
def get_question(question_id: int):
    with store.connect() as conn:
        question = store.get_question(conn, question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found.")
    return question


@app.post("/api/questions/{question_id}/replies")
def add_question_reply(question_id: int, body: QuestionReplyIn):
    with store.connect() as conn:
        question = store.add_question_reply(conn, question_id, body.author, body.text.strip(), body.answer_key)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found.")
    return question


@app.post("/api/questions/{question_id}/replies/{reply_id}/helpful")
def mark_reply_helpful(question_id: int, reply_id: int, body: HelpfulIn):
    with store.connect() as conn:
        question = store.bump_reply_helpful(conn, question_id, reply_id, body.delta)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found.")
    return question


@app.post("/api/questions/{question_id}/saved")
def save_answer(question_id: int, body: SaveAnswerIn):
    with store.connect() as conn:
        question = store.save_answer(conn, question_id, body.reply_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question or answer not found.")
    return question


# ---- Hosting: serve the built frontend from the same server (Hugging Face Space, see Dockerfile) ----
# Mounted last so every /api route above takes priority. Locally the Vite dev server serves the frontend instead.
STATIC_DIR = os.environ.get("SN_STATIC_DIR")
if STATIC_DIR and Path(STATIC_DIR).is_dir():
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="frontend")
