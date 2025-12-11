import express from "express";
import cors from "cors";
import fs from "fs-extra";
import path from "path";

const __dirname = path.resolve();
const app = express();
const PORT = process.env.PORT || 5000;

// PERSISTENT STORAGE LOCATION ON RENDER
const DATA_FOLDER = process.env.RENDER ? "/data" : path.join(__dirname, "data");
await fs.ensureDir(DATA_FOLDER);
const DATA_FILE = path.join(DATA_FOLDER, "progress.json");


// Middleware
app.use(cors());
app.use(express.json());

// Serve frontend
app.use(express.static(path.join(__dirname, "public")));

/* ============================================================
   Helper: Read progress.json (create if missing)
============================================================ */
async function readProgress() {
    try {
        const exists = await fs.pathExists(DATA_FILE);

        if (!exists) {
            const players = [];   // NO predefined users → created when they login

            const init = {};
            players.forEach(p => {
                init[p] = { units: Array(30).fill(false) };
            });

            await fs.writeJson(DATA_FILE, init, { spaces: 2 });
            return init;
        }

        return await fs.readJson(DATA_FILE);

    } catch (err) {
        console.error("READ ERROR:", err);
        throw err;
    }
}

/* ============================================================
   Helper: Write progress.json
============================================================ */
async function writeProgress(data) {
    await fs.writeJson(DATA_FILE, data, { spaces: 2 });
}

/* ============================================================
   API: Get all progress
============================================================ */
app.get("/api/progress", async (req, res) => {
    try {
        const data = await readProgress();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: "Could not load progress." });
    }
});

/* ============================================================
   API: Create new user if not exists
============================================================ */
app.post("/api/create-user", async (req, res) => {
    try {
        const { player } = req.body;

        if (!player || typeof player !== "string") {
            return res.status(400).json({ error: "Valid player name required." });
        }

        const data = await readProgress();

        // Already exists → simply return
        if (data[player]) {
            return res.json({ success: true, exists: true, data: data[player] });
        }

        // Create new user
        data[player] = { units: Array(30).fill(false) };

        await writeProgress(data);

        res.json({ success: true, exists: false, data: data[player] });

    } catch (err) {
        console.error("CREATE USER ERROR:", err);
        res.status(500).json({ error: "Failed to create user." });
    }
});

/* ============================================================
   API: Toggle single unit
============================================================ */
app.post("/api/toggle-unit", async (req, res) => {
    try {
        const { player, index, value } = req.body;

        if (!player || typeof index !== "number") {
            return res.status(400).json({ error: "Invalid toggle request." });
        }

        const data = await readProgress();

        if (!data[player]) {
            return res.status(404).json({ error: "Player not found." });
        }

        data[player].units[index] = Boolean(value);

        await writeProgress(data);

        res.json({
            success: true,
            index,
            value,
            completed: data[player].units.filter(Boolean).length
        });

    } catch (err) {
        console.error("TOGGLE ERROR:", err);
        res.status(500).json({ error: "Failed to update unit." });
    }
});

/* ============================================================
   API: Reset user completely
============================================================ */
app.post("/api/update-player", async (req, res) => {
    try {
        const { player, units } = req.body;

        if (!player || !Array.isArray(units) || units.length !== 30) {
            return res.status(400).json({ error: "Invalid update payload." });
        }

        const data = await readProgress();

        data[player] = { units: units.map(Boolean) };

        await writeProgress(data);

        res.json({ success: true });

    } catch (err) {
        console.error("UPDATE PLAYER ERROR:", err);
        res.status(500).json({ error: "Failed updating player." });
    }
});

/* ============================================================
   FALLBACK: Always serve index.html (SPA behavior)
============================================================ */
app.use((req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* ============================================================
   START SERVER
============================================================ */
app.listen(PORT, () => {
    console.log("Server running on port", PORT);
});
