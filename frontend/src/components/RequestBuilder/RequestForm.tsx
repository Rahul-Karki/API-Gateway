import { useState } from "react"

interface RequestFormProps {
  onSend: (
    url: string,
    method: string,
    total: number,
    concurrency: number
  ) => void | Promise<void>
}

export default function RequestForm({ onSend }: RequestFormProps) {

  const [url, setUrl] = useState("/api/products")
  const [method, setMethod] = useState("GET")
  const [total, setTotal] = useState(10)
  const [concurrency, setConcurrency] = useState(2)

  function handleSubmit() {
    onSend(url, method, total, concurrency)
  }

  return (
    <div>

      <h2>API Request Builder</h2>

      <select value={method} onChange={(e) => setMethod(e.target.value)}>
        <option>GET</option>
        <option>POST</option>
      </select>

      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />

      <input
        type="number"
        value={total}
        onChange={(e) => setTotal(Number(e.target.value))}
      />

      <input
        type="number"
        value={concurrency}
        onChange={(e) => setConcurrency(Number(e.target.value))}
      />

      <button onClick={handleSubmit}>
        Send Requests
      </button>

    </div>
  )
}