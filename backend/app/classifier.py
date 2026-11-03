import io
from pathlib import Path

import torch
import torch.nn as nn
from PIL import Image, ImageOps
from torchvision import models, transforms as T

MODEL_PATH = Path(__file__).resolve().parent.parent / "models" / "classifier.pt"

_tf = T.Compose([
    T.Resize(256), T.CenterCrop(224), T.ToTensor(),
    T.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])


class Classifier:
    def __init__(self, path: Path = MODEL_PATH):
        ckpt = torch.load(path, map_location="cpu")
        self.classes = ckpt["classes"]
        self.model = models.resnet18()
        self.model.fc = nn.Linear(self.model.fc.in_features, len(self.classes))
        self.model.load_state_dict(ckpt["state_dict"])
        self.model.eval()

    def predict(self, data: bytes, top_k: int = 3):
        img = ImageOps.exif_transpose(Image.open(io.BytesIO(data))).convert("RGB")
        with torch.no_grad():
            probs = torch.softmax(self.model(_tf(img).unsqueeze(0)), dim=1)[0]
        scores, idx = probs.topk(min(top_k, len(self.classes)))
        return [(self.classes[i], s) for i, s in zip(idx.tolist(), scores.tolist())]
