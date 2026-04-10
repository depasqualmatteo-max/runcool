import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

// Country centroids for positioning labels
const COUNTRY_NAMES: Record<string, string> = {
  IT: 'Italia', FR: 'Francia', ES: 'Spagna', DE: 'Germania', GB: 'Regno Unito',
  US: 'USA', PT: 'Portogallo', GR: 'Grecia', HR: 'Croazia', AT: 'Austria',
  CH: 'Svizzera', NL: 'Paesi Bassi', BE: 'Belgio', SE: 'Svezia', NO: 'Norvegia',
  DK: 'Danimarca', PL: 'Polonia', CZ: 'Cechia', TR: 'Turchia', JP: 'Giappone',
  AU: 'Australia', BR: 'Brasile', MX: 'Messico', CA: 'Canada', AR: 'Argentina',
  TH: 'Thailandia', IE: 'Irlanda', SI: 'Slovenia', ME: 'Montenegro', AL: 'Albania',
  MA: 'Marocco', TN: 'Tunisia', EG: 'Egitto', KE: 'Kenya', ZA: 'Sudafrica',
};

interface CountryKm {
  code: string;
  name: string;
  totalKm: number;
}

export default function MappaScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [countries, setCountries] = useState<CountryKm[]>([]);
  const [totalCountries, setTotalCountries] = useState(0);
  const [totalKm, setTotalKm] = useState(0);

  useEffect(() => {
    loadCountryData();
  }, []);

  async function loadCountryData() {
    setLoading(true);
    try {
      // Read logs from Supabase that have country_code and km > 0
      // For now, also try to get location from device for recent workouts
      const { data: logs } = await supabase
        .from('logs')
        .select('km, country_code')
        .eq('user_id', user!.id)
        .eq('type', 'workout')
        .gt('km', 0);

      // Aggregate km per country
      const countryMap: Record<string, number> = {};
      (logs ?? []).forEach((log: any) => {
        if (log.country_code) {
          countryMap[log.country_code] = (countryMap[log.country_code] ?? 0) + (log.km ?? 0);
        }
      });

      // If no country data in logs yet, try current location as demo
      if (Object.keys(countryMap).length === 0) {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
            const [geo] = await Location.reverseGeocodeAsync({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            });
            if (geo?.isoCountryCode) {
              // Show current country with total km from all workouts without country
              const totalKmNoCountry = (logs ?? [])
                .filter((l: any) => !l.country_code)
                .reduce((s: number, l: any) => s + (l.km ?? 0), 0);
              if (totalKmNoCountry > 0) {
                countryMap[geo.isoCountryCode] = totalKmNoCountry;
              }
            }
          }
        } catch (_) {}
      }

      const result: CountryKm[] = Object.entries(countryMap)
        .map(([code, km]) => ({
          code,
          name: COUNTRY_NAMES[code] ?? code,
          totalKm: Math.round(km * 10) / 10,
        }))
        .filter(c => c.totalKm >= 10)
        .sort((a, b) => b.totalKm - a.totalKm);

      setCountries(result);
      setTotalCountries(result.length);
      setTotalKm(Math.round(result.reduce((s, c) => s + c.totalKm, 0) * 10) / 10);
    } catch (e) {
      console.error('Map data error:', e);
    } finally {
      setLoading(false);
    }
  }

  const highlightedCodes = countries.map(c => c.code);

  const mapHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
  <style>
    * { margin: 0; padding: 0; }
    #map { width: 100%; height: 100vh; background: #1a1a2e; }
    .leaflet-control-attribution { display: none !important; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const highlighted = ${JSON.stringify(highlightedCodes)};
    const countryKm = ${JSON.stringify(Object.fromEntries(countries.map(c => [c.code, c.totalKm])))};

    const map = L.map('map', {
      center: [30, 10],
      zoom: 2,
      minZoom: 1,
      maxZoom: 6,
      zoomControl: false,
      attributionControl: false,
    });

    // Dark tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map);

    // Load countries GeoJSON
    fetch('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson')
      .then(r => r.json())
      .then(geojson => {
        L.geoJSON(geojson, {
          style: function(feature) {
            const code = feature.properties.ISO_A2;
            const isHighlighted = highlighted.includes(code);
            return {
              fillColor: isHighlighted ? '#FFD700' : 'transparent',
              fillOpacity: isHighlighted ? 0.5 : 0,
              color: isHighlighted ? '#FFD700' : 'transparent',
              weight: isHighlighted ? 2 : 0,
            };
          },
          onEachFeature: function(feature, layer) {
            const code = feature.properties.ISO_A2;
            if (highlighted.includes(code)) {
              const km = countryKm[code] || 0;
              layer.bindPopup(
                '<div style="text-align:center;font-family:system-ui;font-size:14px;">' +
                '<b>' + feature.properties.ADMIN + '</b><br/>' +
                '<span style="color:#FFD700;font-size:18px;font-weight:800;">' + km + ' km</span>' +
                '</div>'
              );
            }
          }
        }).addTo(map);
      })
      .catch(err => console.error('GeoJSON error:', err));
  <\/script>
</body>
</html>
  `;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.loadingText}>Caricamento mappa...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Stats header */}
      <View style={styles.header}>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{totalCountries}</Text>
            <Text style={styles.statLabel}>Paesi</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{totalKm}</Text>
            <Text style={styles.statLabel}>km totali</Text>
          </View>
        </View>
        {countries.length === 0 && (
          <Text style={styles.emptyHint}>
            Corri almeno 10 km in un paese per vederlo illuminato!
          </Text>
        )}
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <WebView
          source={{ html: mapHtml }}
          style={styles.map}
          scrollEnabled={false}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          originWhitelist={['*']}
        />
      </View>

      {/* Country list */}
      {countries.length > 0 && (
        <View style={styles.countryList}>
          {countries.map(c => (
            <View key={c.code} style={styles.countryRow}>
              <Text style={styles.countryName}>{c.name}</Text>
              <Text style={styles.countryKm}>{c.totalKm} km</Text>
            </View>
          ))}
        </View>
      )}

      {/* Back button */}
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backBtnText}>Torna alle classifiche</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a2e' },
  loadingText: { color: '#888', marginTop: 16, fontSize: 14 },

  header: {
    backgroundColor: '#1a1a2e', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,215,0,0.2)',
  },
  statsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 24 },
  statBox: { alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: '800', color: '#FFD700' },
  statLabel: { fontSize: 12, color: '#888', marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,215,0,0.3)' },
  emptyHint: { textAlign: 'center', color: '#666', fontSize: 13, marginTop: 10 },

  mapContainer: { flex: 1 },
  map: { flex: 1, backgroundColor: '#1a1a2e' },

  countryList: {
    backgroundColor: '#1a1a2e', paddingHorizontal: 20, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: 'rgba(255,215,0,0.2)',
  },
  countryRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  countryName: { flex: 1, fontSize: 15, fontWeight: '600', color: '#fff' },
  countryKm: { fontSize: 16, fontWeight: '800', color: '#FFD700' },

  backBtn: { padding: 16, alignItems: 'center' },
  backBtnText: { fontSize: 14, fontWeight: '600', color: '#888' },
});
