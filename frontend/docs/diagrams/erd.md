# Entity Relationship Diagram (ERD) - Monitoring DB

```mermaid
erDiagram
  WEBSITES {
    integer id PK
    string name
    string url
    string status
    integer status_code
    integer response_time_ms
    timestamp last_checked
    string ip_address
    boolean ssl_valid
  }

  MONITORING_LOGS {
    integer id PK
    integer website_id FK
    timestamp ts
    string check_type
    string result
    integer response_time_ms
    string details
  }

  INCIDENTS {
    integer id PK
    integer website_id FK
    string severity
    string status
    timestamp opened_at
    timestamp resolved_at
    string root_cause
  }

  NOTIFICATIONS {
    integer id PK
    integer incident_id FK
    timestamp ts
    string channel
    string status
  }

  USERS {
    integer id PK
    string username
    string email
    string role
    boolean active
  }

  WEBSITES ||--o{ MONITORING_LOGS : has
  WEBSITES ||--o{ INCIDENTS : has
  INCIDENTS ||--o{ NOTIFICATIONS : has
  USERS ||--o{ INCIDENTS : assigned_to
```

Catatan: struktur ini disesuaikan dengan tabel yang disebutkan di backend dan diagram lampiran; tambahkan kolom audit (created_at, updated_at) sesuai kebutuhan.