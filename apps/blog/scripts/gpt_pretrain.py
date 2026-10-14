"""
사전학습 체크포인트 생성 스크립트.

src/post/gpt/lib/model.ts 와 완전히 같은 아키텍처/파라미터 순서로 학습해
public/gpt/sillok-gpt.{json,bin} (fp16) 으로 export 한다.

사용: python scripts/gpt_pretrain.py [LR 감쇠 지평 iter, 기본 30000]

죽을 때까지 계속 돌면서 2,000 iter마다:
  1) val loss 측정
  2) 재개용 체크포인트(scripts/.gpt_resume.pt — 모델+옵티마이저+iter) 저장
  3) val이 최고 기록을 갱신했을 때만 public/gpt/sillok-gpt.{json,bin}을
     원자적으로 교체 (dev 서버가 항상 최신·최선 모델을 서빙)
재시작하면 .gpt_resume.pt에서 이어서 학습한다. Ctrl-C/kill 안전.

vocab은 배포 코퍼스(public/gpt/sillok.txt)에서 만들고(브라우저와 완전 일치 —
체크포인트 로드 후 이어서 학습해도 토큰 id가 호환되어야 한다), 학습 데이터는
더 큰 scripts/sillok-full.txt(있으면)를 그 vocab으로 필터링해 쓴다.
의존: torch, numpy
"""

import json
import math
import sys
import time
import unicodedata
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
from torch.nn import functional as F

ROOT = Path(__file__).resolve().parent.parent
CORPUS = ROOT / "public/gpt/sillok.txt"
OUT = ROOT / "public/gpt/sillok-gpt"

# --- config: src/post/gpt/lib/config.ts DEFAULT_MODEL 과 동일 ---
n_layer, n_head, n_embd, block_size = 6, 6, 192, 256
batch_size = 64  # 실측: 이 모델 크기에선 B128이 tok/s 동일·갱신 절반이라 B64가 낫다
learning_rate = 1e-3
decay_iters = int(sys.argv[1]) if len(sys.argv) > 1 else 30000
eval_every = 2000
RESUME = Path(__file__).resolve().parent / ".gpt_resume.pt"
device = "mps" if torch.backends.mps.is_available() else "cpu"
torch.manual_seed(1337)

text = CORPUS.read_text()
nfd = unicodedata.normalize("NFD", text)
vocab = sorted(set(nfd))  # BMP 문자라 JS 정렬과 동일
vocab_size = len(vocab)
stoi = {c: i for i, c in enumerate(vocab)}

FULL = ROOT / "scripts/sillok-full.txt"
train_text = FULL.read_text() if FULL.exists() else text
train_nfd = unicodedata.normalize("NFD", train_text)
# vocab 밖 글자는 버림 (JS encode와 같은 동작)
data = torch.tensor(
    [stoi[c] for c in train_nfd if c in stoi], dtype=torch.long
)
n = int(len(data) * 0.95)
# GPU 상주 — 배치 구성(gather)도 GPU에서 하도록
train_data, val_data = data[:n].to(device), data[n:].to(device)
print(
    f"tokens={len(data)} (corpus={'full' if FULL.exists() else 'shipped'}) "
    f"vocab={vocab_size} device={device} decay_iters={decay_iters}",
    flush=True,
)


def get_batch(split):
    d = train_data if split == "train" else val_data
    ix = torch.randint(len(d) - block_size - 1, (batch_size,), device=device)
    offsets = torch.arange(block_size, device=device)
    idx = ix[:, None] + offsets  # [B, T] 인덱스, 전부 GPU에서
    return d[idx], d[idx + 1]


class Block(nn.Module):
    def __init__(self):
        super().__init__()
        self.ln1 = nn.LayerNorm(n_embd)
        self.qkv = nn.Linear(n_embd, 3 * n_embd)
        self.proj = nn.Linear(n_embd, n_embd)
        self.ln2 = nn.LayerNorm(n_embd)
        self.fc = nn.Linear(n_embd, 4 * n_embd)
        self.fproj = nn.Linear(4 * n_embd, n_embd)
        mask = torch.triu(
            torch.ones(block_size, block_size, dtype=torch.bool), 1
        )
        self.register_buffer("mask", mask)

    def forward(self, x):
        B, T, C = x.shape
        H, HS = n_head, n_embd // n_head
        h = self.ln1(x)
        q, k, v = self.qkv(h).split(n_embd, dim=2)
        q = q.view(B, T, H, HS).transpose(1, 2)
        k = k.view(B, T, H, HS).transpose(1, 2)
        v = v.view(B, T, H, HS).transpose(1, 2)
        # 수동 softmax(QKᵀ)V와 수학적으로 동일한 fused Metal 커널
        y = F.scaled_dot_product_attention(q, k, v, is_causal=True)
        y = y.transpose(1, 2).reshape(B, T, C)
        x = x + self.proj(y)
        # tfjs 구현과 동일한 tanh 근사 GELU
        x = x + self.fproj(F.gelu(self.fc(self.ln2(x)), approximate="tanh"))
        return x


class GPT(nn.Module):
    def __init__(self):
        super().__init__()
        self.wte = nn.Embedding(vocab_size, n_embd)
        self.wpe = nn.Embedding(block_size, n_embd)
        self.blocks = nn.ModuleList([Block() for _ in range(n_layer)])
        self.ln_f = nn.LayerNorm(n_embd)
        self.head = nn.Linear(n_embd, vocab_size, bias=False)
        self.apply(self._init)
        for name, p in self.named_parameters():
            if name.endswith("proj.weight"):
                nn.init.normal_(p, 0, 0.02 / math.sqrt(2 * n_layer))

    def _init(self, m):
        if isinstance(m, nn.Linear):
            nn.init.normal_(m.weight, 0, 0.02)
            if m.bias is not None:
                nn.init.zeros_(m.bias)
        elif isinstance(m, nn.Embedding):
            nn.init.normal_(m.weight, 0, 0.02)

    def forward(self, idx, targets=None):
        T = idx.size(1)
        x = self.wte(idx) + self.wpe(torch.arange(T, device=idx.device))
        for b in self.blocks:
            x = b(x)
        logits = self.head(self.ln_f(x))
        loss = None
        if targets is not None:
            loss = F.cross_entropy(
                logits.view(-1, vocab_size), targets.view(-1)
            )
        return logits, loss

    @torch.no_grad()
    def generate(self, idx, max_new, temperature=0.8):
        for _ in range(max_new):
            logits, _ = self(idx[:, -block_size:])
            probs = F.softmax(logits[:, -1] / temperature, dim=-1)
            idx = torch.cat([idx, torch.multinomial(probs, 1)], dim=1)
        return idx


model = GPT().to(device)
print(f"params={sum(p.numel() for p in model.parameters())/1e6:.2f}M", flush=True)
opt = torch.optim.AdamW(model.parameters(), lr=learning_rate)


def sample(prompt="임금이 말하기를"):
    model.eval()
    ctx = torch.tensor(
        [[stoi[c] for c in unicodedata.normalize("NFD", prompt)]],
        dtype=torch.long,
        device=device,
    )
    out = model.generate(ctx, 300)
    s = "".join(vocab[int(i)] for i in out[0])
    model.train()
    return unicodedata.normalize("NFC", s)


def export_public(it: int) -> None:
    """model.ts flattenParams 순서와 정확히 일치. 임시파일 → rename으로 원자적 교체."""
    tensors: list[tuple[str, np.ndarray]] = []

    def add(name, arr):
        tensors.append((name, arr.detach().cpu().numpy().astype(np.float32)))

    add("wte", model.wte.weight)
    add("wpe", model.wpe.weight)
    for i, b in enumerate(model.blocks):
        add(f"block{i}.ln1g", b.ln1.weight)
        add(f"block{i}.ln1b", b.ln1.bias)
        add(f"block{i}.qkv", b.qkv.weight.T)  # torch [out,in] -> tfjs [in,out]
        add(f"block{i}.qkvB", b.qkv.bias)
        add(f"block{i}.proj", b.proj.weight.T)
        add(f"block{i}.projB", b.proj.bias)
        add(f"block{i}.ln2g", b.ln2.weight)
        add(f"block{i}.ln2b", b.ln2.bias)
        add(f"block{i}.fc", b.fc.weight.T)
        add(f"block{i}.fcB", b.fc.bias)
        add(f"block{i}.fproj", b.fproj.weight.T)
        add(f"block{i}.fprojB", b.fproj.bias)
    add("lnfG", model.ln_f.weight)
    add("lnfB", model.ln_f.bias)
    add("head", model.head.weight.T)

    flat = np.concatenate([a.reshape(-1) for _, a in tensors])
    bits = flat.astype(np.float16).view(np.uint16)
    tmp_bin = Path(f"{OUT}.bin.tmp")
    tmp_bin.write_bytes(bits.tobytes())  # little-endian
    tmp_bin.replace(f"{OUT}.bin")

    header = {
        "version": 1,
        "config": {
            "nLayer": n_layer,
            "nHead": n_head,
            "nEmbd": n_embd,
            "blockSize": block_size,
            "vocabSize": vocab_size,
        },
        "vocab": vocab,
        "tensors": [[name, list(a.shape)] for name, a in tensors],
        "iter": it,
    }
    tmp_json = Path(f"{OUT}.json.tmp")
    tmp_json.write_text(json.dumps(header, ensure_ascii=False))
    tmp_json.replace(f"{OUT}.json")


@torch.no_grad()
def val_loss(batches: int = 8) -> float:
    model.eval()
    total = 0.0
    for _ in range(batches):
        xv, yv = get_batch("val")
        _, vl = model(xv, yv)
        total += vl.item()
    model.train()
    return total / batches


# --- 재개 ---
it = 0
best_val = float("inf")
if RESUME.exists():
    ck = torch.load(RESUME, map_location=device)
    model.load_state_dict(ck["model"])
    opt.load_state_dict(ck["opt"])
    it = ck["iter"]
    best_val = ck["best_val"]
    print(f"resumed from iter {it} (best_val {best_val:.4f})", flush=True)

t0 = time.time()
it0 = it
while True:
    # cosine LR decay: 1e-3 → 1e-4 (decay_iters 이후엔 1e-4 유지)
    frac = min(it / decay_iters, 1.0)
    lr = 1e-4 + 0.5 * (learning_rate - 1e-4) * (1 + math.cos(math.pi * frac))
    for g in opt.param_groups:
        g["lr"] = lr
    x, y = get_batch("train")
    # bf16 autocast — M3에서 행렬곱 처리량 ↑. 파라미터·옵티마이저 상태는 fp32 유지
    with torch.autocast(device_type="mps", dtype=torch.bfloat16):
        _, loss = model(x, y)
    opt.zero_grad(set_to_none=True)
    loss.backward()
    opt.step()
    it += 1
    if it % 200 == 0:
        el = time.time() - t0
        print(
            f"[{el/60:.1f}min] iter {it} ({(it-it0)/el:.1f} it/s) "
            f"loss {loss.item():.4f} lr {lr:.1e}",
            flush=True,
        )
    if it % 3000 == 0:
        print("--- sample ---\n" + sample() + "\n---", flush=True)
    if it % eval_every == 0:
        v = val_loss()
        torch.save(
            {"model": model.state_dict(), "opt": opt.state_dict(),
             "iter": it, "best_val": min(best_val, v)},
            RESUME,
        )
        marker = ""
        if v < best_val:
            best_val = v
            export_public(it)
            marker = " -> exported to public/"
        print(f"[ckpt] iter {it} val {v:.4f} (best {best_val:.4f}){marker}", flush=True)
