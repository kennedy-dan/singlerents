"use client";
import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    mapboxgl?: any;
  }
}

function popupContent(listing) {
  const content = document.createElement("div");
  const title = document.createElement("strong");
  const address = document.createElement("div");
  title.textContent = listing.title;
  address.textContent = listing.location;
  content.append(title, document.createElement("br"), address);
  return content;
}

export default function Map({ listings = [], onSelect }) {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (!token) {
      setError("Add NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN to enable the map.");
      return;
    }
    let cancelled = false;
    const addMarkers = async (mapboxgl) => {
      const results = await Promise.all(listings.map(async (listing) => {
        try {
          const url = new URL("https://api.mapbox.com/search/geocode/v6/forward");
          url.searchParams.set("q", listing.location);
          url.searchParams.set("country", "NG");
          url.searchParams.set("limit", "1");
          url.searchParams.set("access_token", token);
          const response = await fetch(url);
          const data = await response.json();
          const coordinates = data.features?.[0]?.geometry?.coordinates;
          return coordinates ? { listing, coordinates } : null;
        } catch { return null; }
      }));
      if (cancelled || !map.current) return;
      const pins = results.filter(Boolean);
      pins.forEach(({ listing, coordinates }) => {
        const marker = new mapboxgl.Marker().setLngLat(coordinates).setPopup(new mapboxgl.Popup({ offset: 24 }).setDOMContent(popupContent(listing))).addTo(map.current);
        marker.getElement().addEventListener("click", () => onSelect?.(listing));
      });
      if (pins.length) {
        const bounds = new mapboxgl.LngLatBounds();
        pins.forEach(({ coordinates }) => bounds.extend(coordinates));
        map.current.fitBounds(bounds, { padding: 48, maxZoom: 14, duration: 0 });
      }
    };
    const start = () => {
      const mapboxgl = window.mapboxgl;
      if (!mapboxgl || !element.current || map.current) return;
      mapboxgl.accessToken = token;
      map.current = new mapboxgl.Map({ container: element.current, style: "mapbox://styles/mapbox/streets-v12", center: [3.3792, 6.5244], zoom: 9 });
      map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
      map.current.on("load", () => addMarkers(mapboxgl));
    };
    if (window.mapboxgl) start();
    else {
      const css = document.createElement("link"); css.rel = "stylesheet"; css.href = "https://api.mapbox.com/mapbox-gl-js/v3.9.4/mapbox-gl.css"; document.head.appendChild(css);
      const script = document.createElement("script"); script.src = "https://api.mapbox.com/mapbox-gl-js/v3.9.4/mapbox-gl.js"; script.onload = start; script.onerror = () => setError("Mapbox could not be loaded."); document.head.appendChild(script);
    }
    return () => { cancelled = true; map.current?.remove(); map.current = null; };
  }, [listings, onSelect]);
  return error ? <div className="map"><b>{error}</b></div> : <div ref={element} className="map mapbox-map" />;
}
