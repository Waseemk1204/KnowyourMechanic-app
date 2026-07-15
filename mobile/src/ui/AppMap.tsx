// Native map (iOS/Android) via react-native-maps.
// Web uses AppMap.web.tsx (Leaflet) instead — Metro resolves per platform.
import MapView, { Marker } from "react-native-maps";
import { StyleSheet } from "react-native";

export type MapMarker = { lat: number; lng: number; title?: string };

export function AppMap({
  height = 200,
  markers = [],
  center
}: {
  height?: number;
  markers?: MapMarker[];
  center?: { lat: number; lng: number };
}) {
  const c = center ?? { lat: 18.5204, lng: 73.8567 }; // Pune city center
  return (
    <MapView
      style={[styles.map, { height }]}
      initialRegion={{
        latitude: c.lat,
        longitude: c.lng,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08
      }}
    >
      {markers.map((m, i) => (
        <Marker key={`${m.lat}-${m.lng}-${i}`} coordinate={{ latitude: m.lat, longitude: m.lng }} title={m.title} />
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { borderRadius: 20, width: "100%" }
});
