// Web map via Leaflet in an iframe (mirrors the original web app's Leaflet map).
// Native uses AppMap.tsx (react-native-maps) instead.
import React from "react";

export type MapMarker = { lat: number; lng: number; title?: string };

function leafletHtml(center: { lat: number; lng: number }, markers: MapMarker[]) {
  const pts = JSON.stringify(markers);
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>html,body,#map{height:100%;margin:0}#map{border-radius:20px}</style>
</head><body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var map = L.map('map',{zoomControl:false,attributionControl:false}).setView([${center.lat},${center.lng}], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
  L.circleMarker([${center.lat},${center.lng}],{radius:8,color:'#fff',weight:3,fillColor:'#2563EB',fillOpacity:1}).addTo(map);
  var icon = L.divIcon({className:'',html:'<div style="background:#7C3AED;border:2px solid #fff;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:15px;box-shadow:0 2px 6px rgba(0,0,0,.3)">🔧</div>',iconSize:[30,30],iconAnchor:[15,15]});
  (${pts}).forEach(function(p){ L.marker([p.lat,p.lng],{icon:icon}).addTo(map); });
</script></body></html>`;
}

export function AppMap({
  height = 200,
  markers = [],
  center
}: {
  height?: number;
  markers?: MapMarker[];
  center?: { lat: number; lng: number };
}) {
  const c = center ?? { lat: 18.5204, lng: 73.8567 };
  return React.createElement("iframe", {
    title: "map",
    srcDoc: leafletHtml(c, markers),
    style: { width: "100%", height, border: 0, borderRadius: 20, display: "block" }
  });
}
