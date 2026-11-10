// --- BASE DE DATOS LOCAL (localStorage) ---
const ADMIN_EMAIL = 'vielmawesly@gmail.com';
const ADMIN_PASS = '0941';

if (!localStorage.getItem('db_users')) {
    const initialUsers = [{
        id: 'admin_001',
        name: 'Administrador Principal',
        email: ADMIN_EMAIL,
        password: ADMIN_PASS,
        role: 'admin'
    }];
    localStorage.setItem('db_users', JSON.stringify(initialUsers));
    localStorage.setItem('db_tasks', JSON.stringify([]));
    localStorage.setItem('db_calls', JSON.stringify([]));
    localStorage.setItem('db_meetings', JSON.stringify([]));
}

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
let notifInterval;

// --- AUTENTICACIÓN ---
document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-password').value.trim();
    
    const users = JSON.parse(localStorage.getItem('db_users'));
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === pass);

    if (user) {
        currentUser = user;
        localStorage.setItem('session_user', JSON.stringify(user));
        startApp();
    } else {
        Swal.fire('Error', 'Credenciales incorrectas.', 'error');
    }
});

function logout() {
    currentUser = null;
    localStorage.removeItem('session_user');
    clearInterval(notifInterval);
    hideAllViews();
    document.getElementById('navbar').classList.add('hidden');
    document.getElementById('view-login').classList.remove('hidden');
    document.getElementById('login-form').reset();
}

function startApp() {
    hideAllViews();
    document.getElementById('navbar').classList.remove('hidden');
    document.getElementById('user-info').innerHTML = `<i class="fas fa-user mr-1"></i> ${currentUser.name} <span class="bg-blue-700 px-2 py-0.5 rounded text-xs ml-1">${currentUser.role.toUpperCase()}</span>`;
    
    const btnAdmin = document.getElementById('btn-admin-panel');
    if (currentUser.role === 'admin') {
        btnAdmin.classList.remove('hidden');
        btnAdmin.onclick = showAdminPanel;
    } else {
        btnAdmin.classList.add('hidden');
    }

    renderDirecciones();
    showDashboard();
    startNotificationListener();
}

// --- VISTAS Y NAVEGACIÓN ---
function hideAllViews() {
    document.getElementById('view-login').classList.add('hidden');
    document.getElementById('view-admin').classList.add('hidden');
    document.getElementById('view-dashboard').classList.add('hidden');
    document.getElementById('view-agenda').classList.add('hidden');
    document.getElementById('view-tasks').classList.add('hidden');
    closeModals();
}

function showDashboard() {
    hideAllViews();
    renderDirecciones();
    document.getElementById('view-dashboard').classList.remove('hidden');
}

function showAgenda() {
    hideAllViews();
    renderMeetings();
    document.getElementById('view-agenda').classList.remove('hidden');
}

function showAdminPanel() {
    hideAllViews();
    document.getElementById('view-admin').classList.remove('hidden');
    renderUsersTable();
}

// --- MÓDULO DE AGENDA Y REUNIONES MULTIDIRECCIONALES ---
function renderMeetings() {
    const meetings = JSON.parse(localStorage.getItem('db_meetings')) || [];
    const tbody = document.getElementById('meetings-tbody');

    if (meetings.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="px-6 py-4 text-center text-gray-500">No hay reuniones agendadas.</td></tr>`;
        return;
    }

    tbody.innerHTML = meetings.sort((a,b) => new Date(a.date + ' ' + a.time) - new Date(b.date + ' ' + b.time)).map(m => {
        let statusBadge = m.status === 'Programada' ? 'bg-purple-100 text-purple-800' :
                          m.status === 'Realizada' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';

        // Renderizar múltiples direcciones convocadas
        const dirsBadges = (m.direcciones || [m.direccion || 'Sin Dirección']).map(d => 
            `<span class="inline-block bg-purple-100 text-purple-800 text-[10px] font-semibold px-2 py-0.5 rounded mr-1 mb-1 border border-purple-200">${d}</span>`
        ).join('');

        // Requerimientos/Insumos previos
        const reqsHtml = m.requirements ? 
            `<div class="text-xs text-amber-900 bg-amber-50 p-2 rounded border border-amber-200 mt-2">
                <b><i class="fas fa-folder-open mr-1"></i>Requerido previa reunión:</b> ${m.requirements}
             </div>` : '';

        return `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                    <div><i class="far fa-calendar text-purple-700 mr-1"></i>${m.date}</div>
                    <div class="text-xs text-gray-500 font-normal"><i class="far fa-clock mr-1"></i>${m.time}</div>
                </td>
                <td class="px-6 py-4 text-sm text-gray-900">
                    <div class="font-bold text-base text-gray-800">${m.title}</div>
                    <div class="text-xs text-gray-600 mt-1 max-w-sm"><b>Orden del día:</b> ${m.agenda}</div>
                    ${reqsHtml}
                </td>
                <td class="px-6 py-4 text-sm text-gray-900">
                    <div class="max-w-xs flex flex-wrap mb-1">${dirsBadges}</div>
                    <div class="text-[11px] text-gray-400">Agendado por: ${m.createdBy}</div>
                </td>
                <td class="px-6 py-4 text-sm">
                    <select onchange="updateMeetingStatus('${m.id}', this.value)" class="${statusBadge} rounded px-2 py-1 text-xs font-bold border-none outline-none cursor-pointer mb-2">
                        <option value="Programada" ${m.status === 'Programada' ? 'selected' : ''}>Programada</option>
                        <option value="Realizada" ${m.status === 'Realizada' ? 'selected' : ''}>Realizada</option>
                        <option value="Cancelada" ${m.status === 'Cancelada' ? 'selected' : ''}>Cancelada</option>
                    </select>
                    <br>
                    <button onclick="openMeetingDetails('${m.id}')" class="text-xs text-purple-800 font-bold underline mt-1">
                        <i class="fas fa-file-alt mr-1"></i> Ver/Añadir Minuta
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function openMeetingModal() {
    document.getElementById('form-meeting').reset();
    
    // Renderizar lista de direcciones con checkboxes
    const container = document.getElementById('meet-dirs-container');
    container.innerHTML = direcciones.map(d => `
        <label class="flex items-center gap-1.5 cursor-pointer hover:bg-gray-100 p-1 rounded">
            <input type="checkbox" name="meet_dir_check" value="${d}" class="rounded text-purple-700 focus:ring-purple-500">
            <span class="truncate">${d}</span>
        </label>
    `).join('');

    document.getElementById('modal-meeting').classList.remove('hidden');
}

document.getElementById('form-meeting').addEventListener('submit', (e) => {
    e.preventDefault();

    const selectedDirs = Array.from(document.querySelectorAll('input[name="meet_dir_check"]:checked')).map(cb => cb.value);

    if (selectedDirs.length === 0) {
        Swal.fire('Atención', 'Debe seleccionar al menos una dirección convocada.', 'warning');
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
        createdBy: currentUser.name,
        minuta: ''
    };

    const meetings = JSON.parse(localStorage.getItem('db_meetings')) || [];
    meetings.push(newMeeting);
    localStorage.setItem('db_meetings', JSON.stringify(meetings));

    closeModals();
    renderMeetings();
    Swal.fire('Agendada', 'La reunión se registró correctamente en la agenda.', 'success');
});

window.updateMeetingStatus = function(meetId, status) {
    const meetings = JSON.parse(localStorage.getItem('db_meetings')) || [];
    const idx = meetings.findIndex(m => m.id === meetId);
    if (idx > -1) {
        meetings[idx].status = status;
        localStorage.setItem('db_meetings', JSON.stringify(meetings));
        renderMeetings();
    }
};

window.openMeetingDetails = function(meetId) {
    const meetings = JSON.parse(localStorage.getItem('db_meetings')) || [];
    const meeting = meetings.find(m => m.id === meetId);
    if (!meeting) return;

    const dirsText = (meeting.direcciones || [meeting.direccion]).join(', ');

    Swal.fire({
        title: 'Minuta y Acuerdos de la Reunión',
        html: `
            <div class="text-left text-xs mb-1"><b>Asunto:</b> ${meeting.title}</div>
            <div class="text-left text-xs mb-1"><b>Convocados:</b> ${dirsText}</div>
            <div class="text-left text-xs mb-2"><b>Requerimientos:</b> ${meeting.requirements || 'Sin requerimientos'}</div>
            <div class="text-left text-xs mb-3"><b>Orden del Día:</b> ${meeting.agenda}</div>
            <div class="text-left">
                <label class="block text-xs font-bold text-gray-700 mb-1">Acuerdos / Minuta:</label>
                <textarea id="swal-minuta" class="w-full border rounded p-2 text-sm" rows="4" placeholder="Escriba las conclusiones y compromisos alcanzados...">${meeting.minuta || ''}</textarea>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Guardar Minuta',
        confirmButtonColor: '#6b21a8',
        cancelButtonText: 'Cerrar'
    }).then((result) => {
        if (result.isConfirmed) {
            meeting.minuta = document.getElementById('swal-minuta').value;
            localStorage.setItem('db_meetings', JSON.stringify(meetings));
            renderMeetings();
            Swal.fire('Guardado', 'Minuta actualizada.', 'success');
        }
    });
};

// --- ADMINISTRACIÓN DE USUARIOS ---
document.getElementById('register-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim().toLowerCase();
    const password = document.getElementById('reg-password').value.trim();
    const role = document.getElementById('reg-role').value;

    let users = JSON.parse(localStorage.getItem('db_users'));
    if (users.find(u => u.email === email)) {
        Swal.fire('Error', 'Este correo ya está registrado.', 'error');
        return;
    }

    users.push({ id: 'usr_' + Date.now(), name, email, password, role });
    localStorage.setItem('db_users', JSON.stringify(users));
    Swal.fire('Éxito', `Usuario ${name} creado como ${role.toUpperCase()}`, 'success');
    document.getElementById('register-form').reset();
    renderUsersTable();
});

function renderUsersTable() {
    const users = JSON.parse(localStorage.getItem('db_users'));
    const tbody = document.getElementById('users-table-body');
    tbody.innerHTML = users.map(u => `
        <tr>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${u.name}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${u.email}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <span class="px-2 py-1 rounded text-xs font-bold ${u.role === 'admin' ? 'bg-yellow-200 text-yellow-800' : u.role === 'director' ? 'bg-blue-200 text-blue-800' : 'bg-green-200 text-green-800'}">${u.role.toUpperCase()}</span>
            </td>
        </tr>
    `).join('');
}

// --- DIRECCIONES Y TAREAS ---
function renderDirecciones() {
    const grid = document.getElementById('direcciones-grid');
    const tasks = JSON.parse(localStorage.getItem('db_tasks')) || [];

    grid.innerHTML = direcciones.map((dir, index) => {
        const dirTasks = tasks.filter(t => t.direccion === dir);
        const total = dirTasks.length;
        const completadas = dirTasks.filter(t => t.status === 'Completado').length;
        const enProgreso = dirTasks.filter(t => t.status === 'Pendiente' || t.status === 'En Proceso').length;

        return `
            <div onclick="openDireccion('${dir}')" class="bg-white p-5 rounded-lg shadow border-l-4 border-blue-900 cursor-pointer hover:shadow-lg transition flex flex-col justify-between">
                <div>
                    <div class="flex items-center gap-3 mb-3">
                        <div class="bg-blue-100 text-blue-900 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                            ${index + 1}
                        </div>
                        <h3 class="text-sm font-bold text-gray-800 leading-tight">${dir}</h3>
                    </div>
                </div>
                <div class="grid grid-cols-3 gap-2 mt-2 pt-3 border-t text-center text-xs">
                    <div class="bg-gray-50 p-2 rounded">
                        <span class="block text-gray-500 font-medium">Total</span>
                        <span class="text-sm font-bold text-gray-800">${total}</span>
                    </div>
                    <div class="bg-yellow-50 p-2 rounded">
                        <span class="block text-yellow-700 font-medium">Pendientes</span>
                        <span class="text-sm font-bold text-yellow-800">${enProgreso}</span>
                    </div>
                    <div class="bg-green-50 p-2 rounded">
                        <span class="block text-green-700 font-medium">Listas</span>
                        <span class="text-sm font-bold text-green-800">${completadas}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function openDireccion(dirName) {
    currentDireccion = dirName;
    document.getElementById('current-dir-title').innerText = dirName;
    hideAllViews();
    document.getElementById('view-tasks').classList.remove('hidden');
    renderTasks();
    populateUserSelects();
}

function renderTasks() {
    const tasks = JSON.parse(localStorage.getItem('db_tasks')).filter(t => t.direccion === currentDireccion);
    const tbody = document.getElementById('tasks-tbody');
    
    if(tasks.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="px-6 py-4 text-center text-gray-500">No hay tareas registradas en esta dirección.</td></tr>`;
        return;
    }

    tbody.innerHTML = tasks.sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate)).map(t => {
        let statusColor = t.status === 'Pendiente' ? 'bg-red-100 text-red-800' : 
                          t.status === 'En Proceso' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800';
        
        const lastUpdate = (t.history && t.history.length > 0) ? t.history[t.history.length - 1] : null;
        const lastNoteText = lastUpdate ? lastUpdate.note : 'Sin avances registrados';
        const historyCount = t.history ? t.history.length : 0;

        return `
        <tr>
            <td class="px-6 py-4 text-sm text-gray-900">
                <div class="w-56 font-semibold break-words">${t.description}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                <div><i class="fas fa-user-circle text-gray-400 mr-1"></i>${t.assignedToName}</div>
                <div class="text-xs text-gray-500 mt-1"><i class="far fa-calendar-alt text-gray-400 mr-1"></i>Límite: ${t.dueDate}</div>
            </td>
            <td class="px-6 py-4 text-sm text-gray-700">
                <div class="text-xs bg-gray-50 p-2 rounded border mb-1 max-w-xs truncate">
                    <b>Último avance:</b> ${lastNoteText}
                </div>
                <button onclick="openTaskHistory('${t.id}')" class="text-xs text-blue-700 hover:text-blue-900 font-bold underline">
                    <i class="fas fa-history mr-1"></i> Ver/Añadir Bitácora (${historyCount})
                </button>
            </td>
            <td class="px-6 py-4 text-sm">
                <select onchange="updateTaskStatus('${t.id}', this.value)" class="${statusColor} rounded px-2 py-1 text-xs font-bold border-none outline-none cursor-pointer mb-2">
                    <option value="Pendiente" ${t.status === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
                    <option value="En Proceso" ${t.status === 'En Proceso' ? 'selected' : ''}>En Proceso</option>
                    <option value="Completado" ${t.status === 'Completado' ? 'selected' : ''}>Completado</option>
                </select>
                <div class="text-xs text-gray-500 mt-1">
                    <b>Última mod.:</b><br>${t.lastModifiedBy}
                </div>
            </td>
        </tr>
    `}).join('');
}

document.getElementById('form-task').addEventListener('submit', (e) => {
    e.preventDefault();
    const selectResp = document.getElementById('task-resp');
    
    const newTask = {
        id: 'tsk_' + Date.now(),
        direccion: currentDireccion,
        description: document.getElementById('task-desc').value,
        assignedToId: selectResp.value,
        assignedToName: selectResp.options[selectResp.selectedIndex].text,
        dueDate: document.getElementById('task-date').value,
        status: 'Pendiente',
        lastModifiedBy: currentUser.name,
        createdAt: new Date().toLocaleDateString(),
        history: [{
            timestamp: new Date().toLocaleString(),
            user: currentUser.name,
            note: 'Tarea creada en el sistema.',
            status: 'Pendiente'
        }]
    };

    const tasks = JSON.parse(localStorage.getItem('db_tasks'));
    tasks.push(newTask);
    localStorage.setItem('db_tasks', JSON.stringify(tasks));
    
    closeModals();
    renderTasks();
    renderDirecciones();
    Swal.fire('Guardado', 'Tarea asignada correctamente.', 'success');
});

window.openTaskHistory = function(taskId) {
    const tasks = JSON.parse(localStorage.getItem('db_tasks'));
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const historyHtml = (task.history || []).map(h => `
        <div class="text-left bg-gray-50 p-3 rounded mb-2 border-l-4 border-blue-800 shadow-sm">
            <div class="flex justify-between text-xs text-gray-500 mb-1">
                <span class="font-bold text-blue-900"><i class="fas fa-user text-gray-400 mr-1"></i>${h.user}</span>
                <span>${h.timestamp}</span>
            </div>
            <p class="text-sm text-gray-800 leading-snug">${h.note}</p>
        </div>
    `).join('');

    Swal.fire({
        title: 'Historial y Avances',
        html: `
            <div class="text-left text-xs mb-3 font-semibold text-gray-600">Tarea: ${task.description}</div>
            <div class="max-h-56 overflow-y-auto mb-4 p-2 bg-gray-100 rounded border">
                ${historyHtml || '<p class="text-xs text-gray-400 text-center">Sin registros previos.</p>'}
            </div>
            <div class="text-left">
                <label class="block text-xs font-bold text-gray-700 mb-1">Agregar Nuevo Avance:</label>
                <textarea id="swal-advance-note" class="w-full border rounded p-2 text-sm focus:ring-blue-500 focus:border-blue-500" rows="3" placeholder="Escriba los avances detallados de esta tarea..."></textarea>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Guardar Avance',
        cancelButtonText: 'Cerrar',
        confirmButtonColor: '#1e3a8a',
        preConfirm: () => {
            const note = document.getElementById('swal-advance-note').value.trim();
            if (!note) {
                Swal.showValidationMessage('Debe ingresar un comentario para registrar el avance.');
                return false;
            }
            return note;
        }
    }).then((result) => {
        if (result.isConfirmed) {
            const taskIndex = tasks.findIndex(t => t.id === taskId);
            if (taskIndex > -1) {
                if (!tasks[taskIndex].history) tasks[taskIndex].history = [];
                tasks[taskIndex].history.push({
                    timestamp: new Date().toLocaleString(),
                    user: currentUser.name,
                    note: result.value,
                    status: tasks[taskIndex].status
                });
                tasks[taskIndex].lastModifiedBy = currentUser.name;
                localStorage.setItem('db_tasks', JSON.stringify(tasks));
                renderTasks();
                Swal.fire('Registrado', 'El avance se guardó en la bitácora.', 'success');
            }
        }
    });
};

window.updateTaskStatus = function(taskId, newStatus) {
    const tasks = JSON.parse(localStorage.getItem('db_tasks'));
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    
    if(taskIndex > -1) {
        const oldStatus = tasks[taskIndex].status;
        tasks[taskIndex].status = newStatus;
        tasks[taskIndex].lastModifiedBy = currentUser.name;

        if (!tasks[taskIndex].history) tasks[taskIndex].history = [];
        tasks[taskIndex].history.push({
            timestamp: new Date().toLocaleString(),
            user: currentUser.name,
            note: `Cambio de estado: de "${oldStatus}" a "${newStatus}".`,
            status: newStatus
        });

        localStorage.setItem('db_tasks', JSON.stringify(tasks));
        renderTasks();
        renderDirecciones();
    }
};

// --- LLAMADAS Y NOTIFICACIONES EN TIEMPO REAL ---
function populateUserSelects() {
    const users = JSON.parse(localStorage.getItem('db_users')).filter(u => u.id !== currentUser.id && u.role !== 'admin');
    const options = users.map(u => `<option value="${u.id}">${u.name} (${u.role})</option>`).join('');
    document.getElementById('task-resp').innerHTML = options;
    document.getElementById('call-to').innerHTML = options;
}

document.getElementById('form-call').addEventListener('submit', (e) => {
    e.preventDefault();
    const selectTo = document.getElementById('call-to');
    
    const newCall = {
        id: 'call_' + Date.now(),
        fromId: currentUser.id,
        fromName: currentUser.name,
        toId: selectTo.value,
        toName: selectTo.options[selectTo.selectedIndex].text,
        message: document.getElementById('call-msg').value,
        direccionContext: currentDireccion,
        timestamp: new Date().toLocaleString(),
        read: false
    };

    const calls = JSON.parse(localStorage.getItem('db_calls'));
    calls.push(newCall);
    localStorage.setItem('db_calls', JSON.stringify(calls));

    closeModals();
    Swal.fire('Enviado', `Se ha notificado a ${newCall.toName}.`, 'success');
});

function startNotificationListener() {
    clearInterval(notifInterval);
    notifInterval = setInterval(() => {
        if(!currentUser) return;
        
        const calls = JSON.parse(localStorage.getItem('db_calls'));
        const myUnread = calls.filter(c => c.toId === currentUser.id && !c.read);
        
        const badge = document.getElementById('notif-badge');
        if (myUnread.length > 0) {
            badge.innerText = myUnread.length;
            badge.classList.remove('hidden');
            
            const lastCall = myUnread[myUnread.length - 1];
            const callTime = parseInt(lastCall.id.split('_')[1]);
            if (Date.now() - callTime < 3000) {
                Swal.fire({
                    title: '¡Llamado del Director!',
                    text: `${lastCall.fromName} te solicita: "${lastCall.message}"`,
                    icon: 'warning',
                    confirmButtonText: 'Entendido'
                });
            }
        } else {
            badge.classList.add('hidden');
        }

        renderNotifList(calls.filter(c => c.toId === currentUser.id).reverse());
    }, 2000);
}

function renderNotifList(myCalls) {
    const list = document.getElementById('notif-list');
    if (myCalls.length === 0) {
        list.innerHTML = `<div class="p-2 text-gray-500 text-center">Sin notificaciones</div>`;
        return;
    }

    list.innerHTML = myCalls.map(c => `
        <div class="p-2 border-b ${c.read ? 'bg-white text-gray-500' : 'bg-orange-50 text-gray-900 font-medium cursor-pointer'} hover:bg-gray-100" onclick="markAsRead('${c.id}')">
            <div class="text-xs text-blue-800 mb-1"><i class="fas fa-user"></i> ${c.fromName}</div>
            <div class="text-sm">${c.message}</div>
            <div class="text-[10px] text-gray-400 mt-1">${c.timestamp}</div>
        </div>
    `).join('');
}

window.markAsRead = function(callId) {
    const calls = JSON.parse(localStorage.getItem('db_calls'));
    const callIndex = calls.findIndex(c => c.id === callId);
    if(callIndex > -1) {
        calls[callIndex].read = true;
        localStorage.setItem('db_calls', JSON.stringify(calls));
    }
};

function toggleNotifications() {
    document.getElementById('notif-dropdown').classList.toggle('hidden');
}

function openTaskModal() {
    document.getElementById('form-task').reset();
    document.getElementById('modal-task').classList.remove('hidden');
}

function openCallModal() {
    document.getElementById('form-call').reset();
    document.getElementById('modal-call').classList.remove('hidden');
}

function closeModals() {
    document.getElementById('modal-task').classList.add('hidden');
    document.getElementById('modal-call').classList.add('hidden');
    document.getElementById('modal-meeting').classList.add('hidden');
}

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