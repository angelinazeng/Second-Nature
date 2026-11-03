"""Fine-tune a ResNet-18 CNN on TrashNet and save weights + metrics.

Usage: python ml/train.py --data path/to/dataset-resized [--epochs 8]

Dataset: TrashNet (resized), one sub-folder per class. Download:
https://huggingface.co/datasets/garythung/trashnet/resolve/main/dataset-resized.zip
"""
import argparse
import json
import random
from pathlib import Path

import torch
import torch.nn as nn
from PIL import Image
from torch.utils.data import DataLoader, Dataset
from torchvision import models, transforms as T

OUT = Path(__file__).resolve().parent.parent / "models"
MEAN, STD = [0.485, 0.456, 0.406], [0.229, 0.224, 0.225]


class Wrapped(Dataset):
    def __init__(self, rows, tf):
        self.rows, self.tf = rows, tf

    def __len__(self):
        return len(self.rows)

    def __getitem__(self, i):
        img, label = self.rows[i]
        return self.tf(img), label


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", type=Path, required=True)
    ap.add_argument("--epochs", type=int, default=8)
    args = ap.parse_args()
    torch.manual_seed(0)
    random.seed(0)

    classes = sorted(d.name for d in args.data.iterdir() if d.is_dir())
    rows = [
        (Image.open(f).convert("RGB").resize((256, 256)), c)
        for c, name in enumerate(classes)
        for f in sorted((args.data / name).glob("*.jpg"))
    ]

    by_class = {c: [] for c in range(len(classes))}
    for r in rows:
        by_class[r[1]].append(r)
    train, val, test = [], [], []
    for items in by_class.values():
        random.shuffle(items)
        a, b = int(len(items) * 0.8), int(len(items) * 0.9)
        train += items[:a]; val += items[a:b]; test += items[b:]

    train_tf = T.Compose([
        T.RandomResizedCrop(224, scale=(0.6, 1.0)), T.RandomHorizontalFlip(),
        T.RandomRotation(20), T.ColorJitter(0.3, 0.3, 0.3), T.ToTensor(), T.Normalize(MEAN, STD),
    ])
    eval_tf = T.Compose([T.CenterCrop(224), T.ToTensor(), T.Normalize(MEAN, STD)])
    tl = DataLoader(Wrapped(train, train_tf), batch_size=32, shuffle=True, num_workers=4)
    vl = DataLoader(Wrapped(val, eval_tf), batch_size=64)
    te = DataLoader(Wrapped(test, eval_tf), batch_size=64)

    model = models.resnet18(weights=models.ResNet18_Weights.DEFAULT)
    model.fc = nn.Linear(model.fc.in_features, len(classes))
    opt = torch.optim.AdamW(model.parameters(), lr=1e-3 / 3, weight_decay=1e-4)
    sched = torch.optim.lr_scheduler.OneCycleLR(opt, max_lr=1e-3, total_steps=args.epochs * len(tl))
    loss_fn = nn.CrossEntropyLoss(label_smoothing=0.1)

    def accuracy(loader):
        model.eval()
        right = total = 0
        with torch.no_grad():
            for x, y in loader:
                right += (model(x).argmax(1) == y).sum().item()
                total += len(y)
        return right / total

    best, best_state = 0.0, None
    for epoch in range(args.epochs):
        model.train()
        for x, y in tl:
            opt.zero_grad()
            loss_fn(model(x), y).backward()
            opt.step()
            sched.step()
        acc = accuracy(vl)
        print(f"epoch {epoch + 1}/{args.epochs} val_acc={acc:.3f}", flush=True)
        if acc >= best:
            best, best_state = acc, {k: v.clone() for k, v in model.state_dict().items()}

    model.load_state_dict(best_state)
    test_acc = accuracy(te)
    print(f"test_acc={test_acc:.3f}")
    OUT.mkdir(exist_ok=True)
    torch.save({"state_dict": best_state, "classes": classes}, OUT / "classifier.pt")
    (OUT / "metrics.json").write_text(json.dumps(
        {"val_accuracy": best, "test_accuracy": test_acc, "classes": classes,
         "train_size": len(train), "test_size": len(test)}, indent=2))


if __name__ == "__main__":
    main()
