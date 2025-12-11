import express from 'express';
import cors from 'cors';
import fs from 'fs-extra';
import path from 'path';


const __dirname = path.resolve();
const app = express();
const PORT = process.env.PORT || 5000;
const DATA_FILE = path.join(__dirname, 'progress.json');


app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));


// Helper: read progress
async function readProgress() {
    try {
        const exists = await fs.pathExists(DATA_FILE);
        if (!exists) {
            // initialize minimal structure if missing
            const players = ['Prem', 'Friend1', 'Friend2', 'Friend3', 'Friend4', 'Friend5'];
            const init = {};
            players.forEach(p => { init[p] = { units: Array(30).fill(false) }; });
            await fs.writeJson(DATA_FILE, init, { spaces: 2 });
            return init;
        }
        return await fs.readJson(DATA_FILE);
    } catch (err) {
        console.error('Error reading progress:', err);
        throw err;
    }
}


// Helper: write progress
async function writeProgress(data) {
    await fs.writeJson(DATA_FILE, data, { spaces: 2 });
}


// GET all progress
app.get('/api/progress', async (req, res) => {
    try {
        const data = await readProgress();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Failed to read progress' });
    }
});

// Update a single player's units array (replace array)
app.post('/api/update-player', async (req, res) => {
    try {
        const { player, units } = req.body;
        if (!player || !Array.isArray(units) || units.length !== 30) {
            return res.status(400).json({ error: 'Invalid payload' });
        }


        const data = await readProgress();
        if (!data[player]) return res.status(404).json({ error: 'Player not found' });


        data[player].units = units.map(Boolean);
        await writeProgress(data);


        res.json({ success: true, player, unitsCompleted: units.filter(Boolean).length });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update player' });
    }
});


// Toggle single unit (convenience endpoint)
app.post('/api/toggle-unit', async (req, res) => {
    try {
        const { player, index, value } = req.body; // value = true/false
        if (!player || typeof index !== 'number' || index < 0 || index > 29) {
            return res.status(400).json({ error: 'Invalid payload' });
        }


        const data = await readProgress();
        if (!data[player]) return res.status(404).json({ error: 'Player not found' });


        data[player].units[index] = Boolean(value);
        await writeProgress(data);


        res.json({ success: true, index, value: data[player].units[index], completed: data[player].units.filter(Boolean).length });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to toggle unit' });
    }
});

app.post('/api/create-user', async (req, res) => {
    try {
        const { player } = req.body;

        if (!player) {
            return res.status(400).json({ error: "Player name required" });
        }

        const data = await readProgress();

        // If user already exists
        if (data[player]) {
            return res.json({ success: true, exists: true, data: data[player] });
        }

        // Create new user
        data[player] = { units: Array(30).fill(false) };

        await writeProgress(data);

        res.json({ success: true, exists: false, data: data[player] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create user" });
    }
});


// fallback to index.html for SPA-like behavior
app.get((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});