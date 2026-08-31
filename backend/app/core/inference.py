import torch
import torchvision.models as models
import torch.nn as nn
import numpy as np
import os
from app.config import settings

class EfficientNet9Band(nn.Module):
    def __init__(self, num_classes=7):
        super().__init__()
        self.model = models.efficientnet_b0(weights=None)
        orig_conv = self.model.features[0][0]
        self.model.features[0][0] = nn.Conv2d(
            in_channels=9,
            out_channels=orig_conv.out_channels,
            kernel_size=orig_conv.kernel_size,
            stride=orig_conv.stride,
            padding=orig_conv.padding,
            bias=False
        )
        self.model.classifier[1] = nn.Linear(self.model.classifier[1].in_features, num_classes)

    def forward(self, x):
        return self.model(x)

def load_inference_model():
    model = EfficientNet9Band()
    if os.path.exists(settings.MODEL_WEIGHTS_PATH):
        checkpoint = torch.load(settings.MODEL_WEIGHTS_PATH, map_location=torch.device('cpu'))
        if isinstance(checkpoint, dict) and "state_dict" in checkpoint:
            checkpoint = checkpoint["state_dict"]

        model_keys = set(model.state_dict().keys())
        new_state = {}
        for k, v in checkpoint.items():
            if k in model_keys:
                new_state[k] = v
            elif f"model.{k}" in model_keys:
                new_state[f"model.{k}"] = v
            elif k.startswith("model.") and k[6:] in model_keys:
                new_state[k[6:]] = v
            else:
                new_state[k] = v
        model.load_state_dict(new_state)
    model.eval()
    
    norm_stats = None
    if os.path.exists(settings.NORM_STATS_PATH):
        norm_stats = torch.load(settings.NORM_STATS_PATH, map_location=torch.device('cpu'))
        
    return model, norm_stats

def run_sliding_window_inference(img_9band: np.ndarray) -> np.ndarray:
    """
    Performs sliding-window inference over a 9-band numpy image array of shape (9, H, W).
    Returns a 2D probability heatmap of shape (H, W).
    """
    model, norm_stats = load_inference_model()
    
    C, H, W = img_9band.shape
    patch_size = settings.PATCH_SIZE
    stride = settings.STRIDE
    
    heatmap = np.zeros((H, W), dtype=np.float32)
    count_map = np.zeros((H, W), dtype=np.float32)
    
    img_tensor = torch.from_numpy(img_9band).float()
    
    # Normalize channels
    if norm_stats is not None and "mean" in norm_stats and "std" in norm_stats:
        mean = norm_stats["mean"].view(9, 1, 1)
        std = norm_stats["std"].view(9, 1, 1)
        img_tensor = (img_tensor - mean) / (std + 1e-6)
    else:
        for c in range(C):
            c_std = img_tensor[c].std()
            if c_std > 0:
                img_tensor[c] = (img_tensor[c] - img_tensor[c].mean()) / c_std

    model.eval()
    patches = []
    coords = []
    
    for y in range(0, max(1, H - patch_size + 1), stride):
        for x in range(0, max(1, W - patch_size + 1), stride):
            y_end = min(y + patch_size, H)
            x_end = min(x + patch_size, W)
            
            patch = img_tensor[:, y:y_end, x:x_end]
            if patch.shape[1] < patch_size or patch.shape[2] < patch_size:
                padded = torch.zeros((9, patch_size, patch_size), dtype=torch.float32)
                padded[:, :patch.shape[1], :patch.shape[2]] = patch
                patch = padded
                
            patches.append(patch)
            coords.append((y, y_end, x, x_end))
            
    if patches:
        batch_size = 128
        with torch.no_grad():
            for i in range(0, len(patches), batch_size):
                batch_patches = torch.stack(patches[i:i + batch_size])
                logits = model(batch_patches)
                probs = torch.softmax(logits, dim=1)
                mine_probs = probs[:, 0].cpu().numpy()
                
                for idx, prob in enumerate(mine_probs):
                    y, y_end, x, x_end = coords[i + idx]
                    heatmap[y:y_end, x:x_end] += float(prob)
                    count_map[y:y_end, x:x_end] += 1.0

    count_map[count_map == 0] = 1.0
    heatmap = heatmap / count_map
    return heatmap