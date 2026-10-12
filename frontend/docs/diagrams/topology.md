# Network Topology Diagram

```mermaid
flowchart LR
  subgraph MonitoringServer
    MS[Monitoring Engine]\n(Go)
  end

  Internet --- MS
  Internet --- Website1[Website A\n(status: UP)]
  Internet --- Website2[Website B\n(status: SLOW)]
  Internet --- Website3[Website C\n(status: DOWN)]

  MS -->|ICMP/HTTP/TCP/SSL| Website1
  MS -->|ICMP/HTTP/TCP/SSL| Website2
  MS -->|ICMP/HTTP/TCP/SSL| Website3

  MS -->|Writes| DB[(PostgreSQL)]
  MS -->|Publish| AlertSystem[Alert Service]\n(Email/Telegram)
  MS -->|Push| WS[WebSocket Endpoint]
  WS --> FE[Frontend Dashboard]
```