// Racing Syllabus Tracker - frontend logic

// USER LOGIN LOGIC
function getLocalUser() {
    return localStorage.getItem("racingUser");
}

function setLocalUser(name) {
    localStorage.setItem("racingUser", name);
}

function askForUsernameIfNeeded() {
    const user = getLocalUser();
    const overlay = document.getElementById("userOverlay");

    if (!user) {
        overlay.style.display = "flex";
    } else {
        overlay.style.display = "none";
        state.selectedPlayer = user;
    }
}


const SUBJECTS = [
    { name: 'Data Structures', units: 5 },
    { name: 'COA', units: 5 },
    { name: 'Digital Electronics', units: 5 },
    { name: 'DSTL', units: 5 },
    { name: 'Technical Communication', units: 5 },
    { name: 'Cyber Security', units: 5 }
];


const TOTAL_UNITS = SUBJECTS.reduce((s, x) => s + x.units, 0); // 30
const API_BASE = '/api'; // same host


let state = { players: {}, selectedPlayer: null };


// Helpers
function countCompleted(units) { return units.filter(Boolean).length }
function playerIdToHtmlSafe(name) { return name.replace(/\s+/g, '_') }


// Build UI
async function init() {
    askForUsernameIfNeeded();
    await loadAll();
    renderTrack();
    renderSidebar();
    renderLeaderboard();
    attachEvents();
    startPolling();
}


// Load progress from server
async function loadAll() {
    try {
        const res = await fetch(`${API_BASE}/progress`);
        const data = await res.json();
        state.players = data;
        // select first if none
        if (!state.selectedPlayer) state.selectedPlayer = Object.keys(data)[0];
    } catch (err) {
        console.error('Failed to load progress', err);
        // initialize minimal local state so UI doesn't break
        const names = ['Prem', 'Friend1', 'Friend2', 'Friend3', 'Friend4', 'Friend5'];
        names.forEach(n => { if (!state.players[n]) state.players[n] = { units: Array(TOTAL_UNITS).fill(false) } });
        if (!state.selectedPlayer) state.selectedPlayer = names[0];
    }
}


function renderTrack() {
    const track = document.getElementById('track');
    track.innerHTML = '';
    const players = Object.keys(state.players);


    players.forEach((name, idx) => {
        const lane = document.createElement('div'); lane.className = 'lane';


        // checkpoints vertical markers
        for (let i = 1; i <= TOTAL_UNITS; i++) {
            const cp = document.createElement('div'); cp.className = 'checkpoint';
            cp.style.left = `${(i / TOTAL_UNITS) * 100}%`;
            lane.appendChild(cp);
        }


        const carWrap = document.createElement('div');
        carWrap.className = 'car';
        carWrap.id = `${playerIdToHtmlSafe(name)}-car`;

        const badge = document.createElement('img');
        badge.src = 'car.png';
        badge.className = 'car-icon';
        // badge.textContent = name.split(' ')[0].slice(0, 2).toUpperCase();

        const label = document.createElement('div');
        label.className = 'label';
        label.textContent = `${name} — ${countCompleted(state.players[name].units)}/${TOTAL_UNITS}`;
        carWrap.appendChild(badge);
        carWrap.appendChild(label);
        lane.appendChild(carWrap);


        track.appendChild(lane);
    });


    updateCarsPosition();
}

function updateCarsPosition() {
    Object.keys(state.players).forEach(name => {
        const id = `${playerIdToHtmlSafe(name)}-car`;
        const el = document.getElementById(id);
        if (!el) return;
        const completed = countCompleted(state.players[name].units);
        const pct = (completed / TOTAL_UNITS) * 100;
        // ensure cars don't overflow
        el.style.left = `calc(${pct}% - 20px)`;
        // update label
        const lbl = el.querySelector('.label');
        if (lbl) lbl.textContent = `${name} — ${completed}/${TOTAL_UNITS}`;
    });
}

function renderSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.innerHTML = '';
    const player = state.selectedPlayer;
    const playerData = state.players[player];


    const title = document.createElement('h2'); title.textContent = player; sidebar.appendChild(title);


    let idx = 0;
    SUBJECTS.forEach(sub => {
        const sdiv = document.createElement('div'); sdiv.className = 'subject';
        const h = document.createElement('h3'); h.textContent = sub.name; sdiv.appendChild(h);


        for (let u = 1; u <= sub.units; u++) {
            const unitDiv = document.createElement('div'); unitDiv.className = 'unit';
            const cb = document.createElement('input'); cb.type = 'checkbox'; cb.dataset.index = idx; cb.checked = !!playerData.units[idx];
            cb.addEventListener('change', async (e) => {
                const i = Number(e.target.dataset.index);
                const val = e.target.checked;
                // optimistic UI
                state.players[player].units[i] = val;
                updateCarsPosition();
                renderLeaderboard();
                // send update
                try {
                    await fetch(`${API_BASE}/toggle-unit`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ player, index: i, value: val })
                    });
                } catch (err) { console.error('update failed', err) }
            });


            const label = document.createElement('label'); label.textContent = `Unit ${u}`;
            unitDiv.appendChild(cb); unitDiv.appendChild(label);
            sdiv.appendChild(unitDiv);
            idx++;
        }


        sidebar.appendChild(sdiv);
    });


    const resetNote = document.createElement('div'); resetNote.className = 'reset-note'; resetNote.textContent = 'Tip: only update units you completed. Changes are shared with everyone.';
    sidebar.appendChild(resetNote);
}

function renderLeaderboard() {
    const lb = document.getElementById('leaderboard');
    const rows = Object.keys(state.players).map(name => ({ name, completed: countCompleted(state.players[name].units) }));
    rows.sort((a, b) => b.completed - a.completed);
    lb.innerHTML = '<strong>Leaderboard</strong>';
    rows.forEach(r => {
        const div = document.createElement('div'); div.style.display = 'flex'; div.style.justifyContent = 'space-between'; div.style.padding = '6px 0';
        div.innerHTML = `<span>${r.name}</span><span>${r.completed}/${TOTAL_UNITS}</span>`;
        lb.appendChild(div);
    });
}

function attachEvents() {
    document.getElementById('resetBtn').addEventListener('click', async () => {
        const player = state.selectedPlayer;
        if (!confirm(`Reset progress for ${player}? This cannot be undone via UI.`)) return;
        state.players[player].units = Array(TOTAL_UNITS).fill(false);
        updateCarsPosition(); renderSidebar(); renderLeaderboard();
        try {
            await fetch(`${API_BASE}/update-player`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ player, units: state.players[player].units }) });
        } catch (err) { console.error('reset failed', err) }
    });
}

// Poll server to get others' updates
let pollTimer = null;
function startPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(async () => {
        try {
            const res = await fetch(`${API_BASE}/progress`);
            const data = await res.json();
            state.players = data;
            // if selected player was removed, pick first
            if (!state.players[state.selectedPlayer]) state.selectedPlayer = Object.keys(state.players)[0];
            renderTrack();
            renderSidebar();
            renderLeaderboard();
        } catch (err) { console.error('poll fail', err) }
    }, 2500);
}

document.getElementById("saveUsernameBtn").addEventListener("click", async () => {
    const name = document.getElementById("usernameInput").value.trim();

    if (!name) {
        alert("Please enter a name.");
        return;
    }

    // Save locally
    setLocalUser(name);
    state.selectedPlayer = name;

    // Ask server to create user if not exists
    try {
        const res = await fetch('/api/create-user', {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ player: name })
        });

        const result = await res.json();

        // Load updated data
        await loadAll();

        // Update UI
        document.getElementById("userOverlay").style.display = "none";
        renderSidebar();
        updateCarsPosition();
        renderLeaderboard();

    } catch (err) {
        console.error("Failed creating user:", err);
    }
    finally{
        location.reload(true);
    }
});




init();