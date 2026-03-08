export interface EsriLibraryEntry {
  name: string
  url: string
}

export interface EsriLibraryGroup {
  group: string
  entries: EsriLibraryEntry[]
}

export const ESRI_LIBRARY: EsriLibraryGroup[] = [
  {
    group: 'National / Federal',
    entries: [
      { name: 'ABS / GA Atlas',                  url: 'https://services-ap1.arcgis.com/ypkPEy1AmwPKGNNv/ArcGIS/rest/services' },
      { name: 'GA Atlas — Drainage Divisions',   url: 'https://services-ap1.arcgis.com/ypkPEy1AmwPKGNNv/ArcGIS/rest/services' },
      { name: 'GeoScience Australia',             url: 'https://services.ga.gov.au/site_13/rest/services' },
      { name: 'ESRI ArcGIS Online',              url: 'https://services.arcgisonline.com/ArcGIS/rest/services' },
      { name: 'ESRI World Imagery',              url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer' },
    ],
  },
  {
    group: 'ACT',
    entries: [
      { name: 'ACTMAPI',                          url: 'https://data4.actmapi.act.gov.au/arcgis/rest/services' },
    ],
  },
  {
    group: 'NSW',
    entries: [
      { name: 'Department of Planning',                             url: 'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services' },
      { name: 'Historical Planning',              url: 'https://api.apps1.nsw.gov.au/planning/arcgis/V1/rest/services/ePlanningHistoric/Planning_Historic_Combined/MapServer' },
      { name: 'Six Maps — Public',               url: 'https://maps.six.nsw.gov.au/arcgis/rest/services/public' },
      { name: 'Six Maps',                         url: 'https://maps.six.nsw.gov.au/arcgis/rest/services/sixmaps' },
      { name: 'Spatial Portal',                   url: 'https://portal.spatial.nsw.gov.au/server/rest/services' },
      { name: 'WaterNSW',                         url: 'https://mapprod.waternsw.com.au/arcgis/rest/services' },
      { name: 'Floods Nov 2022',                  url: 'https://portal.spatial.nsw.gov.au/server/rest/services/Floods_Nov_2022/MapServer' },
    ],
  },
  {
    group: 'QLD',
    entries: [
      { name: 'Brisbane City Council',            url: 'https://services2.arcgis.com/dEKgZETqwmDAh1rP/ArcGIS/rest/services' },
      { name: 'Department of Resources',         url: 'https://spatial-gis.information.qld.gov.au/arcgis/rest/services' },
      { name: 'Spatial Imagery',                  url: 'https://spatial-img.information.qld.gov.au/arcgis/rest/services' },
      { name: 'FloodCheck',                       url: 'https://spatial-img.information.qld.gov.au/arcgis/rest/services/FloodCheck' },
    ],
  },
  {
    group: 'SA',
    entries: [
      { name: 'Location SA',                      url: 'https://lsa4.geohub.sa.gov.au/server/rest/services' },
    ],
  },
  {
    group: 'TAS',
    entries: [
      { name: 'LIST Services',                    url: 'https://services.thelist.tas.gov.au/arcgis/rest/services' },
    ],
  },
  {
    group: 'VIC',
    entries: [
      { name: 'VIC Land',                         url: 'https://services6.arcgis.com/GB33F62SbDxJjwEL/ArcGIS/rest/services' },
      { name: 'Vicmap Property',                  url: 'https://services6.arcgis.com/GB33F62SbDxJjwEL/arcgis/rest/services/Vicmap_Property/FeatureServer/0' },
    ],
  },
  {
    group: 'WA',
    entries: [
      { name: 'DMP External',                     url: 'https://gissdi.dmp.wa.gov.au/gisexternal/rest/services/External' },
      { name: 'SLIP — Public',                   url: 'https://public-services.slip.wa.gov.au/public/rest/services' },
    ],
  },
]
