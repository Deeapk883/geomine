# ============================================================
# STEP 1: MODEL BUILDING & DATALOADERS
# ============================================================
import os
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import TensorDataset, DataLoader
import torchvision.models as models
import matplotlib.pyplot as plt
import numpy as np

# 1. Device Configuration
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"⚡ Using device: {device}")

# 2. Load Processed Datasets
DATA_DIR = '/content/processed_dataset'
train_data = torch.load(os.path.join(DATA_DIR, 'train_dataset.pt'))
val_data   = torch.load(os.path.join(DATA_DIR, 'val_dataset.pt'))
test_data  = torch.load(os.path.join(DATA_DIR, 'test_dataset.pt'))

train_ds = TensorDataset(train_data['X'], train_data['y'])
val_ds   = TensorDataset(val_data['X'], val_data['y'])
test_ds  = TensorDataset(test_data['X'], test_data['y'])

BATCH_SIZE = 64
train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True)
val_loader   = DataLoader(val_ds, batch_size=BATCH_SIZE, shuffle=False)
test_loader  = DataLoader(test_ds, batch_size=BATCH_SIZE, shuffle=False)

print(f"✓ DataLoaders ready: Train ({len(train_ds)}), Val ({len(val_ds)}), Test ({len(test_ds)})")

# 3. Build EfficientNet-B0 Adapted for 9 Input Channels
def build_9channel_efficientnet(num_classes=7):
    model = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.DEFAULT)
    
    # Extract original first conv layer (3 channels)
    old_conv = model.features[0][0]
    
    # Create new conv layer for 9 channels
    new_conv = nn.Conv2d(
        in_channels=9,
        out_channels=old_conv.out_channels,
        kernel_size=old_conv.kernel_size,
        stride=old_conv.stride,
        padding=old_conv.padding,
        bias=False
    )
    
    # Preserve pretrained RGB weights and initialize remaining 6 spectral channels
    with torch.no_grad():
        new_conv.weight[:, :3, :, :] = old_conv.weight
        rgb_mean_weight = old_conv.weight.mean(dim=1, keepdim=True)
        new_conv.weight[:, 3:, :, :] = rgb_mean_weight.repeat(1, 6, 1, 1)
        
    model.features[0][0] = new_conv
    
    # Replace final classification head for 7 target classes
    model.classifier[1] = nn.Linear(model.classifier[1].in_features, num_classes)
    return model

model = build_9channel_efficientnet(num_classes=7).to(device)
print("✓ 9-channel EfficientNet-B0 initialized successfully!")


# ============================================================
# STEP 2: TRAINING LOOP WITH EARLY STOPPING
# ============================================================
EPOCHS = 30
PATIENCE = 6
BEST_MODEL_PATH = '/content/best_efficientnet_b0.pth'

criterion = nn.CrossEntropyLoss()
optimizer = optim.AdamW(model.parameters(), lr=1e-3, weight_decay=1e-2)
scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=EPOCHS)

best_val_loss = float('inf')
patience_counter = 0

train_losses, val_losses = [], []
train_accs, val_accs = [], []

print("🚀 Starting EfficientNet-B0 Training...\n")

for epoch in range(1, EPOCHS + 1):
    # --- Training Phase ---
    model.train()
    running_loss, correct, total = 0.0, 0, 0
    
    for X_batch, y_batch in train_loader:
        X_batch, y_batch = X_batch.to(device), y_batch.to(device)
        
        optimizer.zero_grad()
        outputs = model(X_batch)
        loss = criterion(outputs, y_batch)
        loss.backward()
        optimizer.step()
        
        running_loss += loss.item() * X_batch.size(0)
        _, preds = torch.max(outputs, 1)
        correct += (preds == y_batch).sum().item()
        total += y_batch.size(0)
        
    train_loss = running_loss / total
    train_acc = correct / total
    
    # --- Validation Phase ---
    model.eval()
    val_running_loss, val_correct, val_total = 0.0, 0, 0
    
    with torch.no_grad():
        for X_batch, y_batch in val_loader:
            X_batch, y_batch = X_batch.to(device), y_batch.to(device)
            outputs = model(X_batch)
            loss = criterion(outputs, y_batch)
            
            val_running_loss += loss.item() * X_batch.size(0)
            _, preds = torch.max(outputs, 1)
            val_correct += (preds == y_batch).sum().item()
            val_total += y_batch.size(0)
            
    val_loss = val_running_loss / val_total
    val_acc = val_correct / val_total
    
    scheduler.step()
    
    train_losses.append(train_loss)
    val_losses.append(val_loss)
    train_accs.append(train_acc)
    val_accs.append(val_acc)
    
    print(f"Epoch [{epoch:02d}/{EPOCHS}] | "
          f"Train Loss: {train_loss:.4f} | Train Acc: {train_acc*100:.2f}% | "
          f"Val Loss: {val_loss:.4f} | Val Acc: {val_acc*100:.2f}%")
    
    # Checkpoint & Early Stopping Check
    if val_loss < best_val_loss:
        best_val_loss = val_loss
        patience_counter = 0
        torch.save(model.state_dict(), BEST_MODEL_PATH)
        # Also backup to Drive
        torch.save(model.state_dict(), '/content/drive/MyDrive/CNN_Processed_Dataset/best_efficientnet_b0.pth')
    else:
        patience_counter += 1
        if patience_counter >= PATIENCE:
            print(f"\n✋ Early stopping triggered after {epoch} epochs.")
            break

print(f"\n🎉 Training complete! Best Val Loss: {best_val_loss:.4f}")




# ============================================================
# STEP 3: EVALUATION & CONFUSION MATRIX
# ============================================================
from sklearn.metrics import classification_report, confusion_matrix
import seaborn as sns

CLASS_NAMES = ['Mines', 'Agriculture', 'Urban', 'Rocky/Hilly', 'Water', 'Forest', 'River Beds']

# Load best weights
model.load_state_dict(torch.load(BEST_MODEL_PATH))
model.eval()

y_true, y_preds = [], []

with torch.no_grad():
    for X_batch, y_batch in test_loader:
        X_batch = X_batch.to(device)
        outputs = model(X_batch)
        _, preds = torch.max(outputs, 1)
        
        y_true.extend(y_batch.numpy())
        y_preds.extend(preds.cpu().numpy())

# 1. Classification Metrics
print("==========================================================")
print("              TEST SET EVALUATION REPORT                  ")
print("==========================================================")
print(classification_report(y_true, y_preds, target_names=CLASS_NAMES, digits=4))

# 2. Confusion Matrix Plot
cm = confusion_matrix(y_true, y_preds)
plt.figure(figsize=(9, 7))
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
            xticklabels=CLASS_NAMES, yticklabels=CLASS_NAMES)
plt.title('Mining Detection - EfficientNet-B0 Confusion Matrix', fontsize=14)
plt.xlabel('Predicted Label', fontsize=12)
plt.ylabel('True Label', fontsize=12)
plt.tight_layout()
plt.savefig('/content/confusion_matrix.png', dpi=300)
plt.show()