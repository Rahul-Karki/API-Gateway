import RequestForm from "../components/RequestBuilder/RequestForm"
import RequestLogTable from "../components/RequestTable/RequestLogTable"
import MetricsCards from "../components/Dashboard/MetricsCards"
import { useLoadTester } from "../hooks/useLoadTester"
import { calculateMetrics } from "../utils/metricsParser"

export default function Home() {

  const { logs, sendRequests } = useLoadTester()

  const metrics = calculateMetrics(logs)

  return (

    <div>

      <RequestForm onSend={sendRequests} />

      <MetricsCards metrics={metrics} />

      <RequestLogTable logs={logs} />

    </div>

  )

}