# Wind Nowcast Dashboard 🌪️

A modern, real-time wind monitoring and energy generation dashboard for Melaka State. Built with Next.js, Supabase, and Open-Meteo weather API.

![Wind Nowcast Dashboard](https://via.placeholder.com/1200x600?text=Wind+Nowcast+Dashboard)

## 🎯 Features

### Core Monitoring
- **Real-time Wind Data** — Live wind speed & direction from 3 sensor sites
- **Multi-Site Tracking** — Monitor Melaka City Center, Ayer Keroh, and Jasin simultaneously
- **Professional Dashboard** — Premium glassmorphic UI with cyan/orange accents
- **Live Alerts** — Critical & warning notifications for high winds, low battery, signal issues

### Premium Components
- **Animated Wind Cards** — Rotating compass, smooth gauge animations
- **Interactive Gauges** — Real-time wind speed visualization (0-30 km/h)
- **Rotating Compass** — Cardinal directions (N, NE, E, SE, S, SW, W, NW)
- **Battery & Signal Monitoring** — Progress bars with color-coded health status

### Analytics & Forecasting
- **24-Hour Weather Forecast** — Real wind speed predictions from Open-Meteo API
- **Energy Analytics** — Wind vs Solar generation tracking
- **Forecast Accuracy** — Compare predicted vs actual wind speeds
- **Sensor Health Monitoring** — Automatic health checks and recommendations
- **Daily Reports** — Energy generation summaries and efficiency scores

### Data Management
- **Supabase PostgreSQL** — Reliable real-time data storage
- **Real-time Subscriptions** — Instant updates when new readings arrive
- **Historical Data** — 24h, 7d, 30d trend analysis
- **Responsive Design** — Works on mobile, tablet, desktop

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14, React 18, TypeScript |
| **Styling** | Tailwind CSS, Glassmorphism effects |
| **Charts** | Recharts, Framer Motion (animations) |
| **Database** | Supabase (PostgreSQL) |
| **APIs** | Open-Meteo Weather API |
| **Icons** | Lucide React |
| **Maps** | Leaflet (upcoming) |

---

## 📋 Project Structure

```
wind-dashboard/
├── app/
│   ├── api/              # API routes
│   │   ├── readings/     # Save sensor data
│   │   ├── alerts/       # Alert management
│   │   └── seed/         # Demo data generator
│   ├── components/       # React components
│   │   ├── PremiumWindCard.tsx    # Main site card with gauges
│   │   ├── AlertPanel.tsx         # Alert notifications
│   │   ├── Navbar.tsx             # Navigation
│   │   ├── WeatherForecastWidget/ # Weather forecast
│   │   └── ui/                    # Base components
│   ├── lib/
│   │   ├── supabase.ts   # Supabase client & types
│   │   ├── hooks.ts      # Custom React hooks
│   │   └── design-tokens.ts # Design system
│   ├── page.tsx          # Dashboard (main)
│   ├── history/          # 24h/7d/30d charts
│   ├── accuracy/         # Sensor comparison
│   ├── reports/          # Energy reports
│   ├── layout.tsx        # Root layout
│   └── globals.css       # Global styles
├── public/               # Static assets
├── .env.local           # Environment variables (local only)
├── .env.production      # Production env vars
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── next.config.js
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account (free tier)

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/wind-dashboard.git
cd wind-dashboard
npm install
```

### 2. Setup Supabase

1. Create free account: https://supabase.com
2. Create new project
3. Run SQL to create tables (see `docs/DATABASE.md`)
4. Get your **Project URL** and **Anon Key**

### 3. Configure Environment

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
```

### 4. Load Demo Data

```bash
npm run dev
```

Visit: `http://localhost:3000/api/seed`

### 5. View Dashboard

Open: `http://localhost:3000`

---

## 📊 Dashboard Pages

### Dashboard (Main)
Live view of all 3 wind monitoring sites with real-time data.

**Components:**
- Alert panel (Critical + Warnings)
- 3 Premium Wind Cards (Melaka City, Ayer Keroh, Jasin)
- Weather forecast widget
- Energy analytics
- Sensor health monitor

### History
Historical wind speed data with interactive charts.

**Features:**
- Site selector
- Time range toggle (6h, 24h, 7d)
- LineChart showing trends
- Min/max/avg statistics

### Accuracy
Compare low-cost sensors vs reference sensor.

**Metrics:**
- MAE (Mean Absolute Error)
- RMSE (Root Mean Square Error)
- Bias
- Correlation coefficient
- Accuracy trending

### Reports
Daily/weekly/monthly summaries and exports.

**Available:**
- Energy generation reports
- Efficiency scores
- CSV/PDF export
- Custom date ranges

---

## 🔧 API Endpoints

### Readings
```bash
# Get latest readings (all sites)
GET /api/latest

# Save new reading from ESP32
POST /api/readings
Body: {
  site_id: "site_melaka_01",
  wind_speed_kmh: 12.5,
  wind_direction_deg: 270,
  signal_strength: -65,
  battery_voltage: 4.2
}

# Get historical readings
GET /api/readings/site_melaka_01?hours=24
```

### Alerts
```bash
# Get active alerts
GET /api/alerts

# Create alert (internal)
POST /api/alerts

# Resolve alert
POST /api/alerts/[alert_id]/resolve
```

### Demo
```bash
# Generate sample data
GET /api/seed
```

---

## 📡 Hardware Integration (ESP32)

When you have your wind sensor connected to ESP32:

```cpp
#include <WiFi.h>
#include <HTTPClient.h>

void loop() {
  // Read sensors
  float windSpeed = readAnemometer();
  int windDir = readWindVane();
  
  // Send to dashboard
  HTTPClient http;
  http.begin("http://YOUR_IP:3000/api/readings");
  http.addHeader("Content-Type", "application/json");
  
  String payload = "{\"site_id\":\"site_melaka_01\",\"wind_speed_kmh\":" + 
                   String(windSpeed) + ",\"wind_direction_deg\":" + 
                   String(windDir) + "}";
  
  http.POST(payload);
  http.end();
  
  delay(5000); // Send every 5 seconds
}
```

Full ESP32 code: See `docs/ESP32_SETUP.md`

---

## 🎨 Design System

### Colors
- **Primary (Cyan):** `#00d4ff` — Wind/Energy
- **Secondary (Orange):** `#ff6b35` — Solar/Heat
- **Accent (Purple):** `#a855f7` — Alerts
- **Background:** `#0a0e27` — Deep Navy
- **Card:** `#1a2847` — Navy Blue

### Typography
- **Display:** Space Mono (numbers)
- **Body:** Inter (text)
- **Headings:** Inter Bold

### Components
- **GlassmorphicCard** — Frosted glass effect with backdrop blur
- **PremiumWindCard** — Site card with gauges & compass
- **AnimatedGauge** — Smooth animated wind speed gauge
- **WindCompass** — Rotating compass rose

---

## 📈 Open-Meteo Weather API

Free weather forecast API integration.

**Endpoint:**
```
https://api.open-meteo.com/v1/forecast?
  latitude=2.1926&
  longitude=102.2381&
  hourly=wind_speed_10m,wind_direction_10m,cloud_cover,precipitation&
  timezone=Asia/Kuala_Lumpur&
  forecast_days=7
```

**Data Points:**
- Hourly wind speed (10m height)
- Wind direction
- Cloud cover %
- Precipitation forecast

No API key required! ✓

---

## 🗄️ Database Schema

### Sites Table
```sql
- id (PK)
- site_id (unique)
- site_name
- latitude, longitude
- sensor_type (professional/lowcost)
- is_reference (boolean)
```

### Readings Table
```sql
- id (PK)
- site_id (FK)
- timestamp
- wind_speed_kmh
- wind_direction_deg
- signal_strength (dBm)
- battery_voltage
- temperature, humidity
```

### Alerts Table
```sql
- id (PK)
- site_id (FK)
- alert_type (HIGH_WIND, LOW_BATTERY, etc)
- severity (WARNING, CRITICAL)
- message
- created_at, resolved_at
```

### Daily Summary Table
```sql
- id (PK)
- site_id (FK)
- date
- avg_wind_speed, max_wind_speed, min_wind_speed
- total_energy_wh
- efficiency_percent
```

---

## 🚢 Deployment

### Deploy to Vercel (Recommended)

```bash
npm install -g vercel
vercel
```

Follow the prompts. Vercel will:
- Auto-detect Next.js
- Build & deploy
- Set environment variables

### Environment Variables (Production)

Add to Vercel project settings:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### Self-Hosted (Docker)

```bash
npm run build
npm start
```

Or use Docker:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build
CMD npm start
```

---

## 📚 Documentation

- [Database Setup](docs/DATABASE.md) — SQL schema & Supabase config
- [ESP32 Hardware](docs/ESP32_SETUP.md) — Sensor integration guide
- [API Reference](docs/API.md) — Complete endpoint documentation
- [Architecture](docs/ARCHITECTURE.md) — System design & data flow
- [Troubleshooting](docs/TROUBLESHOOTING.md) — Common issues & fixes

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📝 License

This project is licensed under the MIT License — see `LICENSE` file for details.

---

## 🔗 Links

- **Live Demo:** https://wind-nowcast.vercel.app (when deployed)
- **Supabase:** https://supabase.com
- **Open-Meteo:** https://open-meteo.com
- **Next.js Docs:** https://nextjs.org/docs
- **Tailwind CSS:** https://tailwindcss.com

---

## 📞 Support

Have questions or issues?

1. Check [Troubleshooting](docs/TROUBLESHOOTING.md)
2. Search [GitHub Issues](https://github.com/YOUR_USERNAME/wind-dashboard/issues)
3. Create new issue with details

---

## 🎉 Acknowledgments

- Built with [Next.js](https://nextjs.org)
- Data from [Supabase](https://supabase.com)
- Weather data from [Open-Meteo](https://open-meteo.com)
- UI inspired by modern fintech dashboards
- Icons from [Lucide React](https://lucide.dev)

---

## 📈 Project Status

**Current Version:** 1.0.0 (MVP)

**Completed:**
- ✅ Real-time dashboard
- ✅ Multi-site monitoring
- ✅ Premium UI design
- ✅ Supabase integration
- ✅ Alert system
- ✅ Historical charts

**In Progress:**
- 🔄 Weather forecast widget
- 🔄 Interactive map
- 🔄 Energy analytics
- 🔄 Accuracy reports

**Planned:**
- 📅 Mobile app
- 📅 Email/SMS alerts
- 📅 Data export (PDF)
- 📅 Multi-language support
- 📅 Advanced ML predictions

---

**Made with ❤️ for Melaka wind energy monitoring**

Last updated: July 2025