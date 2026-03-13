import { ref, computed } from 'vue'
import type { Feature } from 'geojson'
import { analyzePolygonGeometry, type AnalysisResults } from '~/lib/geometryAnalysis'

export const usePolygonInspector = () => {
  const selectedFeature = ref<Feature | null>(null)
  const analysisResults = ref<AnalysisResults | null>(null)
  const isLoading = ref(false)
  const lastError = ref<string | null>(null)

  const hasSelection = computed(() => !!selectedFeature.value)

  const analyzePolygon = async (feature: Feature) => {
    isLoading.value = true
    lastError.value = null

    try {
      // Validate it's a polygon
      if (!feature.geometry || (feature.geometry.type !== 'Polygon' && feature.geometry.type !== 'MultiPolygon')) {
        lastError.value = 'Please select a polygon feature'
        selectedFeature.value = null
        analysisResults.value = null
        return
      }

      selectedFeature.value = feature
      analysisResults.value = analyzePolygonGeometry(feature)

      if (!analysisResults.value) {
        lastError.value = 'Could not analyze this polygon (invalid geometry)'
        selectedFeature.value = null
      }
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : 'Analysis failed'
      selectedFeature.value = null
      analysisResults.value = null
    } finally {
      isLoading.value = false
    }
  }

  const clearSelection = () => {
    selectedFeature.value = null
    analysisResults.value = null
    lastError.value = null
  }

  return {
    selectedFeature,
    analysisResults,
    isLoading,
    hasSelection,
    lastError,
    analyzePolygon,
    clearSelection,
  }
}
