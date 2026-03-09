import libraryData from './esriLibrary.json'

export interface EsriLibraryEntry {
  name: string
  url: string
}

export interface EsriLibraryGroup {
  group: string
  entries: EsriLibraryEntry[]
}

export const ESRI_LIBRARY = libraryData as EsriLibraryGroup[]
