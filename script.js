import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://cupvbdtltmfoxyupxcne.supabase.co';
const SUPABASE_KEY = 'sb_publishable_CctZKBC4P7dtXLHs1D-mow_VGKRG9iG';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const direcciones = [
    "CONSULTORÍA JURÍDICA",
    "DIRECCIÓN DE GESTIÓN ADMINISTRATIVA Y FINANCIERA",
    "DIRECCIÓN DE GESTIÓN COMERCIAL",
    "DIRECCIÓN DE GESTIÓN COMUNICACIONAL",
    "DIRECCIÓN DE GESTIÓN DEL SECTOR POSTAL",
    "DIRECCIÓN DE GESTIÓN HUMANA",
    "DIRECCIÓN DE GESTIÓN OPERATIVA",
    "DIRECCIÓN DE INFRAESTRUCTURA",
    "DIRECCIÓN DE PLANIFICACIÓN Y PRESUPUESTO",
    "DIRECCIÓN DE RELACIONES INTERNACIONALES Y DE COOPERACIÓN",
    "DIRECCIÓN DE SEGURIDAD POSTAL",
    "DIRECCIÓN DE TECNOLOGÍA DE LA INFORMACIÓN Y COMUNICACIÓN",
    "DIRECCIÓN DEL CENTRO NACIONAL DE CONTROL",
    "DIRECCIÓN DEL DESPACHO",
    "OFICINA DE ATENCIÓN AL CIUDADANO"
];

let currentUser = null;
let currentDireccion = "";

// --- AUTENTICACIÓN ---
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const pass = document.getElementById('login-password').value.trim();

    const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('password', pass);

    if (error || !users || users.length === 0) {
        Swal.fire('Error', 'Credenciales incorrectas.', 'error');
        return;
    }

    currentUser = users[0];
    localStorage.setItem('session_user', JSON.stringify(currentUser));
    startApp();
});

window.logout = function() {
    currentUser = null;
    localStorage.removeItem('session_user');
    hideAllViews();
    document.getElementById('navbar').classList.add('hidden');
    document.getElementById('view-login').classList.remove('hidden');
    document.getElementById('login-form').reset();
};

function startApp() {
    hideAllViews();
    document.getElementById('navbar').classList.remove('hidden');
    document.getElementById('user-info').innerHTML = `<i class="fas fa-user mr-1"></i> ${currentUser.name} <span class="bg-blue-700 px-2 py-0.5 rounded text-[10px] ml-1">${currentUser.role.toUpperCase()}</span>`;

    const btnAdmin = document.getElementById('btn-admin-panel');
    if (currentUser.role === 'admin') {
        btnAdmin.classList.remove('hidden');
        btnAdmin.onclick = showAdminPanel;
    } else {
        btnAdmin.classList.add('hidden');
    }

    showDashboard();
    listenRealtimeNotifications();
    fetchNotifications();
}

// --- NAVEGACIÓN ---
function hideAllViews() {
    document.getElementById('view-login').classList.add('hidden');
    document.getElementById('view-admin').classList.add('hidden');
    document.getElementById('view-dashboard').classList.add('hidden');
    document.getElementById('view-novedades').classList.add('hidden');
    document.getElementById('view-agenda').classList.add('hidden');
    document.getElementById('view-tasks').classList.add('hidden');
    closeModals();
}

window.showDashboard = function() {
    hideAllViews();
    renderDirecciones();
    document.getElementById('view-dashboard').classList.remove('hidden');
};

window.showNovedades = function() {
    hideAllViews();
    renderNovedades();
    document.getElementById('view-novedades').classList.remove('hidden');
};

window.showAgenda = function() {
    hideAllViews();
    renderMeetings();
    document.getElementById('view-agenda').classList.remove('hidden');
};

function showAdminPanel() {
    hideAllViews();
    document.getElementById('view-admin').classList.remove('hidden');
    renderUsersTable();
}

// --- DIRECCIONES Y TAREAS ---
async function renderDirecciones() {
    const grid = document.getElementById('direcciones-grid');
    const { data: tasks } = await supabase.from('tasks').select('*');

    grid.innerHTML = direcciones.map((dir, index) => {
        const dirTasks = (tasks || []).filter(t => t.direccion === dir);
        const total = dirTasks.length;
        const completadas = dirTasks.filter(t => t.status === 'Completado').length;
        const enProgreso = dirTasks.filter(t => t.status === 'Pendiente' || t.status === 'En Proceso').length;

        return `
            <div onclick="openDireccion('${dir}')" class="bg-white p-4 rounded-lg shadow border-l-4 border-blue-900 cursor-pointer hover:shadow-lg transition flex flex-col justify-between">
                <div>
                    <div class="flex items-center gap-3 mb-2">
                        <div class="bg-blue-100 text-blue-900 rounded-full w-7 h-7 flex items-center justify-center font-bold text-xs">
                            ${index + 1}
                        </div>
                        <h3 class="text-xs sm:text-sm font-bold text-gray-800 leading-tight">${dir}</h3>
                    </div>
                </div>
                <div class="grid grid-cols-3 gap-1.5 mt-2 pt-2 border-t text-center text-[11px]">
                    <div class="bg-gray-50 p-1.5 rounded">
                        <span class="block text-gray-500 font-medium">Total</span>
                        <span class="text-xs font-bold text-gray-800">${total}</span>
                    </div>
                    <div class="bg-yellow-50 p-1.5 rounded">
                        <span class="block text-yellow-700 font-medium">Pendientes</span>
                        <span class="text-xs font-bold text-yellow-800">${enProgreso}</span>
                    </div>
                    <div class="bg-green-50 p-1.5 rounded">
                        <span class="block text-green-700 font-medium">Listas</span>
                        <span class="text-xs font-bold text-green-800">${completadas}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

window.openDireccion = async function(dirName) {
    currentDireccion = dirName;
    document.getElementById('current-dir-title').innerText = dirName;
    hideAllViews();
    document.getElementById('view-tasks').classList.remove('hidden');
    await renderTasks();
    await populateUserSelects();
};

async function renderTasks() {
    const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('direccion', currentDireccion);

    const tbody = document.getElementById('tasks-tbody');
    
    if (!tasks || tasks.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="px-4 py-4 text-center text-gray-500">No hay tareas registradas en esta dirección.</td></tr>`;
        return;
    }

    tbody.innerHTML = tasks.map(t => {
        let statusColor = t.status === 'Pendiente' ? 'bg-red-100 text-red-800' : 
                          t.status === 'En Proceso' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800';
        
        const historyArr = t.history || [];
        const lastUpdate = historyArr.length > 0 ? historyArr[historyArr.length - 1] : null;
        const lastNoteText = lastUpdate ? lastUpdate.note : 'Sin avances registrados';

        return `
        <tr>
            <td class="px-4 py-3 text-xs sm:text-sm text-gray-900">
                <div class="w-48 sm:w-56 font-semibold break-words">${t.description}</div>
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-xs text-gray-900">
                <div><i class="fas fa-user-circle text-gray-400 mr-1"></i>${t.assigned_to_name}</div>
                <div class="text-[11px] text-gray-500 mt-0.5"><i class="far fa-calendar-alt text-gray-400 mr-1"></i>Límite: ${t.due_date}</div>
            </td>
            <td class="px-4 py-3 text-xs text-gray-700">
                <div class="text-[11px] bg-gray-50 p-1.5 rounded border mb-1 max-w-xs truncate">
                    <b>Último avance:</b> ${lastNoteText}
                </div>
                <button onclick="openTaskHistory('${t.id}')" class="text-xs text-blue-700 hover:text-blue-900 font-bold underline">
                    <i class="fas fa-comments mr-1"></i> Ver/Añadir Bitácora (${historyArr.length})
                </button>
            </td>
            <td class="px-4 py-3 text-xs">
                <select onchange="updateTaskStatus('${t.id}', this.value)" class="${statusColor} rounded px-2 py-1 text-xs font-bold border-none outline-none cursor-pointer mb-1">
                    <option value="Pendiente" ${t.status === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
                    <option value="En Proceso" ${t.status === 'En Proceso' ? 'selected' : ''}>En Proceso</option>
                    <option value="Completado" ${t.status === 'Completado' ? 'selected' : ''}>Completado</option>
                </select>
                <div class="text-[10px] text-gray-500">
                    <b>Última mod.:</b> ${t.last_modified_by}
                </div>
            </td>
        </tr>
    `;
    }).join('');
}

document.getElementById('form-task').addEventListener('submit', async (e) => {
    e.preventDefault();
    const selectResp = document.getElementById('task-resp');

    const newTask = {
        id: 'tsk_' + Date.now(),
        direccion: currentDireccion,
        description: document.getElementById('task-desc').value,
        assigned_to_id: selectResp.value,
        assigned_to_name: selectResp.options[selectResp.selectedIndex].text,
        due_date: document.getElementById('task-date').value,
        status: 'Pendiente',
        last_modified_by: currentUser.name,
        history: [{
            timestamp: new Date().toLocaleString(),
            user: currentUser.name,
            note: 'Tarea creada en el sistema.',
            status: 'Pendiente'
        }]
    };

    await supabase.from('tasks').insert([newTask]);

    // Notificación automática
    await supabase.from('notifications').insert([{
        id: 'notif_' + Date.now(),
        to_id: selectResp.value,
        from_name: currentUser.name,
        title: `Nueva Tarea Asignada`,
        message: `${currentUser.name} te asignó: "${newTask.description}"`,
        task_id: newTask.id,
        read: false
    }]);

    closeModals();
    await renderTasks();
    Swal.fire('Guardado', 'Tarea asignada correctamente.', 'success');
});

window.openTaskHistory = async function(taskId) {
    const { data: task } = await supabase.from('tasks').select('*').eq('id', taskId).single();
    if (!task) return;

    const historyHtml = (task.history || []).map(h => `
        <div class="text-left bg-gray-50 p-2.5 rounded mb-2 border-l-4 border-blue-800 shadow-sm text-xs">
            <div class="flex justify-between text-[11px] text-gray-500 mb-1">
                <span class="font-bold text-blue-900"><i class="fas fa-user text-gray-400 mr-1"></i>${h.user}</span>
                <span>${h.timestamp}</span>
            </div>
            <p class="text-xs text-gray-800 leading-relaxed">${h.note}</p>
        </div>
    `).join('');

    Swal.fire({
        title: 'Historial y Avances',
        html: `
            <div class="text-left text-xs mb-2 font-semibold text-gray-600 truncate">Tarea: ${task.description}</div>
            <div class="max-h-48 overflow-y-auto mb-3 p-2 bg-gray-100 rounded border">${historyHtml || '<div class="text-center text-gray-400 text-xs">Sin registros.</div>'}</div>
            <div class="text-left">
                <label class="block text-xs font-bold text-gray-700 mb-1">Nuevo Comentario / Avance:</label>
                <textarea id="swal-advance-note" class="w-full border rounded p-2 text-xs" rows="3" placeholder="Escriba los detalles del avance..."></textarea>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Guardar Avance',
        confirmButtonColor: '#1e3a8a',
        cancelButtonText: 'Cerrar',
        preConfirm: () => {
            const note = document.getElementById('swal-advance-note').value.trim();
            if (!note) {
                Swal.showValidationMessage('Debe escribir un avance.');
                return false;
            }
            return note;
        }
    }).then(async (result) => {
        if (result.isConfirmed) {
            const updatedHistory = task.history || [];
            updatedHistory.push({
                timestamp: new Date().toLocaleString(),
                user: currentUser.name,
                note: result.value,
                status: task.status
            });

            await supabase
                .from('tasks')
                .update({ history: updatedHistory, last_modified_by: currentUser.name })
                .eq('id', taskId);

            // Emitir Notificación del Comentario
            await supabase.from('notifications').insert([{
                id: 'notif_' + Date.now(),
                to_id: null, // Visibilidad global para Director y Analistas
                from_name: currentUser.name,
                title: `Nuevo Avance en ${task.direccion}`,
                message: `${currentUser.name} comentó en "${task.description.substring(0, 30)}...": ${result.value}`,
                task_id: taskId,
                read: false
            }]);

            await renderTasks();
            Swal.fire('Registrado', 'El avance fue publicado.', 'success');
        }
    });
};

// --- CAMBIO DE ESTATUS CON ALERTA AUTOMÁTICA ---
window.updateTaskStatus = async function(taskId, newStatus) {
    const { data: task } = await supabase.from('tasks').select('*').eq('id', taskId).single();
    if (!task) return;

    const oldStatus = task.status;
    const updatedHistory = task.history || [];
    updatedHistory.push({
        timestamp: new Date().toLocaleString(),
        user: currentUser.name,
        note: `Cambio de estado: de "${oldStatus}" a "${newStatus}".`,
        status: newStatus
    });

    await supabase
        .from('tasks')
        .update({ status: newStatus, last_modified_by: currentUser.name, history: updatedHistory })
        .eq('id', taskId);

    // Enviar Alerta en Tiempo Real al Cambiar Estatus
    await supabase.from('notifications').insert([{
        id: 'notif_' + Date.now(),
        to_id: null,
        from_name: currentUser.name,
        title: `Estatus Actualizado en ${task.direccion}`,
        message: `${currentUser.name} cambió la tarea "${task.description.substring(0, 35)}..." de "${oldStatus}" a "${newStatus}".`,
        task_id: taskId,
        read: false
    }]);

    await renderTasks();
};

// --- SECTOR DE NOVEDADES Y NO REVISADOS ---
async function renderNovedades() {
    const container = document.getElementById('novedades-container');
    const { data: notifs } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

    if (!notifs || notifs.length === 0) {
        container.innerHTML = `<div class="p-6 text-center text-gray-400 text-sm">No hay novedades ni cambios de estatus registrados.</div>`;
        return;
    }

    container.innerHTML = notifs.map(n => `
        <div class="p-3.5 ${n.read ? 'bg-white' : 'bg-amber-50'} hover:bg-gray-50 flex justify-between items-start transition">
            <div class="space-y-1">
                <div class="flex items-center gap-2">
                    <span class="font-bold text-xs sm:text-sm text-blue-900">${n.title}</span>
                    ${!n.read ? '<span class="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded">Sin Revisar</span>' : '<span class="bg-gray-200 text-gray-600 text-[9px] px-1.5 py-0.2 rounded">Revisado</span>'}
                </div>
                <p class="text-xs sm:text-sm text-gray-800">${n.message}</p>
                <div class="text-[10px] text-gray-400"><i class="fas fa-user mr-1"></i>${n.from_name} • ${new Date(n.created_at).toLocaleString()}</div>
            </div>
            ${n.task_id ? `<button onclick="openTaskHistory('${n.task_id}')" class="bg-blue-900 text-white text-xs px-2.5 py-1 rounded hover:bg-blue-800 transition"><i class="fas fa-eye mr-1"></i> Revisar</button>` : ''}
        </div>
    `).join('');
}

window.markAllNovedadesRead = async function() {
    await supabase.from('notifications').update({ read: true }).neq('read', true);
    await renderNovedades();
    await fetchNotifications();
    Swal.fire('Completado', 'Todas las novedades han sido marcadas como revisadas.', 'success');
};

// --- AGENDA DE REUNIONES ---
async function renderMeetings() {
    const { data: meetings } = await supabase.from('meetings').select('*');
    const tbody = document.getElementById('meetings-tbody');

    if (!meetings || meetings.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="px-4 py-4 text-center text-gray-500">No hay reuniones agendadas.</td></tr>`;
        return;
    }

    tbody.innerHTML = meetings.map(m => {
        let statusBadge = m.status === 'Programada' ? 'bg-purple-100 text-purple-800' :
                          m.status === 'Realizada' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';

        const dirsBadges = (m.direcciones || []).map(d => 
            `<span class="inline-block bg-purple-100 text-purple-800 text-[10px] font-semibold px-1.5 py-0.5 rounded mr-1 mb-1 border border-purple-200">${d}</span>`
        ).join('');

        const reqsHtml = m.requirements ? 
            `<div class="text-[11px] text-amber-900 bg-amber-50 p-1.5 rounded border border-amber-200 mt-1">
                <b>Requerido:</b> ${m.requirements}
             </div>` : '';

        return `
            <tr>
                <td class="px-4 py-3 whitespace-nowrap text-xs font-bold text-gray-900">
                    <div><i class="far fa-calendar text-purple-700 mr-1"></i>${m.date}</div>
                    <div class="text-[11px] text-gray-500 font-normal"><i class="far fa-clock mr-1"></i>${m.time}</div>
                </td>
                <td class="px-4 py-3 text-xs text-gray-900">
                    <div class="font-bold text-sm text-gray-800">${m.title}</div>
                    <div class="text-[11px] text-gray-600 mt-0.5 max-w-xs"><b>Orden del día:</b> ${m.agenda}</div>
                    ${reqsHtml}
                </td>
                <td class="px-4 py-3 text-xs text-gray-900">
                    <div class="max-w-xs flex flex-wrap mb-1">${dirsBadges}</div>
                    <div class="text-[10px] text-gray-400">Por: ${m.created_by}</div>
                </td>
                <td class="px-4 py-3 text-xs">
                    <select onchange="updateMeetingStatus('${m.id}', this.value)" class="${statusBadge} rounded px-2 py-1 text-xs font-bold border-none outline-none cursor-pointer mb-1">
                        <option value="Programada" ${m.status === 'Programada' ? 'selected' : ''}>Programada</option>
                        <option value="Realizada" ${m.status === 'Realizada' ? 'selected' : ''}>Realizada</option>
                        <option value="Cancelada" ${m.status === 'Cancelada' ? 'selected' : ''}>Cancelada</option>
                    </select>
                    <br>
                    <button onclick="openMeetingDetails('${m.id}')" class="text-xs text-purple-800 font-bold underline">
                        <i class="fas fa-file-alt mr-1"></i> Minuta
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

window.openMeetingModal = function() {
    document.getElementById('form-meeting').reset();
    const container = document.getElementById('meet-dirs-container');
    container.innerHTML = direcciones.map(d => `
        <label class="flex items-center gap-1.5 cursor-pointer hover:bg-gray-100 p-1 rounded">
            <input type="checkbox" name="meet_dir_check" value="${d}" class="rounded text-purple-700">
            <span class="truncate">${d}</span>
        </label>
    `).join('');
    document.getElementById('modal-meeting').classList.remove('hidden');
};

document.getElementById('form-meeting').addEventListener('submit', async (e) => {
    e.preventDefault();
    const selectedDirs = Array.from(document.querySelectorAll('input[name="meet_dir_check"]:checked')).map(cb => cb.value);

    if (selectedDirs.length === 0) {
        Swal.fire('Atención', 'Seleccione al menos una dirección convocada.', 'warning');
        return;
    }

    const newMeeting = {
        id: 'meet_' + Date.now(),
        title: document.getElementById('meet-title').value,
        direcciones: selectedDirs,
        date: document.getElementById('meet-date').value,
        time: document.getElementById('meet-time').value,
        agenda: document.getElementById('meet-agenda').value,
        requirements: document.getElementById('meet-reqs').value,
        status: 'Programada',
        created_by: currentUser.name,
        minuta: ''
    };

    await supabase.from('meetings').insert([newMeeting]);
    closeModals();
    await renderMeetings();
    Swal.fire('Agendada', 'Reunión registrada.', 'success');
});

window.updateMeetingStatus = async function(meetId, status) {
    await supabase.from('meetings').update({ status }).eq('id', meetId);
    await renderMeetings();
};

window.openMeetingDetails = async function(meetId) {
    const { data: meeting } = await supabase.from('meetings').select('*').eq('id', meetId).single();
    if (!meeting) return;

    Swal.fire({
        title: 'Minuta de la Reunión',
        html: `
            <div class="text-left text-xs mb-1"><b>Asunto:</b> ${meeting.title}</div>
            <div class="text-left text-xs mb-3"><b>Orden del día:</b> ${meeting.agenda}</div>
            <div class="text-left">
                <label class="block text-xs font-bold text-gray-700 mb-1">Acuerdos / Minuta:</label>
                <textarea id="swal-minuta" class="w-full border rounded p-2 text-xs" rows="4">${meeting.minuta || ''}</textarea>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Guardar Minuta',
        confirmButtonColor: '#6b21a8'
    }).then(async (result) => {
        if (result.isConfirmed) {
            const minuta = document.getElementById('swal-minuta').value;
            await supabase.from('meetings').update({ minuta }).eq('id', meetId);
            await renderMeetings();
            Swal.fire('Guardado', 'Minuta actualizada.', 'success');
        }
    });
};

// --- ESCUCHA DE ALERTAS EN TIEMPO REAL Y CONTADORES ---
function listenRealtimeNotifications() {
    supabase
        .channel('schema-db-changes')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, payload => {
            const notif = payload.new;
            Swal.fire({
                title: notif.title,
                text: notif.message,
                icon: 'info',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 4000
            });
            fetchNotifications();
        })
        .subscribe();
}

async function fetchNotifications() {
    if (!currentUser) return;
    
    const { data: notifs } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

    const unread = (notifs || []).filter(n => !n.read);
    
    // Actualizar badges
    const badge = document.getElementById('notif-badge');
    const novBadge = document.getElementById('novedades-badge');

    if (unread.length > 0) {
        badge.innerText = unread.length;
        badge.classList.remove('hidden');
        novBadge.innerText = unread.length;
        novBadge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
        novBadge.classList.add('hidden');
    }

    const list = document.getElementById('notif-list');
    if (!notifs || notifs.length === 0) {
        list.innerHTML = `<div class="p-3 text-center text-gray-400">Sin notificaciones</div>`;
        return;
    }

    list.innerHTML = notifs.slice(0, 5).map(n => `
        <div class="p-2.5 ${n.read ? 'bg-white' : 'bg-blue-50'} hover:bg-gray-100 cursor-pointer transition" onclick="showNovedades()">
            <div class="flex justify-between items-center mb-1">
                <span class="font-bold text-blue-900 text-xs">${n.title}</span>
                <span class="text-[9px] text-gray-400">${n.from_name}</span>
            </div>
            <div class="text-xs text-gray-700 leading-snug truncate">${n.message}</div>
        </div>
    `).join('');
}

window.toggleNotifications = function() {
    document.getElementById('notif-dropdown').classList.toggle('hidden');
};

// --- AUXILIARES ---
async function populateUserSelects() {
    const { data: users } = await supabase
        .from('users')
        .select('*')
        .neq('id', currentUser.id);

    const options = (users || []).map(u => `<option value="${u.id}">${u.name} (${u.role})</option>`).join('');
    document.getElementById('task-resp').innerHTML = options;
    document.getElementById('call-to').innerHTML = options;
}

document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim().toLowerCase();
    const password = document.getElementById('reg-password').value.trim();
    const role = document.getElementById('reg-role').value;

    const newUser = { id: 'usr_' + Date.now(), name, email, password, role };
    await supabase.from('users').insert([newUser]);
    
    Swal.fire('Éxito', `Usuario ${name} registrado.`, 'success');
    document.getElementById('register-form').reset();
    renderUsersTable();
});

async function renderUsersTable() {
    const { data: users } = await supabase.from('users').select('*');
    const tbody = document.getElementById('users-table-body');
    tbody.innerHTML = (users || []).map(u => `
        <tr>
            <td class="px-4 py-3 text-xs font-medium text-gray-900">${u.name}</td>
            <td class="px-4 py-3 text-xs text-gray-500">${u.email}</td>
            <td class="px-4 py-3 text-xs text-gray-500">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold ${u.role === 'admin' ? 'bg-yellow-200 text-yellow-800' : u.role === 'director' ? 'bg-blue-200 text-blue-800' : 'bg-green-200 text-green-800'}">${u.role.toUpperCase()}</span>
            </td>
        </tr>
    `).join('');
}

window.openTaskModal = function() {
    document.getElementById('form-task').reset();
    document.getElementById('modal-task').classList.remove('hidden');
};

window.openCallModal = function() {
    document.getElementById('form-call').reset();
    document.getElementById('modal-call').classList.remove('hidden');
};

window.closeModals = function() {
    document.getElementById('modal-task').classList.add('hidden');
    document.getElementById('modal-call').classList.add('hidden');
    document.getElementById('modal-meeting').classList.add('hidden');
};

window.onload = () => {
    hideAllViews();
    const session = localStorage.getItem('session_user');
    if (session) {
        currentUser = JSON.parse(session);
        startApp();
    } else {
        document.getElementById('navbar').classList.add('hidden');
        document.getElementById('view-login').classList.remove('hidden');
    }
};