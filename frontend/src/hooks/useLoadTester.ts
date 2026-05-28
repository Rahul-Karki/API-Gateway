import { useState, useRef } from "react"
import apiClient from "@/services/apiClient"

export function useLoadTester() {
  const [logs, setLogs] = useState<any[]>([])
  const nextIdRef = useRef(1)
  const completedRef = useRef(0)

  async function sendRequests(
    url: string,
    method: string,
    total: number,
    concurrency: number
  ) {
    nextIdRef.current = 1
    completedRef.current = 0

    async function worker() {
      while (true) {
        const mySlot = completedRef.current
        if (mySlot >= total) break
        completedRef.current++
        const myId = nextIdRef.current++

        const start = performance.now()

        try {
          const res = await apiClient({ url, method })
          const latency = performance.now() - start

          setLogs(prev => [
            ...prev,
            { id: myId, status: res.status, cache: res.headers["x-cache-status"], latency }
          ])
        } catch (err: any) {
          const latency = performance.now() - start
          setLogs(prev => [
            ...prev,
            { id: myId, status: err.response?.status || 500, cache: "-", latency }
          ])
        }
      }
    }

    const workers = Array.from({ length: Math.min(concurrency, total) }, () => worker())
    await Promise.all(workers)
  }

  return { logs, sendRequests }
}