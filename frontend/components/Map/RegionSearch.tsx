'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { Search, MapPin, X, Loader2 } from 'lucide-react';

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  boundingbox?: string[];
  type?: string;
  class?: string;
}

export const RegionSearch: React.FC = () => {
  const map = useMap();
  const [isExpanded, setIsExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeMarkerRef = useRef<L.Layer | null>(null);

  // Debounced geocoding search
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            query.trim()
          )}&limit=5&addressdetails=1`,
          {
            headers: {
              'Accept-Language': 'en',
            },
          }
        );
        if (response.ok) {
          const data: NominatimResult[] = await response.json();
          setResults(data);
          setIsOpen(data.length > 0);
        }
      } catch (err) {
        console.error('Failed to search region:', err);
      } finally {
        setIsLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside listener & Leaflet event isolation
  useEffect(() => {
    if (containerRef.current) {
      L.DomEvent.disableClickPropagation(containerRef.current);
      L.DomEvent.disableScrollPropagation(containerRef.current);
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpenSearch = () => {
    setIsExpanded(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleSelectLocation = (result: NominatimResult) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);

    if (isNaN(lat) || isNaN(lon)) return;

    // Fly map to coordinates
    if (result.boundingbox && result.boundingbox.length === 4) {
      const south = parseFloat(result.boundingbox[0]);
      const north = parseFloat(result.boundingbox[1]);
      const west = parseFloat(result.boundingbox[2]);
      const east = parseFloat(result.boundingbox[3]);

      map.flyToBounds(
        [
          [south, west],
          [north, east],
        ],
        {
          padding: [60, 60],
          maxZoom: 15,
          duration: 1.5,
        }
      );
    } else {
      map.flyTo([lat, lon], 14, { duration: 1.5 });
    }

    // Add highlighted visual pin marker on the map
    if (activeMarkerRef.current) {
      map.removeLayer(activeMarkerRef.current);
    }

    const shortTitle = result.display_name.split(',')[0];
    const markerGroup = L.layerGroup();

    // Pulse animation circle
    const circle = L.circleMarker([lat, lon], {
      radius: 14,
      color: '#f59e0b',
      fillColor: '#f59e0b',
      fillOpacity: 0.35,
      weight: 2,
    });

    circle.bindPopup(
      `<div style="font-family: sans-serif; font-size: 13px; font-weight: 600; color: #0f172a; padding: 2px;">
        📍 <strong>${shortTitle}</strong>
        <div style="font-size: 11px; font-weight: 400; color: #475569; margin-top: 2px;">${lat.toFixed(4)}, ${lon.toFixed(4)}</div>
      </div>`
    );

    markerGroup.addLayer(circle);
    markerGroup.addTo(map);
    circle.openPopup();

    activeMarkerRef.current = markerGroup;

    // Set input display text and collapse search bar
    setQuery(shortTitle);
    setIsOpen(false);
    setIsExpanded(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQuery('');
    setResults([]);
    setIsOpen(false);
    if (activeMarkerRef.current) {
      map.removeLayer(activeMarkerRef.current);
      activeMarkerRef.current = null;
    }
  };

  return (
    <div
      ref={containerRef}
      className="absolute top-[168px] left-3.5 z-[1000]"
    >
      {!isExpanded ? (
        /* Collapsed Icon Button */
        <button
          onClick={handleOpenSearch}
          className="flex items-center justify-center w-9 h-9 bg-dark-900/95 backdrop-blur-xl border border-slate-700/80 rounded-xl shadow-2xl hover:bg-slate-800 text-slate-300 hover:text-amber-400 transition-all cursor-pointer group"
          title="Search region or city"
        >
          <Search className="w-4 h-4 text-slate-300 group-hover:text-amber-400 group-hover:scale-110 transition-all" />
        </button>
      ) : (
        /* Expanded Search Bar Input */
        <div className="w-64 md:w-72 transition-all animate-in fade-in zoom-in-95 duration-150">
          <div className="relative flex items-center bg-dark-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl transition-all focus-within:border-amber-500/60 focus-within:ring-2 focus-within:ring-amber-500/20">
            <div className="pl-3 text-slate-400">
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
              ) : (
                <Search className="w-4 h-4 text-amber-400" />
              )}
            </div>

            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => {
                if (results.length > 0) setIsOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setIsOpen(false);
                  setIsExpanded(false);
                }
              }}
              placeholder="Search region or city..."
              className="w-full bg-transparent py-2 pl-2.5 pr-8 text-xs font-medium text-slate-100 placeholder-slate-400 focus:outline-none"
            />

            {query ? (
              <button
                onClick={handleClear}
                className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-200 transition-colors rounded-full hover:bg-slate-800"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={() => {
                  setIsOpen(false);
                  setIsExpanded(false);
                }}
                className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-200 transition-colors rounded-full hover:bg-slate-800"
                title="Close search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Auto-complete Dropdown */}
          {isOpen && results.length > 0 && (
            <div className="mt-1.5 w-full bg-dark-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden py-1 max-h-60 overflow-y-auto">
              {results.map((item) => {
                const parts = item.display_name.split(',');
                const primaryName = parts[0];
                const secondaryName = parts.slice(1).join(',').trim();

                return (
                  <button
                    key={item.place_id}
                    onClick={() => handleSelectLocation(item)}
                    className="w-full px-3 py-2 text-left hover:bg-amber-500/10 hover:border-l-2 hover:border-amber-500 transition-all flex items-start gap-2.5 group border-l-2 border-transparent"
                  >
                    <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <div className="overflow-hidden text-ellipsis">
                      <div className="text-xs font-semibold text-slate-200 group-hover:text-amber-300 transition-colors truncate">
                        {primaryName}
                      </div>
                      {secondaryName && (
                        <div className="text-[10px] text-slate-400 truncate">
                          {secondaryName}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* No results message */}
          {isOpen && !isLoading && results.length === 0 && query.trim().length >= 2 && (
            <div className="mt-1.5 w-full bg-dark-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl p-3 text-center text-xs text-slate-400">
              No matching regions found.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
