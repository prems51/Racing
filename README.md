

Single-repo Express app that serves a static frontend and a small JSON file `progress.json` for shared progress tracking.


## Run locally


1. `npm install`
2. `node server.js` or `npm run dev` (requires nodemon)
3. Open `http://localhost:5000`


## Deploy


- Push repo to GitHub and connect to Render.com (Web Service). Render will run `npm install` and `npm start`.
- Ensure `progress.json` is writable by the server. If not present, the server will initialize it.


## Notes


- `progress.json` contains per-player `units` arrays of 30 booleans (subjects × units).
- Frontend polls every 2.5 seconds to show updates made by other users.
- You can improve by adding authentication, websockets for real-time updates, or a database.