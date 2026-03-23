import { useState, useRef, useCallback } from "react"
import apiClient from "@/services/apiClient"

type LogEntry = {
  id: number
  url: string
  method: string
  status: number
  statusText: string
  cache: string
  latency: number
  authorized: boolean
  rateLimited: boolean
  timestamp: string
  responseData?: any
}

const METHOD_COLORS: Record<string, string> = {
  GET: "#22d3ee",
  POST: "#a78bfa",
  PUT: "#fb923c",
  DELETE: "#f87171",
  PATCH: "#34d399",
}

const CACHE_COLORS: Record<string, string> = {
  HIT: "#22d3ee",
  MISS: "#f59e0b",
  BYPASS: "#f87171",
  EXPIRED: "#fb923c",
  STALE: "#a78bfa",
  "CLIENT-CACHE": "#34d399",
  "-": "#4a5568",
}

// Build the correct URL based on method
function buildUrl(baseUrl: string, method: string, id: string): string {
  if (method === "DELETE") return `/api/products/delete/${id}`
  if (method === "PUT" || method === "PATCH") return `/api/products/update/${id}`
  if (method === "GET") return `/api/products/${id}`
  return baseUrl
}

export default function ApiTester() {
  const [url, setUrl] = useState("/api/products/all")
  const [method, setMethod] = useState("GET")
  const [body, setBody] = useState("")
  const [total, setTotal] = useState(20)
  const [concurrency, setConcurrency] = useState(1)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [filter, setFilter] = useState("ALL")

  // Which log row is expanded to show product panel
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null)
  // Which product card is selected inside the panel
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null)
  // Client-side cache — store all products from /all so GET by ID never needs a backend hit
  const productsCacheRef = useRef<Record<string, any>>({})

  const nextSlotRef = useRef(0)
  const nextIdRef = useRef(1)

  const handleBodyKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault()
      const ta = e.currentTarget
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const newVal = ta.value.substring(0, start) + "  " + ta.value.substring(end)
      setBody(newVal)
      requestAnimationFrame(() => {
        ta.selectionStart = start + 2
        ta.selectionEnd = start + 2
      })
    }
  }, [])

  async function sendRequests() {
    setLogs([])
    setRunning(true)
    setProgress(0)
    setExpandedRowId(null)
    setSelectedProduct(null)
    productsCacheRef.current = {}
    nextSlotRef.current = 0
    nextIdRef.current = 1

    let parsedBody: any = undefined
    if (body.trim() && method !== "GET") {
      try { parsedBody = JSON.parse(body) } catch { parsedBody = body }
    }

    async function worker() {
      while (true) {
        const mySlot = nextSlotRef.current
        if (mySlot >= total) break
        nextSlotRef.current++

        const myId = nextIdRef.current++
        const start = performance.now()
        const ts = new Date().toLocaleTimeString("en-US", {
          hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit",
        })

        try {
          const res = await apiClient({ url, method, data: parsedBody })
          const latency = performance.now() - start
          const rawCache = res.headers["x-cache-status"] || res.headers["x-cache"] || ""
          const cacheStatus = rawCache.toString().toUpperCase().trim() || "MISS"

          // If this is /all response, store all products in client cache
          if (url.includes("/all") && res.data?.products) {
            res.data.products.forEach((p: any) => {
              productsCacheRef.current[p._id] = p
            })
          }

          // If GET by ID, try to serve from client cache first
          if (method === "GET" && !url.includes("/all")) {
            const id = url.split("/").filter(Boolean).pop()
            const cached = id ? productsCacheRef.current[id] : null
            if (cached) {
              const latencyFromCache = performance.now() - start
              setLogs(prev => [...prev, {
                id: myId, url, method,
                status: 200,
                statusText: "OK (from cache)",
                cache: "CLIENT-CACHE",
                latency: latencyFromCache,
                authorized: true,
                rateLimited: false,
                timestamp: ts,
                responseData: cached,
              }])
              setProgress(Math.min(100, Math.round((nextSlotRef.current / total) * 100)))
              continue
            }
          }

          setLogs(prev => [...prev, {
            id: myId, url, method,
            status: res.status,
            statusText: "OK",
            cache: cacheStatus,
            latency,
            authorized: true,
            rateLimited: false,
            timestamp: ts,
            responseData: res.data,
          }])
        } catch (err: any) {
          const latency = performance.now() - start
          const status = err.response?.status || 0
          setLogs(prev => [...prev, {
            id: myId, url, method,
            status,
            statusText:
              status === 429 ? "Rate Limited" :
              status === 401 ? "Unauthorized" :
              status === 403 ? "Forbidden" :
              status === 0   ? "Network Error" : "Error",
            cache: "-",
            latency,
            authorized: status !== 401 && status !== 403,
            rateLimited: status === 429,
            timestamp: ts,
            responseData: err.response?.data,
          }])
        }

        setProgress(Math.min(100, Math.round((nextSlotRef.current / total) * 100)))
      }
    }

    const workerCount = Math.min(concurrency, total)
    await Promise.all(Array.from({ length: workerCount }, () => worker()))
    setRunning(false)
    setProgress(100)
  }

  // When user clicks a product chip → auto fill URL + switch method
  function handleProductSelect(productId: string, newMethod: string) {
    const newUrl = buildUrl(url, newMethod, productId)
    setUrl(newUrl)
    setMethod(newMethod)

    if (newMethod === "PUT" || newMethod === "PATCH") {
      if (selectedProduct) {
        const { _id, __v, createdAt, updatedAt, ...editableFields } = selectedProduct
        setBody(JSON.stringify(editableFields, null, 2))
      }
    } else {
      setBody("")
    }

    setExpandedRowId(null)
    setSelectedProduct(null)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const filtered =
    filter === "ALL"          ? logs :
    filter === "HIT"          ? logs.filter(l => l.cache === "HIT") :
    filter === "MISS"         ? logs.filter(l => l.cache === "MISS") :
    filter === "RATE_LIMITED" ? logs.filter(l => l.rateLimited) :
    filter === "UNAUTHORIZED" ? logs.filter(l => !l.authorized) :
    filter === "SUCCESS"      ? logs.filter(l => l.status >= 200 && l.status < 300) :
    logs

  const stats = {
    total: logs.length,
    success: logs.filter(l => l.status >= 200 && l.status < 300).length,
    rateLimited: logs.filter(l => l.rateLimited).length,
    unauthorized: logs.filter(l => !l.authorized && !l.rateLimited).length,
    cacheHit: logs.filter(l => l.cache === "HIT").length,
    avgLatency: logs.length
      ? (logs.reduce((a, b) => a + b.latency, 0) / logs.length).toFixed(1)
      : "—",
  }

  return (
    <div style={{ minHeight: "100vh", background: "#080c10", color: "#e2e8f0", fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>

      {/* Top bar */}
      <div style={{ borderBottom: "1px solid #1e2d3d", padding: "14px 28px", display: "flex", alignItems: "center", gap: "12px", background: "#0a0f14" }}>
        <div style={{ display: "flex", gap: 6 }}>
          {["#f87171","#fb923c","#22d3ee"].map(c => (
            <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c, opacity: 0.8 }} />
          ))}
        </div>
        <span style={{ color: "#22d3ee", fontSize: 12, letterSpacing: "0.15em", marginLeft: 8 }}>API GATEWAY TESTER</span>
        <span style={{ color: "#1e2d3d" }}>|</span>
        <span style={{ color: "#4a5568", fontSize: 11 }}>rate-limit · cache · auth · load</span>
        {running && <span style={{ marginLeft: "auto", color: "#22d3ee", fontSize: 11, animation: "blink 1s infinite" }}>● RUNNING {progress}%</span>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", minHeight: "calc(100vh - 49px)" }}>

        {/* ── LEFT PANEL ── */}
        <div style={{ borderRight: "1px solid #1e2d3d", padding: "20px", display: "flex", flexDirection: "column", gap: "18px", background: "#0a0f14" }}>

          {/* Method + URL */}
          <div>
            <label style={labelStyle}>ENDPOINT</label>
            <div style={{ display: "flex", border: "1px solid #1e2d3d", borderRadius: 6, overflow: "hidden" }}>
              <select value={method} onChange={e => setMethod(e.target.value)} style={{
                background: "#0d1117", border: "none", borderRight: "1px solid #1e2d3d",
                color: METHOD_COLORS[method] || "#e2e8f0",
                padding: "9px 10px", fontSize: 11, fontFamily: "inherit",
                fontWeight: 700, cursor: "pointer", outline: "none",
              }}>
                {["GET","POST","PUT","DELETE","PATCH"].map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="/api/products/all"
                style={{ ...inputStyle, flex: 1, borderRadius: 0, border: "none" }}
              />
            </div>
            {/* Show which ID is loaded */}
            {url !== "/api/products/all" && url.includes("/api/products/") && (
              <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "#4a5568", fontSize: 10 }}>loaded id:</span>
                <span style={{ color: "#22d3ee", fontSize: 10, letterSpacing: "0.05em" }}>
                  {url.split("/").filter(Boolean).pop()}
                </span>
                <button
                  onClick={() => { setUrl("/api/products/all"); setBody(""); setMethod("GET") }}
                  style={{ background: "transparent", border: "none", color: "#f87171", fontSize: 10, cursor: "pointer", fontFamily: "inherit", padding: 0 }}
                >
                  ✕ clear
                </button>
              </div>
            )}
          </div>

          {/* Body */}
          {method !== "GET" && (
            <div>
              <label style={labelStyle}>REQUEST BODY — Tab inserts spaces</label>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                onKeyDown={handleBodyKeyDown}
                placeholder={'{\n  "key": "value"\n}'}
                rows={6}
                style={{ ...inputStyle, width: "100%", resize: "vertical", color: "#22d3ee", lineHeight: 1.6, boxSizing: "border-box" }}
              />
            </div>
          )}

          {/* Load config */}
          <div>
            <label style={labelStyle}>LOAD CONFIGURATION</label>
            <div style={{
              background: "#0d1117", border: "1px solid #1e2d3d", borderRadius: 6,
              padding: "10px 12px", marginBottom: 12, fontSize: 11, color: "#4a5568", lineHeight: 1.7,
            }}>
              <span style={{ color: "#22d3ee" }}>Concurrency</span> = simultaneous requests
              <br />
              <span style={{ color: "#e2e8f0" }}>1</span> = one at a time &nbsp;
              <span style={{ color: "#e2e8f0" }}>5</span> = 5 at once &nbsp;
              <span style={{ color: "#f87171" }}>20</span> = stress test
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ ...labelStyle, marginBottom: 5 }}>TOTAL REQUESTS</label>
                <input type="number" min={1} max={500} value={total}
                  onChange={e => setTotal(Math.max(1, Number(e.target.value)))}
                  style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ ...labelStyle, marginBottom: 5 }}>CONCURRENCY</label>
                <input type="number" min={1} max={50} value={concurrency}
                  onChange={e => setConcurrency(Math.max(1, Number(e.target.value)))}
                  style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} />
              </div>
            </div>
          </div>

          {/* Progress */}
          {(running || progress > 0) && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ color: "#4a5568", fontSize: 10, letterSpacing: "0.1em" }}>PROGRESS</span>
                <span style={{ color: "#22d3ee", fontSize: 10 }}>{logs.length} / {total}</span>
              </div>
              <div style={{ background: "#1e2d3d", borderRadius: 4, height: 3 }}>
                <div style={{ width: `${progress}%`, height: "100%", background: "#22d3ee", borderRadius: 4, transition: "width 0.15s ease" }} />
              </div>
            </div>
          )}

          <button onClick={sendRequests} disabled={running} style={{
            background: running ? "#1e2d3d" : "#22d3ee",
            border: "none", borderRadius: 6,
            color: running ? "#4a5568" : "#080c10",
            padding: "13px", fontSize: 11, fontFamily: "inherit",
            fontWeight: 700, letterSpacing: "0.15em",
            cursor: running ? "not-allowed" : "pointer", marginTop: "auto",
          }}>
            {running ? `RUNNING... ${progress}%` : "▶  RUN TEST"}
          </button>

          {logs.length > 0 && !running && (
            <button onClick={() => { setLogs([]); setProgress(0); setExpandedRowId(null) }} style={{
              background: "transparent", border: "1px solid #1e2d3d", borderRadius: 6,
              color: "#4a5568", padding: "9px", fontSize: 10,
              fontFamily: "inherit", letterSpacing: "0.1em", cursor: "pointer",
            }}>
              CLEAR RESULTS
            </button>
          )}
        </div>

        {/* ── RIGHT PANEL ── */}
        <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Stats */}
          {logs.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", borderBottom: "1px solid #1e2d3d", background: "#0a0f14", flexShrink: 0 }}>
              {[
                { label: "SENT",         value: stats.total,       color: "#e2e8f0" },
                { label: "SUCCESS",      value: stats.success,     color: "#22d3ee" },
                { label: "RATE LIMITED", value: stats.rateLimited, color: "#f87171" },
                { label: "UNAUTHORIZED", value: stats.unauthorized,color: "#fb923c" },
                { label: "CACHE HITS",   value: stats.cacheHit,    color: "#a78bfa" },
                { label: "AVG LATENCY",  value: `${stats.avgLatency}ms`, color: "#34d399" },
              ].map(s => (
                <div key={s.label} style={{ padding: "12px 14px", borderRight: "1px solid #1e2d3d" }}>
                  <div style={{ color: "#4a5568", fontSize: 9, letterSpacing: "0.12em", marginBottom: 4 }}>{s.label}</div>
                  <div style={{ color: s.color, fontSize: 18, fontWeight: 700 }}>{s.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Filter tabs */}
          {logs.length > 0 && (
            <div style={{ display: "flex", borderBottom: "1px solid #1e2d3d", background: "#0a0f14", padding: "0 14px", flexShrink: 0 }}>
              {[
                { key: "ALL",          label: `All (${logs.length})` },
                { key: "SUCCESS",      label: `Success (${stats.success})` },
                { key: "HIT",          label: `Cache Hit (${stats.cacheHit})` },
                { key: "MISS",         label: `Cache Miss (${logs.filter(l=>l.cache==="MISS").length})` },
                { key: "RATE_LIMITED", label: `Rate Limited (${stats.rateLimited})` },
                { key: "UNAUTHORIZED", label: `Unauthorized (${stats.unauthorized})` },
              ].map(f => (
                <button key={f.key} onClick={() => setFilter(f.key)} style={{
                  background: "transparent", border: "none",
                  borderBottom: filter === f.key ? "2px solid #22d3ee" : "2px solid transparent",
                  color: filter === f.key ? "#22d3ee" : "#4a5568",
                  padding: "10px 12px", fontSize: 10, fontFamily: "inherit",
                  letterSpacing: "0.08em", cursor: "pointer", whiteSpace: "nowrap",
                }}>
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {/* Table */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {logs.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 10, color: "#1e2d3d" }}>
                <div style={{ fontSize: 40 }}>⬡</div>
                <div style={{ fontSize: 11, letterSpacing: "0.2em" }}>CONFIGURE AND RUN A TEST</div>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr style={{ background: "#0a0f14", position: "sticky", top: 0, zIndex: 1 }}>
                    {["#","TIME","METHOD","ENDPOINT","STATUS","CACHE","AUTH","LATENCY",""].map(h => (
                      <th key={h} style={{ padding: "9px 14px", textAlign: "left", color: "#4a5568", fontSize: 9, letterSpacing: "0.12em", fontWeight: 500, borderBottom: "1px solid #1e2d3d", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((log, i) => {
                    const statusColor =
                      log.rateLimited ? "#f87171" :
                      log.status >= 200 && log.status < 300 ? "#22d3ee" :
                      log.status === 401 || log.status === 403 ? "#fb923c" : "#f87171"

                    const isExpanded = expandedRowId === log.id

                    // support { products: [...] }, [...], or single { _id: ... }
                    const rawData = log.responseData
                    const products: any[] = Array.isArray(rawData)
                      ? rawData
                      : Array.isArray(rawData?.products)
                      ? rawData.products
                      : rawData?._id ? [rawData] : []
                    const hasProduct = log.status >= 200 && log.status < 300 && products.length > 0

                    return (
                      <>
                        <tr
                          key={log.id}
                          onClick={() => {
                            if (!hasProduct) return
                            setExpandedRowId(isExpanded ? null : log.id)
                            setSelectedProduct(null)
                          }}
                          style={{
                            borderBottom: isExpanded ? "none" : "1px solid #0d1117",
                            background: isExpanded ? "#0d1520" : i % 2 === 0 ? "transparent" : "#0a0f1460",
                            cursor: hasProduct ? "pointer" : "default",
                          }}
                          onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = "#1e2d3d30" }}
                          onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = i % 2 === 0 ? "transparent" : "#0a0f1460" }}
                        >
                          <td style={{ padding: "8px 14px", color: "#4a5568" }}>{log.id}</td>
                          <td style={{ padding: "8px 14px", color: "#4a5568", whiteSpace: "nowrap" }}>{log.timestamp}</td>
                          <td style={{ padding: "8px 14px" }}>
                            <span style={{ color: METHOD_COLORS[log.method] || "#e2e8f0", fontWeight: 700 }}>{log.method}</span>
                          </td>
                          <td style={{ padding: "8px 14px", color: "#6b7280", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{log.url}</td>
                          <td style={{ padding: "8px 14px" }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: statusColor, fontWeight: 700 }}>
                              <span style={{ width: 5, height: 5, borderRadius: "50%", background: statusColor, flexShrink: 0 }} />
                              {log.status} {log.statusText}
                            </span>
                          </td>
                          <td style={{ padding: "8px 14px" }}>
                            <span style={{ color: CACHE_COLORS[log.cache] || "#4a5568", fontWeight: 700, letterSpacing: "0.05em" }}>{log.cache}</span>
                          </td>
                          <td style={{ padding: "8px 14px" }}>
                            <span style={{ color: log.authorized ? "#34d399" : "#f87171", fontWeight: 700 }}>
                              {log.authorized ? "✓ AUTH" : "✗ UNAUTH"}
                            </span>
                          </td>
                          <td style={{ padding: "8px 14px" }}>
                            <span style={{ color: log.latency < 100 ? "#34d399" : log.latency < 500 ? "#f59e0b" : "#f87171", fontWeight: 700 }}>
                              {log.latency.toFixed(1)}ms
                            </span>
                          </td>
                          <td style={{ padding: "8px 14px" }}>
                            {hasProduct && (
                              <span style={{ color: "#4a5568", fontSize: 10 }}>{isExpanded ? "▲" : "▼"}</span>
                            )}
                          </td>
                        </tr>

                        {/* ── PRODUCT PANEL ── */}
                        {isExpanded && hasProduct && (
                          <tr key={`${log.id}-panel`}>
                            <td colSpan={9} style={{ padding: 0, borderBottom: "1px solid #1e2d3d" }}>
                              <div style={{ background: "#0d1520", borderTop: "1px solid #1e2d3d", padding: "16px 20px" }}>

                                {/* Step 1 — pick a product from the array */}
                                <div style={{ marginBottom: 14 }}>
                                  <span style={{ color: "#4a5568", fontSize: 10, letterSpacing: "0.12em" }}>
                                    {products.length > 1 ? `${products.length} PRODUCTS — CLICK ONE TO SELECT` : "PRODUCT"}
                                  </span>
                                  <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
                                    {products.map((p: any) => {
                                      const isSelected = selectedProduct?._id === p._id
                                      return (
                                        <div
                                          key={p._id}
                                          onClick={e => { e.stopPropagation(); setSelectedProduct(p) }}
                                          style={{
                                            background: "#0a0f14",
                                            border: `1px solid ${isSelected ? "#22d3ee" : "#1e2d3d"}`,
                                            borderRadius: 8,
                                            padding: "10px 14px",
                                            cursor: "pointer",
                                            minWidth: 160,
                                            transition: "border-color 0.15s",
                                          }}
                                          onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.borderColor = "#22d3ee60" }}
                                          onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.borderColor = "#1e2d3d" }}
                                        >
                                          {/* _id always on top in cyan */}
                                          <div style={{ color: "#4a5568", fontSize: 9, letterSpacing: "0.1em", marginBottom: 2 }}>_ID</div>
                                          <div style={{ color: "#22d3ee", fontSize: 11, fontWeight: 700, marginBottom: 6 }}>{p._id}</div>
                                          {/* other fields */}
                                          {Object.entries(p)
                                            .filter(([k]) => k !== "_id" && k !== "__v" && k !== "createdAt" && k !== "updatedAt")
                                            .slice(0, 3)
                                            .map(([key, val]) => (
                                              <div key={key} style={{ display: "flex", gap: 6, marginBottom: 2 }}>
                                                <span style={{ color: "#4a5568", fontSize: 10, minWidth: 50 }}>{key}</span>
                                                <span style={{ color: "#e2e8f0", fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 120 }}>
                                                  {String(val)}
                                                </span>
                                              </div>
                                            ))}
                                          {isSelected && (
                                            <div style={{ marginTop: 6, color: "#22d3ee", fontSize: 9, letterSpacing: "0.1em" }}>✓ SELECTED</div>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>

                                {/* Step 2 — action buttons, only show after a product is selected */}
                                {selectedProduct && (
                                  <div>
                                    <span style={{ color: "#4a5568", fontSize: 10, letterSpacing: "0.12em" }}>
                                      USE <span style={{ color: "#22d3ee" }}>{selectedProduct._id}</span> FOR
                                    </span>
                                    <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                                      {[
                                        { method: "GET",    label: "GET by ID", color: "#22d3ee", desc: `/api/products/${selectedProduct._id}` },
                                        { method: "PUT",    label: "PUT",       color: "#fb923c", desc: `/api/products/update/${selectedProduct._id}` },
                                        { method: "PATCH",  label: "PATCH",     color: "#34d399", desc: `/api/products/update/${selectedProduct._id}` },
                                        { method: "DELETE", label: "DELETE",    color: "#f87171", desc: `/api/products/delete/${selectedProduct._id}` },
                                      ].map(action => (
                                        <button
                                          key={action.method}
                                          onClick={() => handleProductSelect(selectedProduct._id, action.method)}
                                          style={{
                                            background: "#0a0f14",
                                            border: `1px solid ${action.color}40`,
                                            borderRadius: 6,
                                            padding: "8px 14px",
                                            cursor: "pointer",
                                            fontFamily: "inherit",
                                            textAlign: "left",
                                            transition: "border-color 0.15s",
                                          }}
                                          onMouseEnter={e => (e.currentTarget.style.borderColor = action.color)}
                                          onMouseLeave={e => (e.currentTarget.style.borderColor = `${action.color}40`)}
                                        >
                                          <div style={{ color: action.color, fontSize: 11, fontWeight: 700, marginBottom: 3 }}>{action.label}</div>
                                          <div style={{ color: "#4a5568", fontSize: 10 }}>{action.desc}</div>
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: #080c10; }
        ::-webkit-scrollbar-thumb { background: #1e2d3d; border-radius: 2px; }
        select option { background: #0d1117; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: "block", color: "#4a5568", fontSize: 10, letterSpacing: "0.15em", marginBottom: 7,
}

const inputStyle: React.CSSProperties = {
  background: "#0d1117", border: "1px solid #1e2d3d", borderRadius: 6,
  color: "#e2e8f0", padding: "9px 12px", fontSize: 12,
  fontFamily: "'JetBrains Mono', monospace", outline: "none",
}