import { useState } from "react"
import { apiClient } from "../services/apiClient"

export function useLoadTester() {

  const [logs, setLogs] = useState<any[]>([])

  async function sendRequests(
    url: string,
    method: string,
    total: number,
    concurrency: number
  ) {

    let completed = 0
    let id = 1

    async function worker() {

      while (completed < total) {

        const start = performance.now()

        try {

          const res = await apiClient({
            url,
            method
          })

          const latency = performance.now() - start

          setLogs(prev => [
            ...prev,
            {
              id: id++,
              status: res.status,
              cache: res.headers["x-cache-status"],
              latency
            }
          ])

        } catch (err: any) {

          const latency = performance.now() - start

          setLogs(prev => [
            ...prev,
            {
              id: id++,
              status: err.response?.status || 500,
              cache: "-",
              latency
            }
          ])

        }

        completed++

      }

    }

    const workers = []

    for (let i = 0; i < concurrency; i++) {
      workers.push(worker())
    }

    await Promise.all(workers)

  }

  return { logs, sendRequests }

}