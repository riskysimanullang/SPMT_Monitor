# Dashboard Layout (Simplified)

Deskripsi: layout dashboard utama yang sesuai implementasi pada `src/pages/DashboardPage.jsx`.

```mermaid
flowchart TB
  subgraph Dashboard
    A[TopBar - auth, notifications] --> B[Summary Panel\n(Online / Critical / Offline / SLA / Avg RT)]
    B --> C[Network Topology Visual (left)]
    B --> D[Live Nodes Feed / Status Panel (right)]
    D --> E[Metric Detail Modal (on item click)]
    C --> F[Click node opens ServiceDetailModal]
  end

  style A fill:#f3f4f6,stroke:#c7d2fe
  style B fill:#ffffff,stroke:#e5e7eb
  style C fill:#ffffff,stroke:#e5e7eb
  style D fill:#ffffff,stroke:#e5e7eb
```

Instruksi: gunakan `NetworkTopology.jsx`, `StatusPanel.jsx`, dan `MetricDetailModal.jsx` untuk menyesuaikan visual masing-masing panel. Jika Anda ingin saya ekspor diagram ini menjadi PNG/SVG, saya dapat mengekspor Mermaid menjadi file gambar.