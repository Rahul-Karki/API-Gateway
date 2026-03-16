export default function RequestLogTable({ logs }: any) {

  return (

    <table>

      <thead>
        <tr>
          <th>ID</th>
          <th>Status</th>
          <th>Cache</th>
          <th>Latency</th>
        </tr>
      </thead>

      <tbody>

        {logs.map((log: any) => (

          <tr key={log.id}>
            <td>{log.id}</td>
            <td>{log.status}</td>
            <td>{log.cache}</td>
            <td>{log.latency.toFixed(2)} ms</td>
          </tr>

        ))}

      </tbody>

    </table>

  )

}