// ============================================================
// POLLA MUNDIALERA 2026 - Supabase Edition
// ============================================================

(function() {
    'use strict';

    // ---- Supabase Client ----
    const sb = window.supabase.createClient(
        SUPABASE_CONFIG.url,
        SUPABASE_CONFIG.publishableKey,
        { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' } }
    );

    // ---- State ----
    let currentUser = null;   // { id, email, displayName, isAdmin }
    let allProfiles = {};     // { user_id: { display_name, email, is_admin } }
    let allPredictions = {};  // { user_id: { scores } }
    let realResults = {};     // { match_id: { home, away } }
    let reservations = {};    // { reservation_id: { id, user_id, match_id, guests, notes, ... } }
    let currentReservationMatchId = null;

    // ---- Daily capacity for Kadima Center ----
    const DAILY_CAPACITY = 80;

    // ---- Helpers for reservations ----
    function getMatchDateKey(match) {
        // Returns YYYY-MM-DD (in local time of match for grouping by "day")
        return new Date(match.date).toISOString().slice(0, 10);
    }
    function getReservationsForMatch(matchId) {
        return Object.values(reservations).filter(r => r.match_id === matchId);
    }
    function getMyReservationForMatch(matchId) {
        if (!currentUser) return null;
        return Object.values(reservations).find(r => r.match_id === matchId && r.user_id === currentUser.id);
    }
    function getCuposTakenForDate(dateKey) {
        const matchIdsOnDate = new Set(MATCHES.filter(m => getMatchDateKey(m) === dateKey).map(m => m.id));
        let total = 0;
        Object.values(reservations).forEach(r => {
            if (matchIdsOnDate.has(r.match_id)) total += (r.guests || []).length;
        });
        return total;
    }
    function getCuposRemainingForDate(dateKey) {
        return Math.max(0, DAILY_CAPACITY - getCuposTakenForDate(dateKey));
    }
    let currentEditId = null;
    let saveTimeout = null;
    let pendingEmail = null;
    let pendingDisplayName = null;

    // ============================================================
    // HELPERS
    // ============================================================
    function isMatchLocked(match) { return new Date() >= new Date(match.date); }

    function formatDate(d) {
        return new Date(d).toLocaleDateString('es-CL', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false
        });
    }
    function formatDateShort(d) {
        return new Date(d).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
    }
    function timeUntilMatch(dateStr) {
        const diff = new Date(dateStr) - new Date();
        if (diff <= 0) return null;
        const days = Math.floor(diff / 86400000);
        const hours = Math.floor((diff % 86400000) / 3600000);
        if (days > 0) return `${days}d ${hours}h`;
        const mins = Math.floor((diff % 3600000) / 60000);
        return `${hours}h ${mins}m`;
    }
    function escapeHtml(str) {
        const d = document.createElement('div');
        d.textContent = str || '';
        return d.innerHTML;
    }
    function show(id) { document.getElementById(id).classList.remove('hidden'); }
    function hide(id) { document.getElementById(id).classList.add('hidden'); }
    function showBusy(btn, busy) {
        const label = btn.querySelector('.btn-label');
        const loading = btn.querySelector('.btn-loading');
        if (label && loading) {
            label.classList.toggle('hidden', busy);
            loading.classList.toggle('hidden', !busy);
        }
        btn.disabled = busy;
    }

    // ============================================================
    // CUSTOM CONFIRM MODAL
    // ============================================================
    let confirmResolve = null;
    function showConfirm(title, message) {
        return new Promise(resolve => {
            confirmResolve = resolve;
            document.getElementById('confirm-title').textContent = title;
            document.getElementById('confirm-message').textContent = message;
            show('confirm-modal');
        });
    }
    function setupConfirmModal() {
        const modal = document.getElementById('confirm-modal');
        const close = (result) => {
            hide('confirm-modal');
            if (confirmResolve) { confirmResolve(result); confirmResolve = null; }
        };
        document.getElementById('confirm-cancel').addEventListener('click', () => close(false));
        modal.querySelector('.modal-overlay').addEventListener('click', () => close(false));
        document.getElementById('confirm-ok').addEventListener('click', () => close(true));
    }

    // ============================================================
    // AUTH FLOW (email + password via Supabase)
    // ============================================================
    let authMode = 'login'; // 'login' or 'register'

    function setupAuthUI() {
        // Tab switching
        document.querySelectorAll('.login-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                authMode = tab.dataset.mode;
                document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById('mode-login-content').classList.toggle('hidden', authMode !== 'login');
                document.getElementById('mode-register-content').classList.toggle('hidden', authMode !== 'register');
                document.querySelector('#btn-auth-submit .btn-label').textContent =
                    authMode === 'login' ? 'Iniciar Sesi\u00f3n' : 'Crear Cuenta';
                clearError('login-error');
                setTimeout(() => {
                    if (authMode === 'login') document.getElementById('login-email').focus();
                    else document.getElementById('register-name').focus();
                }, 50);
            });
        });

        // Main submit (login or register)
        document.getElementById('btn-auth-submit').addEventListener('click', handleAuthSubmit);

        // Forgot password flow
        document.getElementById('btn-forgot-password').addEventListener('click', (e) => {
            e.preventDefault();
            showForgotStep();
        });
        document.getElementById('btn-send-reset').addEventListener('click', handleSendReset);
        document.getElementById('btn-back-to-login').addEventListener('click', showMainStep);

        // New password (after reset link)
        document.getElementById('btn-save-newpass').addEventListener('click', handleSaveNewPassword);

        // Post-register confirmation
        document.getElementById('btn-confirm-back').addEventListener('click', showMainStep);

        // Logout
        document.getElementById('btn-logout').addEventListener('click', handleLogout);

        // Enter key support
        ['login-email', 'login-password'].forEach(id => {
            document.getElementById(id).addEventListener('keydown', (e) => {
                if (e.key === 'Enter') handleAuthSubmit();
            });
        });
        ['register-name', 'register-email', 'register-password'].forEach(id => {
            document.getElementById(id).addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    if (id === 'register-password') handleAuthSubmit();
                    else {
                        const next = id === 'register-name' ? 'register-email' : 'register-password';
                        document.getElementById(next).focus();
                    }
                }
            });
        });
        document.getElementById('forgot-email').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleSendReset();
        });
        document.getElementById('new-password').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleSaveNewPassword();
        });
    }

    function showError(id, msg) {
        const el = document.getElementById(id);
        el.textContent = msg;
        el.classList.remove('hidden');
    }
    function clearError(id) { document.getElementById(id).classList.add('hidden'); }

    async function handleAuthSubmit() {
        const btn = document.getElementById('btn-auth-submit');
        clearError('login-error');

        if (authMode === 'login') {
            const emailEl = document.getElementById('login-email');
            const passEl = document.getElementById('login-password');
            const email = emailEl.value.trim().toLowerCase();
            const password = passEl.value;

            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                showError('login-error', 'Ingresa un email v\u00e1lido');
                emailEl.focus();
                return;
            }
            if (!password) {
                showError('login-error', 'Ingresa tu contrase\u00f1a');
                passEl.focus();
                return;
            }

            showBusy(btn, true);
            try {
                const { data, error } = await sb.auth.signInWithPassword({ email, password });
                if (error) {
                    if (error.message && error.message.toLowerCase().includes('email not confirmed')) {
                        showError('login-error', 'Tu email a\u00fan no est\u00e1 confirmado. Revisa tu bandeja y haz click en el link que te enviamos.');
                    } else if (error.message && error.message.toLowerCase().includes('invalid login')) {
                        showError('login-error', 'Email o contrase\u00f1a incorrectos.');
                    } else {
                        showError('login-error', error.message || 'Error al iniciar sesi\u00f3n');
                    }
                    return;
                }
                // onAuthStateChange SIGNED_IN will fire
            } catch (err) {
                console.error(err);
                showError('login-error', err.message || 'Error al iniciar sesi\u00f3n');
            } finally {
                showBusy(btn, false);
            }
        } else {
            // REGISTER
            const nameEl = document.getElementById('register-name');
            const emailEl = document.getElementById('register-email');
            const passEl = document.getElementById('register-password');
            const name = nameEl.value.trim();
            const email = emailEl.value.trim().toLowerCase();
            const password = passEl.value;

            if (!name) { showError('login-error', 'Ingresa tu nombre'); nameEl.focus(); return; }
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                showError('login-error', 'Ingresa un email v\u00e1lido'); emailEl.focus(); return;
            }
            if (!password || password.length < 6) {
                showError('login-error', 'La contrase\u00f1a debe tener al menos 6 caracteres');
                passEl.focus();
                return;
            }

            showBusy(btn, true);
            try {
                const { data, error } = await sb.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: window.location.origin + window.location.pathname,
                        data: { display_name: name }
                    }
                });
                if (error) {
                    if (error.message && error.message.toLowerCase().includes('already registered')) {
                        showError('login-error', 'Ya existe una cuenta con este email. Usa "Iniciar Sesi\u00f3n".');
                    } else {
                        showError('login-error', error.message || 'Error al crear cuenta');
                    }
                    return;
                }

                // If session is returned, email confirmation is disabled in Supabase - user is logged in directly
                if (data.session) {
                    // onAuthStateChange SIGNED_IN will fire
                    return;
                }

                // Otherwise, show confirmation message
                document.getElementById('confirm-email-display').textContent = email;
                showConfirmStep();
            } catch (err) {
                console.error(err);
                showError('login-error', err.message || 'Error al crear cuenta');
            } finally {
                showBusy(btn, false);
            }
        }
    }

    async function handleSendReset() {
        const btn = document.getElementById('btn-send-reset');
        const emailEl = document.getElementById('forgot-email');
        const msgEl = document.getElementById('forgot-message');
        clearError('forgot-error');
        msgEl.classList.add('hidden');

        const email = emailEl.value.trim().toLowerCase();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showError('forgot-error', 'Ingresa un email v\u00e1lido');
            emailEl.focus();
            return;
        }

        showBusy(btn, true);
        try {
            const { error } = await sb.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + window.location.pathname
            });
            if (error) throw error;

            msgEl.textContent = 'Listo. Te enviamos un email con un link para restablecer tu contrase\u00f1a.';
            msgEl.classList.remove('hidden');
        } catch (err) {
            console.error(err);
            showError('forgot-error', err.message || 'Error enviando el email');
        } finally {
            showBusy(btn, false);
        }
    }

    async function handleSaveNewPassword() {
        const btn = document.getElementById('btn-save-newpass');
        const passEl = document.getElementById('new-password');
        clearError('newpass-error');

        const password = passEl.value;
        if (!password || password.length < 6) {
            showError('newpass-error', 'La contrase\u00f1a debe tener al menos 6 caracteres');
            passEl.focus();
            return;
        }

        showBusy(btn, true);
        try {
            const { error } = await sb.auth.updateUser({ password });
            if (error) throw error;
            // User should now be logged in - onAuthStateChange will handle entry
            // But if we're in recovery mode, we need to explicitly enter
            await onAuthSuccess();
        } catch (err) {
            console.error(err);
            showError('newpass-error', err.message || 'Error guardando la contrase\u00f1a');
        } finally {
            showBusy(btn, false);
        }
    }

    async function handleLogout() {
        await sb.auth.signOut();
        currentUser = null;
        allProfiles = {};
        allPredictions = {};
        realResults = {};
        hide('app');
        show('login-screen');
        ['login-email', 'login-password', 'register-email', 'register-name', 'register-password', 'forgot-email', 'new-password'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        showMainStep();
        // Reset nav
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.nav-btn[data-view="predictions"]').classList.add('active');
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById('view-predictions').classList.add('active');
    }

    function hideAllAuthSteps() {
        ['login-step-main', 'login-step-forgot', 'login-step-newpass', 'login-step-confirm'].forEach(hide);
    }
    function showMainStep() {
        hideAllAuthSteps();
        show('login-step-main');
        clearError('login-error');
        setTimeout(() => document.getElementById('login-email').focus(), 50);
    }
    function showForgotStep() {
        hideAllAuthSteps();
        show('login-step-forgot');
        clearError('forgot-error');
        document.getElementById('forgot-message').classList.add('hidden');
        // Prefill email if already typed in login
        const loginEmail = document.getElementById('login-email').value.trim();
        if (loginEmail) document.getElementById('forgot-email').value = loginEmail;
        setTimeout(() => document.getElementById('forgot-email').focus(), 50);
    }
    function showNewPasswordStep() {
        hideAllAuthSteps();
        show('login-step-newpass');
        clearError('newpass-error');
        setTimeout(() => document.getElementById('new-password').focus(), 50);
    }
    function showConfirmStep() {
        hideAllAuthSteps();
        show('login-step-confirm');
    }

    // Backwards compat
    function showEmailStep() { showMainStep(); }

    // ============================================================
    // PROFILE ENSURE
    // ============================================================
    async function ensureProfileName(userId, displayName) {
        // Update profile display_name if it was created from email prefix default
        try {
            const { data } = await sb.from('profiles').select('display_name, email').eq('id', userId).single();
            if (data && data.display_name === data.email.split('@')[0]) {
                await sb.from('profiles').update({ display_name: displayName }).eq('id', userId);
            }
        } catch (e) { console.warn('ensureProfileName:', e); }
    }

    async function ensurePredictionRow(userId) {
        const { data } = await sb.from('predictions').select('user_id').eq('user_id', userId).maybeSingle();
        if (!data) {
            await sb.from('predictions').insert({ user_id: userId, scores: {} });
        }
    }

    // ============================================================
    // AUTH SUCCESS: LOAD DATA + ENTER APP
    // ============================================================
    async function onAuthSuccess() {
        const { data: { user } } = await sb.auth.getUser();
        if (!user) return;

        await ensurePredictionRow(user.id);

        // Load profile
        const { data: profile } = await sb.from('profiles').select('*').eq('id', user.id).single();

        currentUser = {
            id: user.id,
            email: user.email,
            displayName: profile?.display_name || user.email.split('@')[0],
            isAdmin: profile?.is_admin === true
        };

        await loadAllData();
        enterApp();
    }

    async function loadAllData() {
        // Load profiles
        const { data: profiles } = await sb.from('profiles').select('*');
        allProfiles = {};
        (profiles || []).forEach(p => { allProfiles[p.id] = p; });

        // Load predictions
        const { data: preds } = await sb.from('predictions').select('*');
        allPredictions = {};
        (preds || []).forEach(p => { allPredictions[p.user_id] = { scores: p.scores || {} }; });

        // Load real results
        const { data: results } = await sb.from('real_results').select('*');
        realResults = {};
        (results || []).forEach(r => { realResults[r.match_id] = { home: r.home, away: r.away }; });

        // Load reservations (might not exist yet if SQL not run)
        try {
            const { data: res, error: resErr } = await sb.from('reservations').select('*');
            reservations = {};
            if (!resErr && res) res.forEach(r => { reservations[r.id] = r; });
        } catch (e) {
            console.warn('Reservations table not found, skipping:', e);
            reservations = {};
        }
    }

    function enterApp() {
        hide('login-screen');
        show('app');

        const badge = currentUser.isAdmin
            ? '&#128272; Admin (' + escapeHtml(currentUser.email) + ')'
            : '&#10017; ' + escapeHtml(currentUser.displayName);
        document.getElementById('user-display').innerHTML = badge;

        document.querySelectorAll('.nav-admin-only').forEach(el => {
            el.classList.toggle('hidden', !currentUser.isAdmin);
        });

        document.getElementById('predictions-title').textContent =
            currentUser.isAdmin ? 'Todos los Pron\u00f3sticos' : 'Mi Pron\u00f3stico';

        // Show hub by default (user picks: polla or espacio)
        showHub();

        renderPredictionsList();
        updatePredictionSelectors();
    }

    // ============================================================
    // HUB NAVIGATION (Polla vs Espacio)
    // ============================================================
    function showHub() {
        hide('polla-app');
        hide('espacio-app');
        show('hub-screen');
    }

    function enterPolla() {
        hide('hub-screen');
        hide('espacio-app');
        show('polla-app');
        // Reset to predictions view
        document.querySelectorAll('#polla-app .nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('#polla-app .nav-btn[data-view="predictions"]').classList.add('active');
        document.querySelectorAll('#polla-app .view').forEach(v => v.classList.remove('active'));
        document.getElementById('view-predictions').classList.add('active');
        renderPredictionsList();
    }

    function enterEspacio() {
        hide('hub-screen');
        hide('polla-app');
        show('espacio-app');
        renderSpaceView();
    }

    function setupHubNav() {
        document.querySelectorAll('.hub-card').forEach(card => {
            card.addEventListener('click', () => {
                const dest = card.dataset.destination;
                if (dest === 'polla') enterPolla();
                else if (dest === 'espacio') enterEspacio();
            });
        });
        document.querySelectorAll('.btn-back-hub').forEach(btn => {
            btn.addEventListener('click', showHub);
        });
    }

    // ============================================================
    // NAVIGATION
    // ============================================================
    function setupNavigation() {
        document.querySelectorAll('#polla-app .nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.dataset.view;
                document.querySelectorAll('#polla-app .nav-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                document.querySelectorAll('#polla-app .view').forEach(v => v.classList.remove('active'));
                const viewEl = document.getElementById(`view-${view}`);
                if (viewEl) viewEl.classList.add('active');

                if (view === 'groups') renderGroupsView();
                if (view === 'knockout') renderKnockoutView();
                if (view === 'leaderboard') renderLeaderboard();
                if (view === 'admin') renderAdminView();
                if (view === 'predictions') renderPredictionsList();
            });
        });
    }

    // ============================================================
    // PREDICTIONS LIST
    // ============================================================
    function renderPredictionsList() {
        const container = document.getElementById('predictions-list');
        if (currentUser.isAdmin) renderAdminPredictionsList(container);
        else renderUserPrediction(container);
    }

    function renderUserPrediction(container) {
        const pred = allPredictions[currentUser.id] || { scores: {} };
        const filled = countFilled(pred);
        const total = MATCHES.length;
        const points = calculateTotalPoints(currentUser.id);

        container.innerHTML = `
            <div class="my-prediction-card fade-in">
                <div class="my-prediction-header">
                    <div class="my-prediction-name">${escapeHtml(currentUser.displayName)}</div>
                    <div class="my-prediction-points">
                        <span class="points-value">${points}</span>
                        <span class="points-label">puntos</span>
                    </div>
                </div>
                <div class="my-prediction-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${Math.round(filled / total * 100)}%"></div>
                    </div>
                    <span class="progress-text">${filled} de ${total} partidos completados</span>
                </div>
                <button class="btn btn-primary btn-full btn-cta-highlight" id="btn-edit-my-prediction">
                    &#9998; Llenar mi Pron\u00f3stico
                </button>
            </div>`;
        container.querySelector('#btn-edit-my-prediction').addEventListener('click', () => {
            openEditPrediction(currentUser.id);
        });
    }

    function renderAdminPredictionsList(container) {
        const ids = Object.keys(allPredictions).filter(id => allProfiles[id]);
        if (ids.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">&#10017;</div>
                    <p>No hay pron\u00f3sticos a\u00fan</p>
                </div>`;
            return;
        }

        container.innerHTML = `<div class="predictions-grid">${ids.map(id => {
            const profile = allProfiles[id];
            const pred = allPredictions[id];
            const filled = countFilled(pred);
            const points = calculateTotalPoints(id);
            return `
                <div class="prediction-card fade-in" data-id="${id}">
                    <div class="prediction-card-name">${escapeHtml(profile.display_name)}</div>
                    <div class="prediction-card-email">${escapeHtml(profile.email)}</div>
                    <div class="prediction-card-stats">
                        <div class="prediction-stat"><strong>${filled}</strong>de ${MATCHES.length}</div>
                        <div class="prediction-stat"><strong>${points}</strong>puntos</div>
                    </div>
                    <div class="prediction-card-actions">
                        <button class="btn btn-secondary btn-sm btn-edit-pred" data-id="${id}">Ver / Editar</button>
                        <button class="btn btn-danger btn-sm btn-delete-pred" data-id="${id}">Eliminar</button>
                    </div>
                </div>`;
        }).join('')}</div>`;

        container.querySelectorAll('.btn-edit-pred').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                openEditPrediction(btn.dataset.id);
            });
        });
        container.querySelectorAll('.btn-delete-pred').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const name = allProfiles[id]?.display_name || 'este participante';
                const ok = await showConfirm('Eliminar Pron\u00f3stico',
                    `\u00bfEliminar el pron\u00f3stico de "${name}"? Los datos se borran de la nube. Esta acci\u00f3n no se puede deshacer.`);
                if (ok) {
                    const { error } = await sb.from('predictions').delete().eq('user_id', id);
                    if (error) { alert('Error: ' + error.message); return; }
                    delete allPredictions[id];
                    renderPredictionsList();
                    updatePredictionSelectors();
                }
            });
        });
        container.querySelectorAll('.prediction-card').forEach(card => {
            card.addEventListener('click', () => openEditPrediction(card.dataset.id));
        });
    }

    function countFilled(pred) {
        if (!pred || !pred.scores) return 0;
        return Object.keys(pred.scores).filter(id => {
            const s = pred.scores[id];
            return s && s.home !== undefined && s.away !== undefined;
        }).length;
    }

    // ============================================================
    // EDIT PREDICTION
    // ============================================================
    function openEditPrediction(userId) {
        currentEditId = userId;
        const profile = allProfiles[userId];
        if (!profile) return;
        document.getElementById('edit-prediction-title').textContent = profile.display_name;
        show('edit-prediction-overlay');
        document.body.style.overflow = 'hidden';
        setupEditNav();
        renderEditMatches('groups');
        updateFilledCount();
    }

    function closeEditPrediction() {
        hide('edit-prediction-overlay');
        document.body.style.overflow = '';
        currentEditId = null;
        renderPredictionsList();
    }

    function setupEditNav() {
        document.querySelectorAll('.edit-nav-btn').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.edit-nav-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderEditMatches(btn.dataset.stage);
            };
        });
    }

    function renderEditMatches(stage) {
        const container = document.getElementById('edit-matches-container');
        const pred = allPredictions[currentEditId] || { scores: {} };
        const canEdit = currentUser.isAdmin || currentUser.id === currentEditId;

        let matches = MATCHES.filter(m => m.stage === stage);

        if (stage === 'groups') {
            const grouped = {};
            matches.forEach(m => {
                if (!grouped[m.group]) grouped[m.group] = [];
                grouped[m.group].push(m);
            });
            container.innerHTML = Object.keys(grouped).sort().map(g => `
                <div class="group-card slide-up" style="margin-bottom: 1.5rem;">
                    <div class="group-card-header">
                        <span>${GROUPS[g].name}</span>
                        <span style="font-size: 0.7rem; font-weight: 300;">${GROUPS[g].teams.map(t => FLAGS[t] || '').join(' ')}</span>
                    </div>
                    <div class="match-list">
                        ${grouped[g].map(m => renderMatchRow(m, pred, canEdit)).join('')}
                    </div>
                </div>`).join('');
        } else {
            const mult = SCORING.multipliers[stage] || 1;
            container.innerHTML = `
                <div class="knockout-stage slide-up">
                    <div class="knockout-stage-header">${STAGE_NAMES[stage]}<span class="multiplier">x${mult}</span></div>
                    <div class="match-list">${matches.map(m => renderMatchRow(m, pred, canEdit)).join('')}</div>
                </div>`;
        }

        container.querySelectorAll('.score-input:not(.locked)').forEach(inp => {
            inp.addEventListener('input', handleScoreInput);
        });
    }

    function renderMatchRow(match, pred, canEdit) {
        const locked = isMatchLocked(match);
        const disabled = locked || !canEdit;
        const score = (pred.scores && pred.scores[match.id]) || {};
        const flag1 = FLAGS[match.team1] || FLAGS['TBD'];
        const flag2 = FLAGS[match.team2] || FLAGS['TBD'];
        const val1 = score.home !== undefined ? score.home : '';
        const val2 = score.away !== undefined ? score.away : '';
        const remaining = timeUntilMatch(match.date);

        return `
            <div class="match-item ${disabled ? 'locked' : ''}">
                <div class="match-team home">
                    <span class="team-name">${getTeamDisplay(match.team1)}</span>
                    <span class="team-flag">${flag1}</span>
                </div>
                <div class="match-center">
                    <div class="match-score-inputs">
                        <input type="number" class="score-input ${disabled ? 'locked' : ''} ${val1 !== '' ? 'has-value' : ''}"
                            min="0" max="20" data-match="${match.id}" data-side="home"
                            value="${val1}" ${disabled ? 'disabled' : ''} placeholder="-">
                        <span class="score-separator">:</span>
                        <input type="number" class="score-input ${disabled ? 'locked' : ''} ${val2 !== '' ? 'has-value' : ''}"
                            min="0" max="20" data-match="${match.id}" data-side="away"
                            value="${val2}" ${disabled ? 'disabled' : ''} placeholder="-">
                    </div>
                    <div class="match-meta">
                        <span class="match-date">${formatDate(match.date)}</span>
                        <span class="match-city">${match.city}</span>
                        ${locked ? '<span class="lock-badge">&#128274; Bloqueado</span>' :
                          !canEdit ? '<span class="lock-badge">&#128065; Solo lectura</span>' :
                          remaining ? `<span style="color: var(--warning); font-size: 0.6rem;">Quedan ${remaining}</span>` : ''}
                    </div>
                </div>
                <div class="match-team away">
                    <span class="team-flag">${flag2}</span>
                    <span class="team-name">${getTeamDisplay(match.team2)}</span>
                </div>
            </div>`;
    }

    function getTeamDisplay(code) {
        if (/^[12][A-L]$/.test(code)) return (code[0] === '1' ? '1ro' : '2do') + ' Grupo ' + code[1];
        if (/^3[A-Z]+$/.test(code)) return '3ro (' + code.slice(1).split('').join('/') + ')';
        if (/^[WL]\d+$/.test(code)) return (code[0] === 'W' ? 'Gan.' : 'Perd.') + ' M' + code.slice(1);
        return code;
    }

    async function handleScoreInput(e) {
        const input = e.target;
        const matchId = parseInt(input.dataset.match);
        const side = input.dataset.side;
        let val = input.value.trim();

        if (val !== '') {
            val = Math.max(0, Math.min(20, parseInt(val) || 0));
            input.value = val;
        }

        const pred = allPredictions[currentEditId] || { scores: {} };
        if (!allPredictions[currentEditId]) allPredictions[currentEditId] = pred;
        if (!pred.scores) pred.scores = {};
        if (!pred.scores[matchId]) pred.scores[matchId] = {};

        if (val === '' || isNaN(parseInt(val))) {
            delete pred.scores[matchId][side];
            if (Object.keys(pred.scores[matchId]).length === 0) delete pred.scores[matchId];
            input.classList.remove('has-value');
        } else {
            pred.scores[matchId][side] = parseInt(val);
            input.classList.add('has-value');
        }

        updateFilledCount();
        scheduleSave();
    }

    function scheduleSave() {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(savePrediction, 500);
    }

    async function savePrediction() {
        const pred = allPredictions[currentEditId];
        if (!pred) return;
        const { error } = await sb.from('predictions')
            .update({ scores: pred.scores })
            .eq('user_id', currentEditId);

        if (error) {
            console.error('Save error:', error);
            return;
        }
        const ind = document.getElementById('save-indicator');
        ind.classList.remove('hidden');
        clearTimeout(ind._timer);
        ind._timer = setTimeout(() => ind.classList.add('hidden'), 1500);
    }

    function updateFilledCount() {
        const pred = allPredictions[currentEditId] || { scores: {} };
        document.getElementById('edit-filled-count').textContent = countFilled(pred);
    }

    // ============================================================
    // GROUPS / KNOCKOUT VIEWS
    // ============================================================
    function renderGroupsView() {
        const container = document.getElementById('groups-container');
        const gf = document.getElementById('group-filter');
        const ps = document.getElementById('prediction-selector-groups');

        if (gf.options.length <= 1) {
            Object.keys(GROUPS).sort().forEach(g => {
                const opt = document.createElement('option');
                opt.value = g; opt.textContent = GROUPS[g].name;
                gf.appendChild(opt);
            });
        }

        const selectedGroup = gf.value;
        const selectedPred = ps.value;
        const pred = selectedPred ? allPredictions[selectedPred] : null;

        let groups = Object.keys(GROUPS).sort();
        if (selectedGroup !== 'all') groups = [selectedGroup];

        container.innerHTML = `<div class="groups-grid">${groups.map(g => {
            const gm = MATCHES.filter(m => m.group === g);
            return `
                <div class="group-card fade-in">
                    <div class="group-card-header">
                        <span>${GROUPS[g].name}</span>
                        <span style="font-size: 0.75rem; font-weight: 300;">${GROUPS[g].teams.map(t => FLAGS[t]).join(' ')}</span>
                    </div>
                    <div class="group-teams">
                        ${GROUPS[g].teams.map(t => `<span class="group-team-tag">${FLAGS[t]} ${t}</span>`).join('')}
                    </div>
                    <div class="match-list">${gm.map(m => renderViewMatchRow(m, pred)).join('')}</div>
                </div>`;
        }).join('')}</div>`;

        gf.onchange = () => renderGroupsView();
        ps.onchange = () => renderGroupsView();
    }

    function renderViewMatchRow(match, pred) {
        const score = pred ? ((pred.scores && pred.scores[match.id]) || {}) : {};
        const real = realResults[match.id] || {};
        const flag1 = FLAGS[match.team1] || FLAGS['TBD'];
        const flag2 = FLAGS[match.team2] || FLAGS['TBD'];
        const hasReal = real.home !== undefined && real.away !== undefined;
        const hasPred = score.home !== undefined && score.away !== undefined;

        let pointsBadge = '';
        if (hasReal && hasPred) {
            const pts = calculateMatchPoints(match, score, real);
            const color = pts >= 5 ? 'var(--gold)' : pts >= 3 ? 'var(--silver)' : pts >= 2 ? 'var(--bronze)' : 'var(--locked)';
            pointsBadge = `<span style="font-size: 0.65rem; color: ${color}; font-weight: 700;">${pts} pts</span>`;
        }

        return `
            <div class="match-item">
                <div class="match-team home">
                    <span class="team-name">${getTeamDisplay(match.team1)}</span>
                    <span class="team-flag">${flag1}</span>
                </div>
                <div class="match-center">
                    <div style="font-family: 'Oswald', sans-serif; font-size: 1.1rem; font-weight: 700;">
                        ${hasReal ? `${real.home} - ${real.away}` : '- : -'}
                    </div>
                    ${pred ? `<div style="font-size: 0.7rem; color: var(--text-muted);">Pred: ${hasPred ? score.home + ' - ' + score.away : '-'}</div>` : ''}
                    ${pointsBadge}
                    <div class="match-meta">
                        <span class="match-date">${formatDateShort(match.date)}</span>
                        <span class="match-city">${match.city}</span>
                    </div>
                </div>
                <div class="match-team away">
                    <span class="team-flag">${flag2}</span>
                    <span class="team-name">${getTeamDisplay(match.team2)}</span>
                </div>
            </div>`;
    }

    function renderKnockoutView() {
        const container = document.getElementById('knockout-container');
        const ps = document.getElementById('prediction-selector-knockout');
        const pred = ps.value ? allPredictions[ps.value] : null;
        const stages = ['r32', 'r16', 'qf', 'sf', 'final'];

        container.innerHTML = stages.map(stage => {
            const sm = MATCHES.filter(m => m.stage === stage);
            const mult = SCORING.multipliers[stage] || 1;
            return `
                <div class="knockout-stage fade-in">
                    <div class="knockout-stage-header">${STAGE_NAMES[stage]}<span class="multiplier">x${mult}</span></div>
                    <div class="knockout-matches">
                        ${sm.map(m => `
                            <div class="knockout-match">
                                <div class="knockout-match-header">
                                    <span>M${m.id} - ${m.label || ''}</span>
                                    <span>${formatDateShort(m.date)} &bull; ${m.city}</span>
                                </div>
                                ${renderViewMatchRow(m, pred)}
                            </div>`).join('')}
                    </div>
                </div>`;
        }).join('');

        ps.onchange = () => renderKnockoutView();
    }

    // ============================================================
    // SCORING
    // ============================================================
    function calculateMatchPoints(match, prediction, real) {
        if (!prediction || !real) return 0;
        if (prediction.home === undefined || prediction.away === undefined) return 0;
        if (real.home === undefined || real.away === undefined) return 0;
        const pH = prediction.home, pA = prediction.away, rH = real.home, rA = real.away;
        let base = 0;
        if (pH === rH && pA === rA) base = SCORING.exact;
        else if (getResult(pH, pA) === getResult(rH, rA) && (pH - pA) === (rH - rA)) base = SCORING.goalDiff;
        else if (getResult(pH, pA) === getResult(rH, rA)) base = SCORING.result;
        return Math.ceil(base * (SCORING.multipliers[match.stage] || 1));
    }
    function getResult(h, a) { return h > a ? 'W' : h < a ? 'L' : 'D'; }
    function calculateTotalPoints(userId) {
        const pred = allPredictions[userId];
        if (!pred || !pred.scores) return 0;
        let total = 0;
        MATCHES.forEach(m => {
            const s = pred.scores[m.id];
            const r = realResults[m.id];
            if (s && r) total += calculateMatchPoints(m, s, r);
        });
        return total;
    }

    // ============================================================
    // LEADERBOARD
    // ============================================================
    function renderLeaderboard() {
        const container = document.getElementById('leaderboard-container');
        const ids = Object.keys(allPredictions).filter(id => allProfiles[id]);
        if (ids.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">&#127941;</div>
                    <p>No hay participantes registrados</p>
                </div>`;
            return;
        }

        const board = ids.map(id => {
            const pred = allPredictions[id];
            const profile = allProfiles[id];
            const points = calculateTotalPoints(id);
            let exact = 0, goalDiff = 0, result = 0;
            MATCHES.forEach(m => {
                const s = pred.scores && pred.scores[m.id];
                const r = realResults[m.id];
                if (s && r && s.home !== undefined && s.away !== undefined && r.home !== undefined && r.away !== undefined) {
                    const pts = calculateMatchPoints(m, s, r);
                    const mult = SCORING.multipliers[m.stage] || 1;
                    const base = mult > 0 ? Math.round(pts / mult) : 0;
                    if (base === 5) exact++;
                    else if (base === 3) goalDiff++;
                    else if (base === 2) result++;
                }
            });
            const isMe = currentUser.id === id;
            return { id, name: profile.display_name, points, exact, goalDiff, result, isMe };
        }).sort((a, b) => b.points - a.points || b.exact - a.exact);

        container.innerHTML = `
            <table class="leaderboard-table">
                <thead>
                    <tr><th>#</th><th>Participante</th><th>Puntos</th><th>Exactos</th><th>Dif. Gol</th><th>Resultado</th></tr>
                </thead>
                <tbody>
                    ${board.map((e, i) => `
                        <tr class="fade-in ${e.isMe ? 'leaderboard-me' : ''}">
                            <td class="leaderboard-rank ${i < 3 ? 'rank-' + (i + 1) : ''}">${i + 1}</td>
                            <td class="leaderboard-name">${escapeHtml(e.name)} ${e.isMe ? '<span class="me-badge">T\u00fa</span>' : ''}</td>
                            <td class="leaderboard-points">${e.points}</td>
                            <td class="leaderboard-detail">${e.exact}</td>
                            <td class="leaderboard-detail">${e.goalDiff}</td>
                            <td class="leaderboard-detail">${e.result}</td>
                        </tr>`).join('')}
                </tbody>
            </table>`;
    }

    // ============================================================
    // PREDICTION SELECTORS
    // ============================================================
    function updatePredictionSelectors() {
        ['prediction-selector-groups', 'prediction-selector-knockout'].forEach(selId => {
            const sel = document.getElementById(selId);
            if (!sel) return;
            const current = sel.value;
            sel.innerHTML = '<option value="">Seleccionar pron\u00f3stico</option>';

            const ids = currentUser.isAdmin
                ? Object.keys(allPredictions).filter(id => allProfiles[id])
                : (allProfiles[currentUser.id] ? [currentUser.id] : []);

            ids.forEach(id => {
                const opt = document.createElement('option');
                opt.value = id;
                opt.textContent = allProfiles[id].display_name + (id === currentUser.id ? ' (yo)' : '');
                sel.appendChild(opt);
            });

            if (!currentUser.isAdmin && ids[0]) sel.value = ids[0];
            else if (allPredictions[current]) sel.value = current;
        });
    }

    // ============================================================
    // SPACE RESERVATIONS
    // ============================================================
    function setupReservationModal() {
        document.getElementById('reservation-modal-close').addEventListener('click', closeReservationModal);
        document.getElementById('btn-close-reservation').addEventListener('click', closeReservationModal);
        document.getElementById('reservation-modal').querySelector('.modal-overlay').addEventListener('click', closeReservationModal);
        document.getElementById('btn-add-guest').addEventListener('click', () => addGuestRow());
        document.getElementById('btn-save-reservation').addEventListener('click', saveReservation);
        document.getElementById('btn-cancel-reservation').addEventListener('click', cancelReservation);
    }

    function renderSpaceView() {
        renderMyReservations();
        renderSpaceMatches();

        const sf = document.getElementById('space-stage-filter');
        const af = document.getElementById('space-availability-filter');
        sf.onchange = () => renderSpaceMatches();
        af.onchange = () => renderSpaceMatches();
    }

    function renderMyReservations() {
        const section = document.getElementById('my-reservations-section');
        const container = document.getElementById('my-reservations-list');
        const myRes = Object.values(reservations)
            .filter(r => r.user_id === currentUser.id)
            .sort((a, b) => {
                const ma = MATCHES.find(m => m.id === a.match_id);
                const mb = MATCHES.find(m => m.id === b.match_id);
                if (!ma || !mb) return 0;
                return new Date(ma.date) - new Date(mb.date);
            });

        if (myRes.length === 0) {
            section.classList.add('hidden');
            return;
        }
        section.classList.remove('hidden');

        container.innerHTML = myRes.map(r => {
            const match = MATCHES.find(m => m.id === r.match_id);
            if (!match) return '';
            const locked = isMatchLocked(match);
            const guestsCount = (r.guests || []).length;
            const isConfirmed = r.is_confirmed;
            const statusBadge = isConfirmed
                ? '<span class="reservation-badge reservation-badge-confirmed">&#10003; Confirmada</span>'
                : '<span class="reservation-badge reservation-badge-pending">&#9203; Pendiente de confirmaci\u00f3n</span>';
            return `
                <div class="my-reservation-row">
                    <div class="my-reservation-info">
                        <div class="my-reservation-title">
                            ${getTeamDisplay(match.team1)} vs ${getTeamDisplay(match.team2)}
                            ${statusBadge}
                        </div>
                        <div class="my-reservation-meta">
                            ${formatDate(match.date)} &bull; ${match.city} &bull; ${guestsCount} invitado${guestsCount !== 1 ? 's' : ''}
                        </div>
                    </div>
                    <button class="btn btn-secondary btn-sm btn-view-reservation" data-match="${r.match_id}">
                        ${locked ? 'Ver' : 'Editar'}
                    </button>
                </div>`;
        }).join('');

        container.querySelectorAll('.btn-view-reservation').forEach(btn => {
            btn.addEventListener('click', () => openReservationModal(parseInt(btn.dataset.match)));
        });
    }

    function renderSpaceMatches() {
        const container = document.getElementById('space-matches-container');
        const stage = document.getElementById('space-stage-filter').value;
        const avail = document.getElementById('space-availability-filter').value;

        let matches = stage === 'all' ? MATCHES.slice() : MATCHES.filter(m => m.stage === stage);

        if (avail === 'available') {
            matches = matches.filter(m => getCuposRemainingForDate(getMatchDateKey(m)) > 0 && !isMatchLocked(m));
        } else if (avail === 'reserved') {
            matches = matches.filter(m => getReservationsForMatch(m.id).length > 0);
        }

        if (matches.length === 0) {
            container.innerHTML = '<p class="text-muted" style="text-align: center; padding: 2rem;">No hay partidos que coincidan con el filtro.</p>';
            return;
        }

        container.innerHTML = `<div class="space-matches-grid">${matches.map(m => {
            const locked = isMatchLocked(m);
            const matchReservations = getReservationsForMatch(m.id);
            const myRes = getMyReservationForMatch(m.id);
            const dateKey = getMatchDateKey(m);
            const taken = getCuposTakenForDate(dateKey);
            const remaining = DAILY_CAPACITY - taken;
            const flag1 = FLAGS[m.team1] || FLAGS['TBD'];
            const flag2 = FLAGS[m.team2] || FLAGS['TBD'];

            // Cupos badge
            let cuposBadge = '';
            const cuposPct = (taken / DAILY_CAPACITY) * 100;
            let cuposClass = 'cupos-ok';
            if (cuposPct >= 100) cuposClass = 'cupos-full';
            else if (cuposPct >= 75) cuposClass = 'cupos-low';

            if (locked) {
                cuposBadge = '<span class="cupos-badge cupos-past">Partido ya jugado</span>';
            } else {
                cuposBadge = `
                    <div class="cupos-badge ${cuposClass}">
                        <div class="cupos-count"><strong>${remaining}</strong>/${DAILY_CAPACITY} cupos disponibles</div>
                        <div class="cupos-bar"><div class="cupos-bar-fill" style="width: ${Math.min(100, cuposPct)}%"></div></div>
                    </div>
                `;
            }

            // My reservation status
            let myStatus = '';
            if (myRes) {
                const myGuests = (myRes.guests || []).length;
                const confIcon = myRes.is_confirmed ? '\u2713' : '\u23F3';
                const confLabel = myRes.is_confirmed ? 'Confirmada' : 'Pendiente';
                const confClass = myRes.is_confirmed ? 'space-status-confirmed' : 'space-status-pending';
                myStatus = `<div class="my-status"><span class="space-status ${confClass}">${confIcon} Mi reserva: ${confLabel}</span><span class="space-status-by">${myGuests} invitado${myGuests !== 1 ? 's' : ''}</span></div>`;
            }

            // Other reservations count (for transparency)
            const otherRes = matchReservations.filter(r => !currentUser || r.user_id !== currentUser.id).length;
            let othersNote = '';
            if (otherRes > 0) {
                othersNote = `<div class="others-note">${otherRes} ${otherRes === 1 ? 'otra reserva' : 'otras reservas'} para este partido</div>`;
            }

            // Button
            let buttonHTML = '';
            if (locked) {
                if (myRes || currentUser.isAdmin) {
                    buttonHTML = `<button class="btn btn-secondary btn-sm btn-open-reservation" data-match="${m.id}">Ver</button>`;
                }
            } else if (myRes) {
                buttonHTML = `<button class="btn btn-secondary btn-sm btn-open-reservation" data-match="${m.id}">Editar mi reserva</button>`;
            } else if (remaining === 0) {
                buttonHTML = `<button class="btn btn-secondary btn-sm" disabled>Cupos agotados</button>`;
            } else {
                buttonHTML = `<button class="btn btn-primary btn-sm btn-open-reservation" data-match="${m.id}">Reservar</button>`;
            }

            return `
                <div class="space-match-card ${myRes ? 'mine' : ''} ${locked ? 'past' : ''}">
                    <div class="space-match-stage">${STAGE_NAMES[m.stage] || m.stage}${m.group ? ' - Grupo ' + m.group : ''}</div>
                    <div class="space-match-teams">
                        <span>${flag1} ${getTeamDisplay(m.team1)}</span>
                        <span class="space-vs">vs</span>
                        <span>${getTeamDisplay(m.team2)} ${flag2}</span>
                    </div>
                    <div class="space-match-meta">${formatDate(m.date)} &bull; ${m.city}</div>
                    ${cuposBadge}
                    ${myStatus}
                    ${othersNote}
                    <div class="space-match-action">${buttonHTML}</div>
                </div>`;
        }).join('')}</div>`;

        container.querySelectorAll('.btn-open-reservation').forEach(btn => {
            btn.addEventListener('click', () => openReservationModal(parseInt(btn.dataset.match)));
        });
    }

    function openReservationModal(matchId) {
        currentReservationMatchId = matchId;
        const match = MATCHES.find(m => m.id === matchId);
        if (!match) return;

        const existing = getMyReservationForMatch(matchId);
        const isAdmin = currentUser.isAdmin;
        const locked = isMatchLocked(match);
        const readonly = locked;
        const isConfirmed = existing && existing.is_confirmed;
        const dateKey = getMatchDateKey(match);
        const takenExcludingMe = getCuposTakenForDate(dateKey) - (existing ? (existing.guests || []).length : 0);
        const maxAllowed = DAILY_CAPACITY - takenExcludingMe;

        const flag1 = FLAGS[match.team1] || FLAGS['TBD'];
        const flag2 = FLAGS[match.team2] || FLAGS['TBD'];

        document.getElementById('reservation-modal-title').textContent =
            existing ? 'Mi Reserva' : 'Reservar Kadima Center';

        // Status badges
        let statusAlert = '';
        if (existing) {
            if (isConfirmed) {
                statusAlert = '<div class="alert alert-success" style="margin-top: 0.75rem;"><strong>&#10003; Reserva confirmada:</strong> La Comunidad Israelita de Santiago ya valid\u00f3 tu reserva.</div>';
            } else {
                statusAlert = '<div class="alert alert-warning" style="margin-top: 0.75rem;"><strong>&#9203; Reserva pendiente:</strong> Tu reserva a\u00fan no ha sido confirmada. La Comunidad Israelita de Santiago se comunicar\u00e1 por email contigo para validarla.</div>';
            }
        }

        // Informational alert for new reservations
        let newReservationInfo = '';
        if (!existing && !locked) {
            newReservationInfo = '<div class="alert alert-info" style="margin-top: 0.75rem;"><strong>&#9432; Importante:</strong> Tu reserva <strong>no queda firme</strong> hasta que sea confirmada y validada por la Comunidad Israelita de Santiago. La CIS se comunicar\u00e1 por email contigo para confirmarla.</div>';
        }

        // Capacity info
        const cuposInfo = `<div class="alert alert-info" style="margin-top: 0.75rem;">
            <strong>&#128101; Cupos disponibles para este d\u00eda:</strong> ${maxAllowed} de ${DAILY_CAPACITY}.<br>
            <span style="font-size: 0.8rem; color: var(--text-muted);">Puedes incluirte a ti + acompa\u00f1antes hasta llenar los cupos disponibles.</span>
        </div>`;

        document.getElementById('reservation-match-info').innerHTML = `
            <div class="reservation-teams">${flag1} ${getTeamDisplay(match.team1)} <span class="space-vs">vs</span> ${getTeamDisplay(match.team2)} ${flag2}</div>
            <div class="reservation-meta">${formatDate(match.date)} &bull; ${match.city}</div>
            ${!locked ? cuposInfo : ''}
            ${statusAlert}
            ${newReservationInfo}
            ${locked ? '<div class="alert alert-danger" style="margin-top: 0.75rem;"><strong>&#128274; Partido iniciado:</strong> esta reserva ya no puede modificarse.</div>' : ''}
        `;

        // Guests list
        const guests = (existing && existing.guests) || [{}];
        const list = document.getElementById('guests-list');
        list.innerHTML = '';
        guests.forEach(g => addGuestRow(g, readonly));

        // Notes
        document.getElementById('reservation-notes').value = existing?.notes || '';
        document.getElementById('reservation-notes').disabled = readonly;

        // Buttons
        const saveBtn = document.getElementById('btn-save-reservation');
        const cancelBtn = document.getElementById('btn-cancel-reservation');
        const addGuestBtn = document.getElementById('btn-add-guest');

        if (readonly) {
            saveBtn.classList.add('hidden');
            addGuestBtn.classList.add('hidden');
        } else {
            saveBtn.classList.remove('hidden');
            addGuestBtn.classList.remove('hidden');
        }

        if (existing && !locked) {
            cancelBtn.classList.remove('hidden');
        } else {
            cancelBtn.classList.add('hidden');
        }

        clearError('reservation-error');
        show('reservation-modal');
    }

    function closeReservationModal() {
        hide('reservation-modal');
        currentReservationMatchId = null;
    }

    function addGuestRow(guest, readonly) {
        guest = guest || {};
        const list = document.getElementById('guests-list');
        const idx = list.children.length;

        const row = document.createElement('div');
        row.className = 'guest-row';
        row.innerHTML = `
            <div class="guest-row-header">
                <span class="guest-num">Invitado ${idx + 1}</span>
                <button class="btn-remove-guest" type="button" title="Eliminar" ${readonly ? 'disabled' : ''}>&times;</button>
            </div>
            <div class="guest-fields">
                <div class="guest-field-group">
                    <label class="guest-label">Nombre completo</label>
                    <input type="text" class="guest-field" data-field="name" placeholder="Ej: Juan P&eacute;rez" value="${escapeHtml(guest.name || '')}" ${readonly ? 'disabled' : ''}>
                </div>
                <div class="guest-field-group">
                    <label class="guest-label">RUT</label>
                    <input type="text" class="guest-field" data-field="rut" placeholder="12.345.678-9" value="${escapeHtml(guest.rut || '')}" ${readonly ? 'disabled' : ''}>
                </div>
                <div class="guest-field-group">
                    <label class="guest-label">Fecha de nacimiento</label>
                    <input type="date" class="guest-field" data-field="birthdate" value="${escapeHtml(guest.birthdate || '')}" ${readonly ? 'disabled' : ''}>
                </div>
                <div class="guest-field-group">
                    <label class="guest-label">Tel&eacute;fono</label>
                    <input type="tel" class="guest-field" data-field="phone" placeholder="+569 1234 5678" value="${escapeHtml(guest.phone || '')}" ${readonly ? 'disabled' : ''}>
                </div>
                <div class="guest-field-group guest-field-group-full">
                    <label class="guest-label">Email</label>
                    <input type="email" class="guest-field" data-field="email" placeholder="correo@email.com" value="${escapeHtml(guest.email || '')}" ${readonly ? 'disabled' : ''}>
                </div>
                <div class="guest-field-group guest-field-group-full">
                    <label class="guest-checkbox">
                        <input type="checkbox" data-field="is_merkaz" ${guest.is_merkaz ? 'checked' : ''} ${readonly ? 'disabled' : ''}>
                        <span>Es socio Merkaz</span>
                    </label>
                </div>
            </div>
        `;

        row.querySelector('.btn-remove-guest').addEventListener('click', () => {
            if (list.children.length > 1) {
                row.remove();
                renumberGuests();
            }
        });

        list.appendChild(row);
    }

    function renumberGuests() {
        document.querySelectorAll('#guests-list .guest-num').forEach((el, i) => {
            el.textContent = `Invitado ${i + 1}`;
        });
    }

    function collectGuests() {
        const rows = document.querySelectorAll('#guests-list .guest-row');
        return Array.from(rows).map(row => {
            const fields = {};
            row.querySelectorAll('[data-field]').forEach(el => {
                if (el.type === 'checkbox') fields[el.dataset.field] = el.checked;
                else fields[el.dataset.field] = el.value.trim();
            });
            return fields;
        });
    }

    function validateGuests(guests) {
        if (guests.length === 0) return 'Agrega al menos un invitado.';
        for (let i = 0; i < guests.length; i++) {
            const g = guests[i];
            if (!g.name) return `Invitado ${i + 1}: falta el nombre.`;
            if (!g.rut) return `Invitado ${i + 1}: falta el RUT.`;
            if (!g.birthdate) return `Invitado ${i + 1}: falta la fecha de nacimiento.`;
            if (!g.phone) return `Invitado ${i + 1}: falta el tel\u00e9fono.`;
            if (!g.email) return `Invitado ${i + 1}: falta el email.`;
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(g.email)) return `Invitado ${i + 1}: email inv\u00e1lido.`;
        }
        return null;
    }

    async function saveReservation() {
        if (!currentReservationMatchId) return;
        const match = MATCHES.find(m => m.id === currentReservationMatchId);
        if (!match || isMatchLocked(match)) {
            showError('reservation-error', 'El partido ya comenz\u00f3. No se puede modificar la reserva.');
            return;
        }

        clearError('reservation-error');
        const guests = collectGuests();
        const err = validateGuests(guests);
        if (err) { showError('reservation-error', err); return; }

        // Check daily capacity
        const dateKey = getMatchDateKey(match);
        const existing = getMyReservationForMatch(currentReservationMatchId);
        const takenExcludingMe = getCuposTakenForDate(dateKey) - (existing ? (existing.guests || []).length : 0);
        const maxAllowed = DAILY_CAPACITY - takenExcludingMe;

        if (guests.length > maxAllowed) {
            showError('reservation-error', `No hay suficientes cupos. Cupos disponibles para este d\u00eda: ${maxAllowed}. Tu reserva tiene ${guests.length} invitado${guests.length !== 1 ? 's' : ''}. Reduce la cantidad o elimina invitados.`);
            return;
        }

        const notes = document.getElementById('reservation-notes').value.trim();
        const btn = document.getElementById('btn-save-reservation');
        btn.disabled = true;

        try {
            const isNew = !existing;
            if (existing) {
                const { data, error } = await sb.from('reservations')
                    .update({ guests, notes })
                    .eq('id', existing.id)
                    .select()
                    .single();
                if (error) throw error;
                reservations[data.id] = data;
            } else {
                const { data, error } = await sb.from('reservations')
                    .insert({ user_id: currentUser.id, match_id: currentReservationMatchId, guests, notes })
                    .select()
                    .single();
                if (error) throw error;
                reservations[data.id] = data;
            }
            closeReservationModal();
            renderSpaceView();
            if (isNew) {
                alert('\u00a1Reserva registrada!\n\nRecuerda: tu reserva a\u00fan NO est\u00e1 confirmada.\n\nLa Comunidad Israelita de Santiago se comunicar\u00e1 por email contigo en los pr\u00f3ximos d\u00edas para validarla.');
            }
        } catch (e) {
            console.error(e);
            showError('reservation-error', e.message || 'Error guardando la reserva.');
        } finally {
            btn.disabled = false;
        }
    }

    async function cancelReservation() {
        if (!currentReservationMatchId) return;
        const match = MATCHES.find(m => m.id === currentReservationMatchId);
        if (match && isMatchLocked(match)) {
            showError('reservation-error', 'El partido ya comenz\u00f3. No se puede cancelar.');
            return;
        }

        const existing = getMyReservationForMatch(currentReservationMatchId);
        if (!existing) return;

        const ok = await showConfirm('Cancelar Reserva', '\u00bfEst\u00e1s seguro de cancelar esta reserva? Los cupos quedar\u00e1n disponibles para otros.');
        if (!ok) return;

        const { error } = await sb.from('reservations').delete().eq('id', existing.id);
        if (error) { showError('reservation-error', error.message); return; }
        delete reservations[existing.id];
        closeReservationModal();
        renderSpaceView();
    }

    // ============================================================
    // ADMIN VIEW
    // ============================================================
    function renderAdminView() {
        renderAdminResults();
        renderAdminPredictions();
        renderAdminReservations();
    }

    function renderAdminReservations() {
        const container = document.getElementById('admin-reservations-list');
        if (!container) return;
        const entries = Object.values(reservations).sort((a, b) => {
            const ma = MATCHES.find(m => m.id === a.match_id);
            const mb = MATCHES.find(m => m.id === b.match_id);
            if (!ma || !mb) return 0;
            return new Date(ma.date) - new Date(mb.date);
        });

        if (entries.length === 0) {
            container.innerHTML = '<p class="text-muted">No hay reservas a\u00fan.</p>';
            return;
        }

        container.innerHTML = entries.map(r => {
            const m = MATCHES.find(x => x.id === r.match_id);
            if (!m) return '';
            const profile = allProfiles[r.user_id] || {};
            const guests = r.guests || [];
            const flag1 = FLAGS[m.team1] || '';
            const flag2 = FLAGS[m.team2] || '';
            const isConfirmed = r.is_confirmed;
            const statusBadge = isConfirmed
                ? '<span class="reservation-badge reservation-badge-confirmed">&#10003; Confirmada</span>'
                : '<span class="reservation-badge reservation-badge-pending">&#9203; Pendiente</span>';
            const confirmBtn = isConfirmed
                ? `<button class="btn btn-secondary btn-sm btn-admin-unconfirm" data-resid="${r.id}">Desconfirmar</button>`
                : `<button class="btn btn-primary btn-sm btn-admin-confirm" data-resid="${r.id}">Confirmar</button>`;
            return `
                <div class="admin-reservation">
                    <div class="admin-reservation-header">
                        <div>
                            <div class="admin-reservation-match">${flag1} ${getTeamDisplay(m.team1)} vs ${getTeamDisplay(m.team2)} ${flag2} ${statusBadge}</div>
                            <div class="admin-reservation-meta">${formatDate(m.date)} &bull; ${m.city} &bull; Reservado por <strong>${escapeHtml(profile.display_name || '?')}</strong> (${escapeHtml(profile.email || '')}) &bull; ${guests.length} invitado${guests.length !== 1 ? 's' : ''}</div>
                        </div>
                        <div class="admin-reservation-actions">
                            ${confirmBtn}
                            <button class="btn btn-danger btn-sm btn-admin-delete-reservation" data-resid="${r.id}">Eliminar</button>
                        </div>
                    </div>
                    <div class="admin-guests-table">
                        <div class="admin-guests-header">
                            <span>#</span><span>Nombre</span><span>RUT</span><span>F. Nac.</span><span>Tel\u00e9fono</span><span>Email</span><span>Merkaz</span>
                        </div>
                        ${guests.map((g, i) => `
                            <div class="admin-guests-row">
                                <span>${i + 1}</span>
                                <span>${escapeHtml(g.name || '')}</span>
                                <span>${escapeHtml(g.rut || '')}</span>
                                <span>${escapeHtml(g.birthdate || '')}</span>
                                <span>${escapeHtml(g.phone || '')}</span>
                                <span>${escapeHtml(g.email || '')}</span>
                                <span>${g.is_merkaz ? '\u2713' : '\u2717'}</span>
                            </div>
                        `).join('')}
                    </div>
                    ${r.notes ? `<div class="admin-reservation-notes"><strong>Notas:</strong> ${escapeHtml(r.notes)}</div>` : ''}
                </div>`;
        }).join('');

        container.querySelectorAll('.btn-admin-delete-reservation').forEach(btn => {
            btn.addEventListener('click', async () => {
                const resId = btn.dataset.resid;
                const ok = await showConfirm('Eliminar Reserva', '\u00bfEliminar esta reserva? Esta acci\u00f3n no se puede deshacer.');
                if (!ok) return;
                const { error } = await sb.from('reservations').delete().eq('id', resId);
                if (error) { alert('Error: ' + error.message); return; }
                delete reservations[resId];
                renderAdminView();
            });
        });

        container.querySelectorAll('.btn-admin-confirm').forEach(btn => {
            btn.addEventListener('click', async () => {
                const resId = btn.dataset.resid;
                const { data, error } = await sb.from('reservations')
                    .update({ is_confirmed: true, confirmed_at: new Date().toISOString(), confirmed_by: currentUser.id })
                    .eq('id', resId)
                    .select()
                    .single();
                if (error) { alert('Error: ' + error.message); return; }
                reservations[data.id] = data;
                renderAdminView();
            });
        });

        container.querySelectorAll('.btn-admin-unconfirm').forEach(btn => {
            btn.addEventListener('click', async () => {
                const resId = btn.dataset.resid;
                const ok = await showConfirm('Desconfirmar Reserva', '\u00bfMarcar esta reserva como pendiente de nuevo?');
                if (!ok) return;
                const { data, error } = await sb.from('reservations')
                    .update({ is_confirmed: false, confirmed_at: null, confirmed_by: null })
                    .eq('id', resId)
                    .select()
                    .single();
                if (error) { alert('Error: ' + error.message); return; }
                reservations[data.id] = data;
                renderAdminView();
            });
        });
    }

    function renderAdminResults() {
        const container = document.getElementById('admin-results-container');
        const sf = document.getElementById('admin-stage-filter');
        const gf = document.getElementById('admin-group-filter');

        if (gf.options.length <= 1) {
            Object.keys(GROUPS).sort().forEach(g => {
                const opt = document.createElement('option');
                opt.value = g; opt.textContent = GROUPS[g].name;
                gf.appendChild(opt);
            });
        }

        const stage = sf.value;
        const group = gf.value;
        gf.style.display = stage === 'groups' ? '' : 'none';

        let matches = MATCHES.filter(m => m.stage === stage);
        if (stage === 'groups' && group !== 'all') matches = matches.filter(m => m.group === group);

        container.innerHTML = matches.map(m => {
            const real = realResults[m.id] || {};
            const flag1 = FLAGS[m.team1] || '';
            const flag2 = FLAGS[m.team2] || '';
            return `
                <div class="admin-result-row">
                    <span class="admin-result-id">M${m.id}</span>
                    <span class="admin-result-teams">${flag1} ${getTeamDisplay(m.team1)}</span>
                    <input type="number" class="admin-score-input" min="0" max="20"
                        data-match="${m.id}" data-side="home"
                        value="${real.home !== undefined ? real.home : ''}" placeholder="-">
                    <span class="score-separator">:</span>
                    <input type="number" class="admin-score-input" min="0" max="20"
                        data-match="${m.id}" data-side="away"
                        value="${real.away !== undefined ? real.away : ''}" placeholder="-">
                    <span class="admin-result-teams">${getTeamDisplay(m.team2)} ${flag2}</span>
                    <span class="admin-result-date">${formatDateShort(m.date)}</span>
                </div>`;
        }).join('');

        container.querySelectorAll('.admin-score-input').forEach(input => {
            input.addEventListener('change', handleAdminResultChange);
        });

        sf.onchange = () => renderAdminResults();
        gf.onchange = () => renderAdminResults();
    }

    async function handleAdminResultChange(e) {
        const matchId = parseInt(e.target.dataset.match);
        const side = e.target.dataset.side;
        const val = e.target.value.trim();

        const current = realResults[matchId] || {};
        const otherSide = side === 'home' ? 'away' : 'home';
        const otherVal = current[otherSide];

        if (val === '' || isNaN(parseInt(val))) {
            // Both empty = delete row; else just update the one side by clearing wouldn't satisfy NOT NULL
            if (otherVal === undefined) {
                await sb.from('real_results').delete().eq('match_id', matchId);
                delete realResults[matchId];
            } else {
                // Can't save with one side empty (NOT NULL). Revert visually.
                e.target.value = current[side] !== undefined ? current[side] : '';
            }
        } else {
            const newVal = Math.max(0, Math.min(20, parseInt(val)));
            e.target.value = newVal;
            const row = { match_id: matchId, home: side === 'home' ? newVal : current.home, away: side === 'away' ? newVal : current.away };
            if (row.home === undefined || row.away === undefined) {
                // Store temporarily, don't upsert until both sides set
                realResults[matchId] = { ...(realResults[matchId] || {}), [side]: newVal };
            } else {
                const { error } = await sb.from('real_results').upsert(row);
                if (error) { alert('Error: ' + error.message); return; }
                realResults[matchId] = { home: row.home, away: row.away };
            }
        }
    }

    function renderAdminPredictions() {
        const container = document.getElementById('admin-predictions-list');
        const ids = Object.keys(allPredictions).filter(id => allProfiles[id]);

        if (ids.length === 0) {
            container.innerHTML = '<p class="text-muted">No hay participantes.</p>';
            return;
        }

        container.innerHTML = ids.map(id => {
            const profile = allProfiles[id];
            const pred = allPredictions[id];
            const filled = countFilled(pred);
            const points = calculateTotalPoints(id);
            return `
                <div class="admin-pred-row">
                    <div class="admin-pred-info">
                        <span class="admin-pred-name">${escapeHtml(profile.display_name)}${profile.is_admin ? ' <span class="me-badge">admin</span>' : ''}</span>
                        <span class="admin-pred-email">${escapeHtml(profile.email)}</span>
                    </div>
                    <span class="admin-pred-stat">${filled}/${MATCHES.length}</span>
                    <span class="admin-pred-stat">${points} pts</span>
                    <button class="btn btn-danger btn-sm btn-admin-delete" data-id="${id}" ${profile.is_admin ? 'disabled' : ''}>Eliminar</button>
                </div>`;
        }).join('');

        container.querySelectorAll('.btn-admin-delete').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                const name = allProfiles[id]?.display_name || '';
                const ok = await showConfirm('Eliminar Pron\u00f3stico', `\u00bfEliminar el pron\u00f3stico de "${name}"?`);
                if (ok) {
                    const { error } = await sb.from('predictions').delete().eq('user_id', id);
                    if (error) { alert('Error: ' + error.message); return; }
                    delete allPredictions[id];
                    renderAdminView();
                    renderPredictionsList();
                    updatePredictionSelectors();
                }
            });
        });
    }

    // ============================================================
    // INIT
    // ============================================================
    async function init() {
        setupAuthUI();
        setupNavigation();
        setupHubNav();
        setupConfirmModal();
        setupReservationModal();
        document.getElementById('btn-back-predictions').addEventListener('click', closeEditPrediction);

        // Lock timer - refresh edit view every 30s to update locks
        setInterval(() => {
            if (currentEditId) {
                const activeStage = document.querySelector('.edit-nav-btn.active');
                if (activeStage) renderEditMatches(activeStage.dataset.stage);
            }
        }, 30000);

        // Detect if arriving from magic link (has tokens in URL hash)
        const hasMagicLinkHash = window.location.hash &&
            (window.location.hash.includes('access_token') || window.location.hash.includes('error'));

        // Single handler for all auth state changes
        let appEntered = false;
        sb.auth.onAuthStateChange(async (event, session) => {
            // Handle signout
            if (event === 'SIGNED_OUT') {
                appEntered = false;
                hide('app');
                show('login-screen');
                showMainStep();
                return;
            }

            // Password recovery: user clicked reset link in email
            if (event === 'PASSWORD_RECOVERY') {
                hide('splash');
                hide('app');
                show('login-screen');
                // Clean URL hash
                if (window.location.hash && window.location.hash.includes('access_token')) {
                    history.replaceState(null, '', window.location.pathname);
                }
                showNewPasswordStep();
                return;
            }

            // Handle signin (from storage OR from email confirmation OR from password login)
            if (session && !appEntered) {
                appEntered = true;
                // Clean URL hash if it has tokens
                if (window.location.hash && window.location.hash.includes('access_token')) {
                    history.replaceState(null, '', window.location.pathname);
                }
                hide('splash');
                try {
                    await onAuthSuccess();
                } catch (err) {
                    console.error('Auth success error:', err);
                    alert('Error cargando datos: ' + err.message);
                    appEntered = false;
                    show('login-screen');
                    showMainStep();
                }
                return;
            }

            // No session and initial load done - show login
            if (!session && event === 'INITIAL_SESSION' && !appEntered) {
                hide('splash');
                show('login-screen');
                showMainStep();
            }
        });

        // Safety fallback: if auth state change doesn't fire within 2s, show login
        setTimeout(() => {
            if (!appEntered && !document.getElementById('splash').classList.contains('hidden')) {
                hide('splash');
                if (document.getElementById('app').classList.contains('hidden')) {
                    show('login-screen');
                    showMainStep();
                }
            }
        }, 2000);
    }

    document.addEventListener('DOMContentLoaded', init);
})();
