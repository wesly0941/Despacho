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
    document.getElementById('user-info').innerHTML = `<i class="fas fa-user-circle text-indigo-400 mr-1.5"></i> ${currentUser.name} <span class="bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ml-1 hover:bg-indigo-600">${currentUser.role}</span>`;

    const btnAdmin = document.getElementById('btn-admin-panel');
    if (currentUser.role === 'admin') {
        btnAdmin.classList.remove('hidden');
        btnAdmin.onclick = showAdminPanel;
    } else {
        btnAdmin.classList.add('hidden');
    }

    // CONTROL DE ACCESO: SOLO EL DIRECTOR/ADMIN PUEDE CONVOCAR PERSONAL
    const btnConvocar = document.getElementById('btn-convocar-personal');
    if (currentUser.role === 'director' || currentUser.role === 'admin') {
        btnConvocar.classList.remove('hidden');
    } else {
        btnConvocar.classList.add('hidden');
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

window.showNovedades = async function() {
    hideAllViews();
    document.getElementById('view-novedades').classList.remove('hidden');
    await renderNovedades();
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

// --- DASHBOARD Y TABLA ESTADÍSTICA DE GESTIÓN ---
async function renderDirecciones() {
    const grid = document.getElementById('direcciones-grid');
    const statsTable = document.getElementById('stats-table-body');
    const { data: tasks } = await supabase.from('tasks').select('*');

    const totalGlobal = (tasks || []).length;
    const completadasGlobal = (tasks || []).filter(t => t.status === 'Completado').length;
    const pendientesGlobal = (tasks || []).filter(t => t.status !== 'Completado').length;
    const eficienciaGlobal = totalGlobal > 0 ? Math.round((completadasGlobal / totalGlobal) * 100) : 0;

    // Actualizar Tarjetas Estadísticas Principales
    document.getElementById('stat-total-tasks').innerText = totalGlobal;
    document.getElementById('stat-pending-tasks').innerText = pendientesGlobal;
    document.getElementById('stat-completed-tasks').innerText = completadasGlobal;
    document.getElementById('stat-efficiency-rate').innerText = `${eficienciaGlobal}%`;

    // Renderizar Tarjetas de Direcciones
    grid.innerHTML = direcciones.map((dir, index) => {
        const dirTasks = (tasks || []).filter(t => t.direccion === dir);
        const total = dirTasks.length;
        const completadas = dirTasks.filter(t => t.status === 'Completado').length;
        const enProgreso = dirTasks.filter(t => t.status === 'Pendiente' || t.status === 'En Proceso').length;

        return `
            <div onclick="openDireccion('${dir}')" class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-indigo-500 hover:shadow-md transition flex flex-col justify-between">
                <div>
                    <div class="flex items-center gap-2.5 mb-2">
                        <div class="bg-indigo-50 text-indigo-700 rounded-xl w-7 h-7 flex items-center justify-center font-extrabold text-xs">
                            ${index + 1}
                        </div>
                        <h3 class="text-xs sm:text-sm font-bold text-slate-800 leading-snug">${dir}</h3>
                    </div>
                </div>
                <div class="grid grid-cols-3 gap-1.5 mt-3 pt-2.5 border-t border-slate-100 text-center text-[11px]">
                    <div class="bg-slate-50 p-1.5 rounded-xl">
                        <span class="block text-slate-400 font-semibold">Total</span>
                        <span class="text-xs font-bold text-slate-800">${total}</span>
                    </div>
                    <div class="bg-amber-50 p-1.5 rounded-xl">
                        <span class="block text-amber-700 font-semibold">Pendientes</span>
                        <span class="text-xs font-bold text-amber-800">${enProgreso}</span>
                    </div>
                    <div class="bg-emerald-50 p-1.5 rounded-xl">
                        <span class="block text-emerald-700 font-semibold">Listas</span>
                        <span class="text-xs font-bold text-emerald-800">${completadas}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Renderizar Tabla Estadística Detallada
    statsTable.innerHTML = direcciones.map(dir => {
        const dirTasks = (tasks || []).filter(t => t.direccion === dir);
        const total = dirTasks.length;
        const pendientes = dirTasks.filter(t => t.status === 'Pendiente').length;
        const enProceso = dirTasks.filter(t => t.status === 'En Proceso').length;
        const completadas = dirTasks.filter(t => t.status === 'Completado').length;
        const ratio = total > 0 ? Math.round((completadas / total) * 100) : 0;

        return `
            <tr class="hover:bg-slate-50">
                <td class="px-4 py-3 font-semibold text-slate-800 text-xs">${dir}</td>
                <td class="px-4 py-3 text-center font-bold text-slate-700 text-xs">${total}</td>
                <td class="px-4 py-3 text-center text-rose-600 font-bold text-xs">${pendientes}</td>
                <td class="px-4 py-3 text-center text-amber-600 font-bold text-xs">${enProceso}</td>
                <td class="px-4 py-3 text-center text-emerald-600 font-bold text-xs">${completadas}</td>
                <td class="px-4 py-3 text-center font-bold text-xs">
                    <span class="px-2 py-0.5 rounded-full ${ratio >= 75 ? 'bg-emerald-100 text-emerald-800' : ratio >= 40 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}">${ratio}%</span>
                </td>
            </tr>
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
        tbody.innerHTML = `<tr><td colspan="4" class="px-4 py-4 text-center text-slate-400">No hay tareas registradas en esta dirección.</td></tr>`;
        return;
    }

    tbody.innerHTML = tasks.map(t => {
        let statusColor = t.status === 'Pendiente' ? 'bg-rose-100 text-rose-800' : 
                          t.status === 'En Proceso' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800';
        
        const historyArr = t.history || [];
        const lastUpdate = historyArr.length > 0 ? historyArr[historyArr.length - 1] : null;
        const lastNoteText = lastUpdate ? lastUpdate.note : 'Sin avances';

        return `
        <tr class="hover:bg-slate-50">
            <td class="px-4 py-3 text-xs sm:text-sm text-slate-900">
                <div class="w-48 sm:w-56 font-semibold break-words">${t.description}</div>
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-xs text-slate-800">
                <div><i class="fas fa-user text-slate-400 mr-1"></i>${t.assigned_to_name}</div>
                <div class="text-[11px] text-slate-400 mt-0.5"><i class="far fa-calendar-alt mr-1"></i>Límite: ${t.due_date}</div>
            </td>
            <td class="px-4 py-3 text-xs text-slate-700">
                <div class="text-[11px] bg-slate-50 p-1.5 rounded-lg border border-slate-200 mb-1 max-w-xs truncate">
                    <b>Último avance:</b> ${lastNoteText}
                </div>
                <button onclick="openTaskHistory('${t.id}')" class="text-xs text-indigo-600 hover:text-indigo-800 font-bold underline">
                    <i class="fas fa-comments mr-1"></i> Bitácora (${historyArr.length})
                </button>
            </td>
            <td class="px-4 py-3 text-xs">
                <select onchange="updateTaskStatus('${t.id}', this.value)" class="${statusColor} rounded-lg px-2 py-1 text-xs font-bold border-none outline-none cursor-pointer mb-1">
                    <option value="Pendiente" ${t.status === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
                    <option value="En Proceso" ${t.status === 'En Proceso' ? 'selected' : ''}>En Proceso</option>
                    <option value="Completado" ${t.status === 'Completado' ? 'selected' : ''}>Completado</option>
                </select>
                <div class="text-[10px] text-slate-400">
                    <b>Auditoría:</b> ${t.last_modified_by}
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

    await supabase.from('notifications').insert([{
        id: 'notif_' + Date.now(),
        to_id: selectResp.value,
        from_name: currentUser.name,
        title: `Nueva Tarea Asignada`,
        message: `${currentUser.name} asignó: "${newTask.description}"`,
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
        <div class="text-left bg-slate-50 p-2.5 rounded-xl mb-2 border-l-4 border-indigo-600 text-xs">
            <div class="flex justify-between text-[11px] text-slate-400 mb-1">
                <span class="font-bold text-slate-800"><i class="fas fa-user text-slate-400 mr-1"></i>${h.user}</span>
                <span>${h.timestamp}</span>
            </div>
            <p class="text-xs text-slate-700 leading-relaxed">${h.note}</p>
        </div>
    `).join('');

    Swal.fire({
        title: 'Historial y Bitácora',
        html: `
            <div class="text-left text-xs mb-2 font-semibold text-slate-500 truncate">Tarea: ${task.description}</div>
            <div class="max-h-48 overflow-y-auto mb-3 p-2 bg-slate-100 rounded-xl border border-slate-200">${historyHtml || '<div class="text-center text-slate-400 text-xs">Sin registros.</div>'}</div>
            <div class="text-left">
                <label class="block text-xs font-bold text-slate-700 mb-1">Nuevo Avance:</label>
                <textarea id="swal-advance-note" class="w-full border border-slate-300 rounded-xl p-2 text-xs" rows="3" placeholder="Escriba el detalle del avance..."></textarea>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Guardar Avance',
        confirmButtonColor: '#4f46e5',
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

            await supabase.from('notifications').insert([{
                id: 'notif_' + Date.now(),
                to_id: null,
                from_name: currentUser.name,
                title: `Nuevo Avance en ${task.direccion}`,
                message: `${currentUser.name} comentó en "${task.description.substring(0, 30)}...": ${result.value}`,
                task_id: taskId,
                read: false
            }]);

            await renderTasks();
            Swal.fire('Registrado', 'Avance guardado.', 'success');
        }
    });
};

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

    await supabase.from('notifications').insert([{
        id: 'notif_' + Date.now(),
        to_id: null,
        from_name: currentUser.name,
        title: `Estatus Actualizado en ${task.direccion}`,
        message: `${currentUser.name} cambió "${task.description.substring(0, 30)}..." de "${oldStatus}" a "${newStatus}".`,
        task_id: taskId,
        read: false
    }]);

    await renderTasks();
};

// --- NOVEDADES UNIFICADAS ---
async function renderNovedades() {
    // 1. Estatus Recientes
    const { data: notifs } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    const estatusContainer = document.getElementById('novedades-estatus-container');
    if (!notifs || notifs.length === 0) {
        estatusContainer.innerHTML = `<div class="p-4 text-center text-slate-400 text-xs">Sin cambios recientes.</div>`;
    } else {
        estatusContainer.innerHTML = notifs.map(n => `
            <div class="p-3 ${n.read ? 'bg-white' : 'bg-indigo-50/50'} hover:bg-slate-50 flex justify-between items-start transition text-xs">
                <div class="space-y-0.5">
                    <div class="flex items-center gap-2">
                        <span class="font-bold text-slate-900">${n.title}</span>
                        ${!n.read ? '<span class="bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full">Sin Revisar</span>' : ''}
                    </div>
                    <p class="text-slate-700">${n.message}</p>
                    <div class="text-[10px] text-slate-400"><i class="fas fa-user mr-1"></i>${n.from_name} • ${new Date(n.created_at).toLocaleString()}</div>
                </div>
                ${n.task_id ? `<button onclick="openTaskHistory('${n.task_id}')" class="bg-slate-900 text-white text-[11px] px-2.5 py-1 rounded-lg hover:bg-slate-800"><i class="fas fa-eye mr-1"></i>Ver</button>` : ''}
            </div>
        `).join('');
    }

    // 2. Tareas Próximas a la Fecha Límite
    const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .neq('status', 'Completado');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tareasProximas = (tasks || []).map(t => {
        const dueDate = new Date(t.due_date + 'T00:00:00');
        const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        return { ...t, diffDays };
    }).sort((a, b) => a.diffDays - b.diffDays);

    const tareasContainer = document.getElementById('novedades-proximas-tareas-container');
    if (tareasProximas.length === 0) {
        tareasContainer.innerHTML = `<div class="p-4 text-center text-slate-400 text-xs">No hay tareas pendientes.</div>`;
    } else {
        tareasContainer.innerHTML = tareasProximas.map(t => {
            let badgeColor = "bg-slate-100 text-slate-700";
            let badgeText = `Vence en ${t.diffDays} días`;

            if (t.diffDays < 0) {
                badgeColor = "bg-rose-100 text-rose-800 font-bold";
                badgeText = `Vencida (${Math.abs(t.diffDays)} días de retraso)`;
            } else if (t.diffDays === 0) {
                badgeColor = "bg-amber-100 text-amber-800 font-bold";
                badgeText = "Vence Hoy";
            } else if (t.diffDays <= 3) {
                badgeColor = "bg-amber-50 text-amber-700 font-bold";
                badgeText = `Urgente (${t.diffDays} días)`;
            }

            return `
                <div class="p-3 bg-white hover:bg-slate-50 flex justify-between items-center text-xs">
                    <div>
                        <span class="font-bold text-slate-800 block text-sm mb-0.5">${t.description}</span>
                        <span class="text-slate-400 text-[11px]"><i class="fas fa-building text-indigo-600 mr-1"></i>${t.direccion} • <i class="fas fa-user text-slate-400 mr-1"></i>${t.assigned_to_name}</span>
                    </div>
                    <div class="text-right flex flex-col items-end gap-1">
                        <span class="px-2 py-0.5 rounded-full text-[10px] ${badgeColor}">${badgeText}</span>
                        <span class="text-[10px] text-slate-400"><i class="far fa-calendar-alt mr-1"></i>Límite: ${t.due_date}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    // 3. Agenda de Reuniones
    const { data: meetings } = await supabase.from('meetings').select('*');

    const reunionesOrdenadas = (meetings || []).sort((a, b) => {
        return new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`);
    });

    const reunionesContainer = document.getElementById('novedades-reuniones-container');
    if (reunionesOrdenadas.length === 0) {
        reunionesContainer.innerHTML = `<div class="p-4 text-center text-slate-400 text-xs">No hay reuniones agendadas.</div>`;
    } else {
        reunionesContainer.innerHTML = reunionesOrdenadas.map(m => {
            const dirsBadges = (m.direcciones || []).map(d => `<span class="bg-indigo-50 text-indigo-700 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-indigo-100 mr-1">${d}</span>`).join('');
            
            return `
                <div class="p-3 bg-white hover:bg-slate-50 flex justify-between items-start text-xs">
                    <div>
                        <div class="font-bold text-slate-800 text-sm mb-1">${m.title}</div>
                        <div class="text-slate-600 mb-1"><b>Orden del día:</b> ${m.agenda}</div>
                        ${m.requirements ? `<div class="text-[11px] text-amber-900 bg-amber-50 p-1.5 rounded-lg border border-amber-200 mb-1"><b>Insumos Requeridos:</b> ${m.requirements}</div>` : ''}
                        <div class="flex flex-wrap gap-1 mt-1">${dirsBadges}</div>
                    </div>
                    <div class="text-right whitespace-nowrap ml-3">
                        <div class="font-bold text-indigo-600"><i class="far fa-calendar mr-1"></i>${m.date}</div>
                        <div class="text-slate-400 text-[11px]"><i class="far fa-clock mr-1"></i>${m.time}</div>
                        <span class="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${m.status === 'Programada' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'}">${m.status}</span>
                    </div>
                </div>
            `;
        }).join('');
    }
}

window.markAllNovedadesRead = async function() {
    await supabase.from('notifications').update({ read: true }).neq('read', true);
    await renderNovedades();
    await fetchNotifications();
    Swal.fire('Completado', 'Novedades marcadas como revisadas.', 'success');
};

// --- AGENDA DE REUNIONES ---
async function renderMeetings() {
    const { data: meetings } = await supabase.from('meetings').select('*');
    const tbody = document.getElementById('meetings-tbody');

    if (!meetings || meetings.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="px-4 py-4 text-center text-slate-400">No hay reuniones agendadas.</td></tr>`;
        return;
    }

    tbody.innerHTML = meetings.map(m => {
        let statusBadge = m.status === 'Programada' ? 'bg-indigo-100 text-indigo-800' :
                          m.status === 'Realizada' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800';

        const dirsBadges = (m.direcciones || []).map(d => 
            `<span class="inline-block bg-indigo-50 text-indigo-700 text-[10px] font-semibold px-2 py-0.5 rounded-full mr-1 mb-1 border border-indigo-100">${d}</span>`
        ).join('');

        const reqsHtml = m.requirements ? 
            `<div class="text-[11px] text-amber-900 bg-amber-50 p-1.5 rounded-lg border border-amber-200 mt-1">
                <b>Requerido:</b> ${m.requirements}
             </div>` : '';

        return `
            <tr class="hover:bg-slate-50">
                <td class="px-4 py-3 whitespace-nowrap text-xs font-bold text-slate-900">
                    <div><i class="far fa-calendar text-indigo-600 mr-1"></i>${m.date}</div>
                    <div class="text-[11px] text-slate-400 font-normal"><i class="far fa-clock mr-1"></i>${m.time}</div>
                </td>
                <td class="px-4 py-3 text-xs text-slate-800">
                    <div class="font-bold text-sm text-slate-900">${m.title}</div>
                    <div class="text-[11px] text-slate-500 mt-0.5 max-w-xs"><b>Orden del día:</b> ${m.agenda}</div>
                    ${reqsHtml}
                </td>
                <td class="px-4 py-3 text-xs text-slate-800">
                    <div class="max-w-xs flex flex-wrap mb-1">${dirsBadges}</div>
                    <div class="text-[10px] text-slate-400">Por: ${m.created_by}</div>
                </td>
                <td class="px-4 py-3 text-xs">
                    <select onchange="updateMeetingStatus('${m.id}', this.value)" class="${statusBadge} rounded-lg px-2 py-1 text-xs font-bold border-none outline-none cursor-pointer mb-1">
                        <option value="Programada" ${m.status === 'Programada' ? 'selected' : ''}>Programada</option>
                        <option value="Realizada" ${m.status === 'Realizada' ? 'selected' : ''}>Realizada</option>
                        <option value="Cancelada" ${m.status === 'Cancelada' ? 'selected' : ''}>Cancelada</option>
                    </select>
                    <br>
                    <button onclick="openMeetingDetails('${m.id}')" class="text-xs text-indigo-600 font-bold underline">
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
        <label class="flex items-center gap-1.5 cursor-pointer hover:bg-slate-100 p-1.5 rounded-lg transition">
            <input type="checkbox" name="meet_dir_check" value="${d}" class="rounded text-indigo-600">
            <span class="truncate text-slate-700">${d}</span>
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
            <div class="text-left text-xs mb-1 font-bold text-slate-800">Asunto: ${meeting.title}</div>
            <div class="text-left text-xs mb-3 text-slate-600">Orden del día: ${meeting.agenda}</div>
            <div class="text-left">
                <label class="block text-xs font-bold text-slate-700 mb-1">Acuerdos / Minuta:</label>
                <textarea id="swal-minuta" class="w-full border border-slate-300 rounded-xl p-2 text-xs" rows="4">${meeting.minuta || ''}</textarea>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Guardar Minuta',
        confirmButtonColor: '#4f46e5'
    }).then(async (result) => {
        if (result.isConfirmed) {
            const minuta = document.getElementById('swal-minuta').value;
            await supabase.from('meetings').update({ minuta }).eq('id', meetId);
            await renderMeetings();
            Swal.fire('Guardado', 'Minuta actualizada.', 'success');
        }
    });
};

// --- NOTIFICACIONES EN TIEMPO REAL ---
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
    const novBadge = document.getElementById('novedades-badge');

    if (unread.length > 0) {
        if (novBadge) {
            novBadge.innerText = unread.length;
            novBadge.classList.remove('hidden');
        }
    } else {
        if (novBadge) novBadge.classList.add('hidden');
    }
}

// --- AUXILIARES Y GESTIÓN DE USUARIOS ---
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
        <tr class="hover:bg-slate-50">
            <td class="px-4 py-3 text-xs font-medium text-slate-900">${u.name}</td>
            <td class="px-4 py-3 text-xs text-slate-500">${u.email}</td>
            <td class="px-4 py-3 text-xs text-slate-500">
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${u.role === 'admin' ? 'bg-amber-100 text-amber-800' : u.role === 'director' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'}">${u.role.toUpperCase()}</span>
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