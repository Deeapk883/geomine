# ============================================================
# FIXED PLOTTING & GEO-EXPORT
# ============================================================
# 1. Fix binary mask plot with capital 'Reds'
binary_mask = (mine_heatmap > 0.5).astype(np.float32)

fig, axes = plt.subplots(1, 3, figsize=(20, 7))

axes[0].imshow(rgb_scaled)
axes[0].set_title('Sentinel-2 RGB Imagery (2026)', fontsize=13)
axes[0].axis('off')

axes[1].imshow(rgb_scaled)
im1 = axes[1].imshow(mine_heatmap, cmap='hot', alpha=0.6, vmin=0.0, vmax=1.0)
axes[1].set_title('Mining Probability Heatmap', fontsize=13)
axes[1].axis('off')
fig.colorbar(im1, ax=axes[1], fraction=0.046, pad=0.04, label='Probability')

# --- FIX HERE: Changed 'reds' to 'Reds' ---
axes[2].imshow(rgb_scaled)
axes[2].imshow(np.ma.masked_where(binary_mask == 0, binary_mask), cmap='Reds', alpha=0.7)
axes[2].set_title('Detected Mining Locations (>50% Conf.)', fontsize=13)
axes[2].axis('off')

plt.tight_layout()
plt.savefig('/content/mining_detection_results.png', dpi=300)
plt.show()

# 2. Export Heatmap as a Georeferenced GeoTIFF
with rasterio.open(TIF_PATH) as src:
    profile = src.profile

profile.update(
    dtype=rasterio.float32,
    count=1,
    nodata=0
)

heatmap_export_path = '/content/mining_detection_heatmap.tif'
with rasterio.open(heatmap_export_path, 'w', **profile) as dst:
    dst.write(mine_heatmap.astype(rasterio.float32), 1)

print(f"✓ Georeferenced Heatmap saved to: {heatmap_export_path}")




# ============================================================
# INTERACTIVE ZOOMABLE MAP (FOLIUM + GOOGLE SATELLITE)
# ============================================================
import folium
import rasterio
from rasterio.warp import transform_bounds

# Extract Spatial Bounds in Lat/Lon (EPSG:4326)
with rasterio.open(TIF_PATH) as src:
    bounds = src.bounds
    crs = src.crs
    # Transform bounds to WGS84
    left, bottom, right, top = transform_bounds(crs, 'EPSG:4326', *bounds)
    center_lat = (bottom + top) / 2
    center_lon = (left + right) / 2

# Create Folium Map with Google Satellite Imagery
m = folium.Map(location=[center_lat, center_lon], zoom_start=12, max_zoom=20)

# Add Google Satellite Basemap
folium.TileLayer(
    tiles='https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    attr='Google',
    name='Google Satellite',
    overlay=False,
    control=True
).add_to(m)

# Add Google Hybrid Basemap (Satellite + Road Labels)
folium.TileLayer(
    tiles='https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attr='Google',
    name='Google Hybrid (Labels)',
    overlay=False,
    control=True
).add_to(m)

# Prepare Detection Overlay Image
from PIL import Image
import matplotlib.cm as cm

# Colorize Heatmap (Hot Colormap)
heatmap_norm = np.clip(mine_heatmap, 0, 1)
colormap = cm.get_cmap('hot')
colored_heatmap = colormap(heatmap_norm) # RGBA

# Set zero/low probability areas to fully transparent
colored_heatmap[mine_heatmap < 0.25, 3] = 0.0  # Transparency mask
colored_heatmap[mine_heatmap >= 0.25, 3] = 0.65 # 65% opacity for heat areas

img_overlay = (colored_heatmap * 255).astype(np.uint8)
png_path = '/content/overlay_heatmap.png'
Image.fromarray(img_overlay).save(png_path)

# Add Detection Overlay onto Interactive Map
folium.raster_layers.ImageOverlay(
    image=png_path,
    bounds=[[bottom, left], [top, right]],
    opacity=0.8,
    name='Mining Detection Heatmap'
).add_to(m)

# Add Layer Control UI
folium.LayerControl().add_to(m)

# Display Interactive Map in Colab
m