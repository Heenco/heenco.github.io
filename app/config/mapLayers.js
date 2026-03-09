const BASE_URL = 'https://overturemaps-tiles-us-west-2-beta.s3.amazonaws.com/2025-04-23';

// --- PLACES: source + per-category layer definitions ---
export const placesSource = {
  type: 'vector',
  url: `pmtiles://${BASE_URL}/places.pmtiles`,
  minzoom: 0,
  maxzoom: 14
};

export const placeCategories = [
  { id: 'gym',         name: 'Gyms & Fitness',    color: '#d14040' },
  { id: 'restaurant',  name: 'Restaurants',        color: '#f97316' },
  { id: 'cafe',        name: 'Cafes',              color: '#f59e0b' },
  { id: 'bar',         name: 'Bars & Nightlife',   color: '#8b5cf6' },
  { id: 'hotel',       name: 'Hotels',             color: '#3b82f6' },
  { id: 'hospital',    name: 'Healthcare',         color: '#ec4899' },
  { id: 'school',      name: 'Education',          color: '#14b8a6' },
  { id: 'pharmacy',    name: 'Pharmacies',         color: '#10b981' },
  { id: 'supermarket', name: 'Shopping',            color: '#84cc16' },
  { id: 'bank',        name: 'Banks',              color: '#6366f1' },
  { id: 'park',        name: 'Parks & Recreation', color: '#22c55e' },
  { id: 'gas_station', name: 'Gas Stations',       color: '#94a3b8' },
];

export const mapLayers = [
  // --- KONTUR POPULATION ---
  {
    id: 'population',
    name: 'Population',
    description: 'Population density (H3 hexagons)',
    visible: false,
    source: {
      type: 'vector',
      url: 'pmtiles:///kontur_population_AU.pmtiles',
      minzoom: 2,
      maxzoom: 12
    },
    layer: {
      type: 'fill',
      'source-layer': 'population',
      minzoom: 2,
      maxzoom: 14,
      paint: {
        'fill-color': [
          'interpolate', ['linear'], ['get', 'population'],
          0,    '#ffffcc',
          10,   '#c7e9b4',
          50,   '#7fcdbb',
          100,  '#41b6c4',
          500,  '#1d91c0',
          1000, '#225ea8',
          5000, '#0c2c84'
        ],
        'fill-opacity': [
          'interpolate', ['linear'], ['zoom'],
          2,  0.3,
          7,  0.4,
          9,  0.7,
          12, 0.8
        ],
        'fill-outline-color': 'rgba(0,0,0,0)'
      }
    }
  },

  // --- FOURSQUARE PLACES ---
  {
    id: 'fsq-places',
    name: 'Foursquare Places',
    description: 'POIs from Foursquare Open Source',
    visible: false,
    source: {
      type: 'vector',
      url: 'pmtiles://https://fsq-os-places-us-east-1.s3.us-east-1.amazonaws.com/release/vector-tiles/latest/fsq-os-places.pmtiles'
    },
    layer: {
      type: 'circle',
      'source-layer': 'places',
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 1.5, 6, 2, 9, 2.5, 12, 3.5, 16, 5],
        'circle-color': '#06b6d4',
        'circle-opacity': ['interpolate', ['linear'], ['zoom'], 3, 0.5, 6, 0.65, 10, 0.8, 14, 0.95],
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 3, 0.3, 10, 0.6, 16, 1],
        'circle-stroke-opacity': ['interpolate', ['linear'], ['zoom'], 3, 0.3, 10, 0.6, 16, 0.8]
      }
    }
  },

  // --- ADDRESSES ---
  {
    id: 'addresses',
    name: 'Addresses',
    description: 'Point locations with street addresses',
    visible: false,
    source: {
      type: 'vector',
      url: `pmtiles://${BASE_URL}/addresses.pmtiles`
    },
    layer: {
      type: 'circle',
      'source-layer': 'address',
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 1, 16, 4],
        'circle-color': '#f59e0b',
        'circle-opacity': 0.6
      }
    }
  },

  // --- BUILDINGS ---
  {
    id: 'buildings',
    name: 'Buildings',
    description: 'Building footprints and outlines',
    visible: false,
    source: {
      type: 'vector',
      url: `pmtiles://${BASE_URL}/buildings.pmtiles`
    },
    layer: {
      type: 'fill',
      'source-layer': 'building',
      paint: {
        'fill-color': '#ef4444',
        'fill-opacity': 0.4,
        'fill-outline-color': '#dc2626'
      }
    }
  },

  // --- TRANSPORTATION (roads) ---
  {
    id: 'transportation',
    name: 'Transportation',
    description: 'Roads and transportation networks',
    visible: false,
    source: {
      type: 'vector',
      url: `pmtiles://${BASE_URL}/transportation.pmtiles`
    },
    layer: {
      type: 'line',
      'source-layer': 'segment',
      paint: {
        'line-color': '#10b981',
        'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.5, 14, 2, 18, 4],
        'line-opacity': 0.7
      }
    }
  },

  // --- DIVISIONS (boundaries) ---
  {
    id: 'divisions',
    name: 'Divisions',
    description: 'Administrative boundaries',
    visible: false,
    source: {
      type: 'vector',
      url: `pmtiles://${BASE_URL}/divisions.pmtiles`
    },
    layer: {
      type: 'line',
      'source-layer': 'division_boundary',
      paint: {
        'line-color': '#8b5cf6',
        'line-width': ['interpolate', ['linear'], ['zoom'], 4, 1, 10, 2, 14, 3],
        'line-dasharray': [4, 2],
        'line-opacity': 0.7
      }
    }
  },

  // --- BASE (land use) ---
  {
    id: 'land-use',
    name: 'Land Use',
    description: 'Land use classifications',
    visible: false,
    source: {
      type: 'vector',
      url: `pmtiles://${BASE_URL}/base.pmtiles`
    },
    layer: {
      type: 'fill',
      'source-layer': 'land_use',
      paint: {
        'fill-color': '#22c55e',
        'fill-opacity': 0.25,
        'fill-outline-color': '#16a34a'
      }
    }
  },
];
