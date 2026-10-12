# Flowchart Monitoring System

```mermaid
flowchart TD
  Start([Start Monitoring Loop]) --> GetTarget{Ambil Daftar Website}
  GetTarget --> ForEach[Loop per website]
  ForEach --> DNS[Layer 1: DNS resolution]
  DNS -->|OK| TCP[Layer 2: TCP Connect / Port Check]
  DNS -->|Fail| MarkDown_DNS[Mark as DOWN (DNS Fail)]

  TCP -->|OK| HTTP[Layer 3: HTTP Request]
  TCP -->|Fail| MarkDown_TCP[Mark as DOWN (TCP Fail)]

  HTTP -->|200/OK| SSL[Layer 4: SSL/TLS Validation]
  HTTP -->|4xx/5xx| MarkSlowOrError[Evaluate as SLOW/ERROR]

  SSL -->|Valid| AnalyzeResult[Analyze & Classify Status]
  SSL -->|Invalid| MarkDown_SSL[Mark as DOWN (SSL Fail)]

  AnalyzeResult --> Persist[Persist to DB]
  Persist --> Notify{Status Change?}
  Notify -->|Yes| SendAlert[Trigger Alert (Telegram/Email)]
  Notify -->|No| Continue
  SendAlert --> UpdateDashboard[Push via WebSocket]
  Continue --> End([Wait / Next Cycle])
```