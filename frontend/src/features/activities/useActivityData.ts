import { useCallback, useEffect, useRef, useState } from 'react'
import { activityService, getErrorMessage } from './activityService'
import type { Activity, ActivityCategory } from './types'

export function useActivityData(activityDate: string) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [activeActivity, setActiveActivity] = useState<Activity | null>(null)
  const [categories, setCategories] = useState<ActivityCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)

  const reload = useCallback(async () => {
    const currentRequestId = ++requestId.current
    setLoading(true)
    setError(null)
    try {
      const [nextActivities, nextActive, nextCategories] = await Promise.all([
        activityService.getForDate(activityDate),
        activityService.getActive(),
        activityService.getCategories(),
      ])
      if (currentRequestId === requestId.current) {
        setActivities(nextActivities)
        setActiveActivity(nextActive)
        setCategories(nextCategories)
      }
    } catch (requestError) {
      if (currentRequestId === requestId.current) {
        setError(getErrorMessage(requestError))
      }
    } finally {
      if (currentRequestId === requestId.current) setLoading(false)
    }
  }, [activityDate])

  useEffect(() => {
    void reload()
    return () => {
      requestId.current += 1
    }
  }, [reload])

  return {
    activities,
    activeActivity,
    categories,
    loading,
    error,
    reload,
  }
}
