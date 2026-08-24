from shapely.geometry import shape
from pyproj import Geod

geod = Geod(ellps="WGS84")

def calculate_surface_area(geojson_polygon: dict):
    """
    Calculates polygon surface area in m² and km² using geodesic projection.
    """
    poly = shape(geojson_polygon)
    area_m2 = abs(geod.geometry_area_perimeter(poly)[0])
    return {
        "area_m2": round(area_m2, 2),
        "area_km2": round(area_m2 / 1e6, 4)
    }

