# NYC Subway Status

A minimal responsive website that reads official MTA subway GTFS-Realtime feeds and displays service alerts and trip updates.

## Requirements

- Node.js 20 or newer
- Internet connection

## Run locally

```bash
npm install
npm start
```

Open http://localhost:3000

The server fetches the MTA's public real-time feeds. It caches successful responses briefly and refreshes the dashboard about every 30 seconds. The first load requires internet access.

## Push to GitHub

Create an empty repository on GitHub, then run these commands from this project folder:

```bash
git init
git add .
git commit -m "Build MTA subway status app"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

Replace the example GitHub URL with your repository's URL.

## Deploy

GitHub stores the source code but does not run a Node server for free as a static GitHub Pages site. Because this project uses a backend to fetch and decode binary feeds, deploy the Node app to a Node-capable host (for example, Render, Railway, or Fly.io) and set its start command to `npm start`. Use the host's assigned port; the server reads `PORT` from the environment.

## API endpoints

- `GET /api/status` — all successfully loaded subway feed groups, decoded trip updates and alerts, plus any feed errors
- `GET /api/health` — basic server health

## Notes and limitations

- MTA GTFS-Realtime feeds are binary Protocol Buffer messages; `gtfs-realtime-bindings` decodes them.
- Trip updates include stop IDs rather than station names in this first version.
- Not every feed includes service alerts; the dashboard shows alerts contained in the loaded feeds and reports feed failures.
- Predicted times and feed availability depend on the MTA. A missing update is not proof that a train is on time.
- This is an independent project, not affiliated with or endorsed by the MTA.

## Official references

- https://www.mta.info/developers
- https://www.mta.info/document/134521
- https://www.mta.info/document/90881
