/**
 * EventHub Logic
 * Implements NFA hidden behind a modern UI.
 */

// --- DATABASE SIMULATION ---
// Statuses: 'available' (In Pool), 'sold' (Valid), 'used' (Already Scanned)
const initialData = [
    { code: 'VIP-GALA-001', category: 'VIP', status: 'sold', log: '-' },
    { code: 'VIP-GALA-002', category: 'VIP', status: 'sold', log: '-' },
    { code: 'VIP-GALA-003', category: 'VIP', status: 'used', log: '10:45 AM' },
    { code: 'REG-FEST-055', category: 'Regular', status: 'sold', log: '-' },
    { code: 'REG-FEST-056', category: 'Regular', status: 'available', log: '-' }, // Unsold
    { code: 'REG-FEST-057', category: 'Regular', status: 'available', log: '-' },
    { code: 'EARLY-BIRD-1', category: 'Early', status: 'used', log: '09:30 AM' },
    { code: 'STAFF-ACC-01', category: 'Staff', status: 'sold', log: '-' },
];

// Reactive Data
// Reactive Data
// Reset local storage for demo purposes if empty
if (!localStorage.getItem('eventHubTickets')) {
    localStorage.setItem('eventHubTickets', JSON.stringify(initialData));
}
let tickets = JSON.parse(localStorage.getItem('eventHubTickets'));
let currentFilter = 'all';

// --- NFA ENGINE ---
const NFA = {
    state: 'start', // internal mapping for q0

    // Transitions
    scan: function (inputCode) {
        // Transition: q0 -> q1
        this.updateState('processing');

        // Simulating Processing Time
        setTimeout(() => {
            this.epsilonMove(inputCode);
        }, 1500);
    },

    epsilonMove: function (code) {
        const ticketIndex = tickets.findIndex(t => t.code === code);
        const ticket = tickets[ticketIndex];

        let resultState = 'deny'; // Default q3
        let msg = '';
        let title = 'ACCESS DENIED';

        if (!ticket) {
            // Not in DB
            msg = 'Kode tiket tidak ditemukan dalam sistem.';
        } else {
            // Check based on status
            switch (ticket.status) {
                case 'sold':
                    // q1 -> q2 (Valid)
                    resultState = 'accept';
                    title = 'ACCESS GRANTED';
                    msg = `Selamat datang! Akses tiket ${ticket.category} diterima.`;
                    // Side effect: Mark as used
                    this.markTicketUsed(ticketIndex);
                    break;
                case 'used':
                    // q1 -> q3 (Used)
                    msg = `Tiket ini sudah digunakan pada ${ticket.log}.`;
                    break;
                case 'available':
                    // q1 -> q3 (Unsold)
                    msg = 'Tiket belum diaktifkan/terjual.';
                    break;
            }
        }

        this.updateState(resultState, { title, msg });
    },

    markTicketUsed: function (index) {
        tickets[index].status = 'used';
        tickets[index].log = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        saveData();
        renderTable();
        updateCounts();
    },

    updateState: function (newState, data = null) {
        // Reset Visuals
        document.querySelectorAll('.p-step').forEach(el => el.classList.remove('active'));

        const uiMap = {
            'start': 'step-standby',     // q0
            'processing': 'step-processing', // q1
            'accept': 'step-result',     // q2
            'deny': 'step-result'        // q3
        };

        const activeStepId = uiMap[newState];
        if (activeStepId) document.getElementById(activeStepId).classList.add('active');

        // Handle specific states
        if (newState === 'start') {
            ui.resultCard.classList.add('hidden');
            ui.input.disabled = false;
            ui.btn.disabled = false;
            ui.input.value = '';
            ui.input.focus();
        }
        else if (newState === 'processing') {
            ui.resultCard.classList.add('hidden');
            ui.input.disabled = true;
            ui.btn.disabled = true;
        }
        else if (newState === 'accept' || newState === 'deny') {
            const isSuccess = newState === 'accept';
            showResult(isSuccess, data.title, data.msg);

            // Auto Reset
            setTimeout(() => {
                this.updateState('start');
            }, 4000);
        }
    }
};

// --- UI CONTROLLER ---
const ui = {
    input: document.getElementById('ticketInput'),
    btn: document.getElementById('scanBtn'),
    tableBody: document.getElementById('ticketTableBody'),
    resultCard: document.getElementById('resultCard'),
    resTitle: document.getElementById('resTitle'),
    resDesc: document.getElementById('resDesc'),
    iconBox: document.querySelector('.result-icon-box'),
    search: document.getElementById('dbSearch')
};

function init() {
    renderTable();
    updateCounts();
    ui.btn.addEventListener('click', () => {
        const code = ui.input.value.trim();
        if (!code) return alert('Masukkan kode tiket!');
        NFA.scan(code);
    });

    ui.input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') ui.btn.click();
    });
}

function renderTable() {
    ui.tableBody.innerHTML = '';

    const term = ui.search.value.toLowerCase();

    const filtered = tickets.filter(t => {
        const matchesTerm = t.code.toLowerCase().includes(term);
        const matchesFilter = currentFilter === 'all' || t.status === currentFilter;
        return matchesTerm && matchesFilter;
    });

    if (filtered.length === 0) {
        document.getElementById('emptyState').classList.remove('hidden');
    } else {
        document.getElementById('emptyState').classList.add('hidden');

        filtered.forEach(t => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-family: monospace; font-weight: 700;">${t.code}</td>
                <td><span class="category-tag">${t.category}</span></td>
                <td><span class="status-badge status-${t.status}">${getStatusLabel(t.status)}</span></td>
                <td style="color: var(--text-sec);">${t.log}</td>
            `;
            ui.tableBody.appendChild(tr);
        });
    }
}

function getStatusLabel(status) {
    const map = {
        'sold': 'Siap Pakai',
        'used': 'Terpakai',
        'available': 'Belum Terjual'
    };
    return map[status] || status;
}

function updateCounts() {
    const counts = {
        sold: tickets.filter(t => t.status === 'sold').length,
        used: tickets.filter(t => t.status === 'used').length,
        available: tickets.filter(t => t.status === 'available').length
    };

    document.getElementById('count-sold').textContent = counts.sold;
    document.getElementById('count-used').textContent = counts.used;
    document.getElementById('count-available').textContent = counts.available;
}

function filterTickets(type) {
    currentFilter = type;

    // Update Active Nav
    document.querySelectorAll('.categ-nav li').forEach(li => li.classList.remove('active'));
    // Note: Simple logic to find active based on onclick attribute text would be brittle, 
    // ideally use data-attributes. For now, we trust the click.
    event.currentTarget.classList.add('active');

    renderTable();
}

function searchDatabase() {
    renderTable();
}

function showResult(isSuccess, title, desc) {
    ui.resTitle.textContent = title;
    ui.resDesc.textContent = desc;

    ui.resTitle.className = isSuccess ? 'access-granted' : 'access-denied';

    const icon = isSuccess
        ? `<i data-lucide="party-popper" style="color: var(--success); width: 80px; height: 80px;"></i>`
        : `<i data-lucide="shield-alert" style="color: var(--warning); width: 80px; height: 80px;"></i>`;

    ui.iconBox.innerHTML = icon;
    lucide.createIcons();

    ui.resultCard.classList.remove('hidden');
}

// Global scope for HTML access
window.filterTickets = filterTickets;
window.searchDatabase = searchDatabase;

// Start
// Start
document.addEventListener('DOMContentLoaded', init);
