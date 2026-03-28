// ==================== Toast & Loading 工具函数 ====================

/**
 * 显示 Toast 轻提示
 * @param {string} message - 提示消息
 * @param {string} type - 类型: success/error/warning/info
 * @param {number} duration - 显示时长(毫秒)
 */
function showToast(message, type = 'info', duration = 3000) {
    // 确保容器存在
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    // 创建 toast 元素
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    // 图标映射
    const icons = {
        success: '✓',
        error: '✗',
        warning: '⚠',
        info: 'ℹ'
    };

    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    // 自动移除
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

/**
 * 显示全局 Loading
 * @param {string} text - 加载提示文字
 */
function showLoading(text = '加载中...') {
    let overlay = document.querySelector('.loading-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-text">${text}</div>
        `;
        document.body.appendChild(overlay);
    } else {
        overlay.querySelector('.loading-text').textContent = text;
        overlay.classList.remove('hidden');
    }
}

/**
 * 隐藏全局 Loading
 */
function hideLoading() {
    const overlay = document.querySelector('.loading-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
}

/**
 * 设置按钮 Loading 状态
 * @param {HTMLButtonElement} button - 按钮元素
 * @param {boolean} loading - 是否 loading
 * @param {string} originalText - 原始文字
 */
function setButtonLoading(button, loading, originalText) {
    if (loading) {
        button.dataset.originalText = originalText || button.textContent;
        button.textContent = '处理中...';
        button.classList.add('btn-loading');
        button.disabled = true;
    } else {
        button.textContent = button.dataset.originalText || originalText;
        button.classList.remove('btn-loading');
        button.disabled = false;
    }
}

// ==================== 通知中心 ====================
let notificationPollingInterval = null;

function toggleNotificationPanel() {
    const panel = document.getElementById('notificationPanel');
    if (panel.style.display === 'none') {
        panel.style.display = 'block';
        loadNotifications();
    } else {
        panel.style.display = 'none';
    }
}

async function loadNotifications() {
    try {
        const notifications = await apiGet('/api/notifications');
        const list = document.getElementById('notificationList');
        const badge = document.getElementById('notificationBadge');

        if (notifications.length === 0) {
            list.innerHTML = '<p class="empty-text">暂无新通知</p>';
            badge.style.display = 'none';
            return;
        }

        badge.textContent = notifications.length;
        badge.style.display = 'inline-block';

        list.innerHTML = notifications.map(n => `
            <div class="notification-item unread" onclick="handleNotificationClick(${n.id}, '${n.type}', ${n.data?.visitorId || 0})">
                <div class="title">${n.title}</div>
                <div class="message">${n.message}</div>
                <div class="time">${formatDateTime(n.createdAt)}</div>
            </div>
        `).join('');
    } catch (err) {
        console.error('加载通知失败:', err);
    }
}

async function handleNotificationClick(id, type, visitorId) {
    // 标记已读
    await apiPost(`/api/notifications/${id}/read`, {});

    if (type === 'approval_required' && visitorId) {
        showPage('approval');
        loadApprovalList();
    }

    toggleNotificationPanel();
    loadNotifications();
}

function startNotificationPolling() {
    if (notificationPollingInterval) return;
    notificationPollingInterval = setInterval(() => {
        if (currentUser) loadNotifications();
    }, 30000); // 30秒轮询一次
}

function stopNotificationPolling() {
    if (notificationPollingInterval) {
        clearInterval(notificationPollingInterval);
        notificationPollingInterval = null;
    }
}

// ==================== 黑名单管理 ====================
async function loadBlacklist() {
    try {
        const list = await apiGet('/api/blacklist');
        const tbody = document.getElementById('blacklistTableBody');

        if (list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#999;">暂无黑名单记录</td></tr>';
            return;
        }

        tbody.innerHTML = list.map(b => `
            <tr>
                <td>${b.name}</td>
                <td>${b.phone || '-'}</td>
                <td>${b.idCard || '-'}</td>
                <td>${b.reason}</td>
                <td>${formatDateTime(b.createdAt)}</td>
                <td>
                    <button class="btn-danger" onclick="removeFromBlacklist(${b.id})">移除</button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        showToast('加载黑名单失败', 'error');
    }
}

function showBlacklistModal() {
    const modal = document.getElementById('blacklistModal');
    modal.classList.add('active');
    document.getElementById('blacklistForm').reset();
}

function closeBlacklistModal() {
    document.getElementById('blacklistModal').classList.remove('active');
}

async function saveBlacklist(event) {
    event.preventDefault();
    const name = document.getElementById('blacklistName').value.trim();
    const phone = document.getElementById('blacklistPhone').value.trim();
    const idCard = document.getElementById('blacklistIdCard').value.trim();
    const reason = document.getElementById('blacklistReason').value.trim();

    if (!phone && !idCard) {
        showToast('电话和身份证号至少填一项', 'warning');
        return;
    }

    const submitBtn = event.target.querySelector('button[type="submit"]');
    setButtonLoading(submitBtn, true, '保存');

    try {
        await apiPost('/api/blacklist', { name, phone, idCard, reason });
        showToast('添加成功', 'success');
        closeBlacklistModal();
        loadBlacklist();
    } catch (err) {
        showToast('添加失败: ' + err.message, 'error');
    } finally {
        setButtonLoading(submitBtn, false);
    }
}

async function removeFromBlacklist(id) {
    if (!confirm('确定从黑名单移除该访客？')) return;

    try {
        await apiDelete(`/api/blacklist/${id}`);
        showToast('移除成功', 'success');
        loadBlacklist();
    } catch (err) {
        showToast('移除失败', 'error');
    }
}

// ==================== 操作日志 ====================
let currentLogPage = 1;

async function loadLogs() {
    try {
        const result = await apiGet(`/api/logs?page=${currentLogPage}&limit=20`);
        const tbody = document.getElementById('logsTableBody');

        if (result.logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#999;">暂无日志记录</td></tr>';
            document.getElementById('logPagination').innerHTML = '';
            return;
        }

        tbody.innerHTML = result.logs.map(log => `
            <tr>
                <td>${formatDateTime(log.createdAt)}</td>
                <td>${log.action}</td>
                <td>${log.details}</td>
                <td>${log.username || '-'}</td>
            </tr>
        `).join('');

        // 分页
        document.getElementById('logPagination').innerHTML = `
            <button ${currentLogPage <= 1 ? 'disabled' : ''} onclick="changeLogPage(${currentLogPage - 1})">上一页</button>
            <span>第 ${currentLogPage} / ${result.totalPages} 页</span>
            <button ${currentLogPage >= result.totalPages ? 'disabled' : ''} onclick="changeLogPage(${currentLogPage + 1})">下一页</button>
        `;
    } catch (err) {
        showToast('加载日志失败', 'error');
    }
}

function changeLogPage(page) {
    currentLogPage = page;
    loadLogs();
}

function exportLogs() {
    // 导出日志功能
    showToast('导出功能开发中...', 'info');
}

// ==================== API 配置 ====================
const API_BASE = '';

// 带用户认证的 API 请求
function getAuthHeaders() {
    const headers = {
        'Content-Type': 'application/json'
    };
    if (currentUser) {
        headers['user-id'] = currentUser.id;
        headers['user-role'] = currentUser.role;
        // 不传递中文在header中，避免编码问题
    }
    return headers;
}

async function apiGet(url) {
    const res = await fetch(API_BASE + url, {
        headers: getAuthHeaders()
    });
    return res.json();
}

async function apiPost(url, data) {
    const res = await fetch(API_BASE + url, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
    });
    return res.json();
}

async function apiPut(url, data) {
    const res = await fetch(API_BASE + url, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
    });
    return res.json();
}

async function apiDelete(url) {
    const res = await fetch(API_BASE + url, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    return res.json();
}

// ==================== 全局状态 ====================
let currentUser = null;
let currentStream = null;
let capturedPhoto = null;
let securityStream = null;
let securityPhoto = null;
let currentSecurityAction = null;
let currentSecurityVisitor = null;
let tempVisitorCompanies = [];
let tempVisitedOrgs = [];
let tempDeptStaff = {};
let allVisitors = [];
let currentReportData = [];

// ==================== 工具函数 ====================
function getRoleName(role) {
    const roles = { 'admin': '管理员', 'front': '前台', 'staff': '员工', 'security': '安保' };
    return roles[role] || role;
}

function getStatusBadge(status) {
    const statusMap = {
        'pending': { text: '待科长审核', class: 'status-pending' },
        'level2_pending': { text: '待部长审核', class: 'status-pending' },
        'level3_pending': { text: '待被访人审核', class: 'status-pending' },
        'security_pending': { text: '待安保确认', class: 'status-approved' },
        'approved': { text: '已通过', class: 'status-approved' },
        'rejected': { text: '已拒绝', class: 'status-rejected' },
        'arrived': { text: '已到访', class: 'status-arrived' },
        'completed': { text: '已完结', class: 'status-completed' }
    };
    const s = statusMap[status] || { text: status, class: '' };
    return `<span class="status-badge ${s.class}">${s.text}</span>`;
}

function formatDateTime(datetime) {
    if (!datetime) return '-';
    const date = new Date(datetime);
    return date.toLocaleString('zh-CN');
}

function getBaseUrl() {
    return window.location.origin + window.location.pathname.replace('index.html', '');
}

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mode') === 'self-register') {
        showSelfRegisterPage();
        return;
    }
    const savedUser = sessionStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showMainApp();
    }
    const today = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toTimeString().slice(0, 5);
    const visitDate = document.getElementById('visitDate');
    const visitTime = document.getElementById('visitTime');
    if (visitDate) visitDate.value = today;
    if (visitTime) visitTime.value = timeStr;
    const selfVisitDate = document.getElementById('selfVisitDate');
    const selfVisitTime = document.getElementById('selfVisitTime');
    if (selfVisitDate) selfVisitDate.value = today;
    if (selfVisitTime) selfVisitTime.value = timeStr;
    const exportStart = document.getElementById('exportStartDate');
    const exportEnd = document.getElementById('exportEndDate');
    if (exportStart) exportStart.value = today;
    if (exportEnd) exportEnd.value = today;
});

// ==================== 登录/登出 ====================
async function login() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    if (!username || !password) {
        showToast('请输入用户名和密码', 'warning');
        return;
    }

    const loginBtn = document.querySelector('#loginPage .btn-primary');
    setButtonLoading(loginBtn, true, '登录');

    try {
        const res = await apiPost('/api/login', { username, password });
        if (res.error) {
            showToast(res.error, 'error');
            return;
        }
        currentUser = res;
        sessionStorage.setItem('currentUser', JSON.stringify(res));
        showToast('登录成功', 'success');
        showMainApp();
    } catch (err) {
        showToast('登录失败: ' + err.message, 'error');
    } finally {
        setButtonLoading(loginBtn, false);
    }
}

function logout() {
    stopNotificationPolling();
    currentUser = null;
    sessionStorage.removeItem('currentUser');
    document.getElementById('loginPage').classList.add('active');
    document.getElementById('mainApp').classList.remove('active');
    document.getElementById('visitorSelfRegisterPage').classList.remove('active');
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
}

function showMainApp() {
    document.getElementById('loginPage').classList.remove('active');
    document.getElementById('visitorSelfRegisterPage').classList.remove('active');
    document.getElementById('mainApp').classList.add('active');
    document.getElementById('currentUserName').textContent = currentUser.realName;
    document.getElementById('currentUserRole').textContent = getRoleName(currentUser.role);

    // 根据权限控制菜单显示
    setupMenuPermissions();

    // 启动通知轮询
    startNotificationPolling();

    loadDashboard();
}

// 设置菜单权限
function setupMenuPermissions() {
    const role = currentUser.role;
    const position = currentUser.position;

    // 所有菜单项默认隐藏
    document.querySelectorAll('.menu-item').forEach(item => {
        item.style.display = 'none';
    });

    // 根据角色显示对应菜单
    if (role === 'admin') {
        // 管理员：显示所有菜单
        document.querySelectorAll('.menu-item').forEach(item => {
            item.style.display = 'flex';
        });
    } else if (role === 'front') {
        // 前台：访客登记、访客列表、访客报表、数据导出、二维码生成
        showMenuItems(['dashboard', 'visitor-register', 'visitor-list', 'report', 'export', 'qrcode']);
    } else if (role === 'staff') {
        // 员工：首页看板、访客列表、审核管理（只有科长/部长/被访人能看到）
        showMenuItems(['dashboard', 'visitor-list']);

        // 科长、部长、被访人可以看到审核管理
        if (position === 'dept_manager' || position === 'dept_head' || position === 'staff') {
            showMenuItems(['approval']);
        }
    } else if (role === 'security') {
        // 安保：首页看板、进出登记
        showMenuItems(['dashboard', 'check-in-out']);
    }
}

function showMenuItems(pages) {
    pages.forEach(page => {
        const item = document.querySelector(`.menu-item[data-page="${page}"]`);
        if (item) item.style.display = 'flex';
    });
}

// ==================== 访客自助登记 ====================
async function showSelfRegisterPage() {
    document.getElementById('loginPage').classList.remove('active');
    document.getElementById('mainApp').classList.remove('active');
    document.getElementById('visitorSelfRegisterPage').classList.add('active');
    const options = await apiGet('/api/options');
    const companySelect = document.getElementById('selfVisitorCompany');
    if (companySelect) {
        companySelect.innerHTML = '<option value="">请选择来访单位</option>' +
            options.visitorCompanies.map(c => `<option value="${c}">${c}</option>`).join('');
    }
    const orgSelect = document.getElementById('selfVisitedOrg');
    if (orgSelect) {
        orgSelect.innerHTML = '<option value="">请选择被访单位</option>' +
            options.visitedOrgs.map(o => `<option value="${o}">${o}</option>`).join('');
    }
    loadSelfRegisterDeptStaff();
}

async function loadSelfRegisterDeptStaff() {
    const options = await apiGet('/api/options');
    const deptSelect = document.getElementById('selfVisitedDepartment');
    const staffSelect = document.getElementById('selfVisitedPerson');
    if (deptSelect) {
        deptSelect.innerHTML = '<option value="">请选择被访部门</option>' +
            Object.keys(options.deptStaff).map(d => `<option value="${d}">${d}</option>`).join('');
        deptSelect.onchange = () => {
            const dept = deptSelect.value;
            if (staffSelect) {
                staffSelect.innerHTML = '<option value="">请选择被访人</option>' +
                    (options.deptStaff[dept] || []).map(s => `<option value="${s}">${s}</option>`).join('');
            }
        };
    }
}

async function submitVisitorSelf(event) {
    event.preventDefault();
    const name = document.getElementById('selfVisitorName').value.trim();
    const phone = document.getElementById('selfVisitorPhone').value.trim();
    const idCard = document.getElementById('selfVisitorIdCard').value.trim();
    const company = document.getElementById('selfVisitorCompany').value;
    const visitedOrg = document.getElementById('selfVisitedOrg').value;
    const visitedDept = document.getElementById('selfVisitedDepartment').value;
    const visitedStaff = document.getElementById('selfVisitedPerson').value;
    const visitDate = document.getElementById('selfVisitDate').value;
    const visitTime = document.getElementById('selfVisitTime').value;
    const reason = document.getElementById('selfVisitPurpose').value.trim();
    if (!name || !phone || !company || !visitedOrg || !visitedDept || !visitedStaff || !visitDate || !reason) {
        showToast('请填写完整信息', 'warning');
        return;
    }

    const submitBtn = event.target.querySelector('button[type="submit"]');
    setButtonLoading(submitBtn, true, '提交预约');

    try {
        const settings = await apiGet('/api/settings');
        const result = await apiPost('/api/visitors', {
            name, phone, idCard, company, visitedOrg, visitedDept, visitedStaff,
            visitDate, visitTime, reason,
            status: settings.requireApproval ? 'pending' : 'approved',
            registeredBy: 'self'
        });
        document.getElementById('visitorSelfForm').style.display = 'none';
        document.getElementById('selfRegisterSuccess').style.display = 'block';
        document.getElementById('visitorCode').textContent = result.visitorCode;
        showToast('预约提交成功', 'success');
    } catch (err) {
        showToast('提交失败: ' + err.message, 'error');
    } finally {
        setButtonLoading(submitBtn, false);
    }
}

function loadSelfDepartments() {
    loadSelfRegisterDeptStaff();
}

function loadSelfStaff() {}

// ==================== 页面导航 ====================
function showPage(pageId) {
    document.querySelectorAll('.content-page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    if (event && event.target) event.target.classList.add('active');

    // 更新页面标题
    const pageTitles = {
        'dashboard': '首页看板',
        'visitor-register': '访客登记',
        'visitor-list': '访客列表',
        'approval': '审核管理',
        'check-in-out': '进出登记',
        'export': '数据导出',
        'users': '用户管理',
        'settings': '系统设置',
        'qrcode': '二维码生成',
        'report': '访客报表',
        'statistics': '统计报表',
        'logs': '操作日志',
        'backup': '数据备份',
        'blacklist': '黑名单管理'
    };
    document.getElementById('pageTitle').textContent = pageTitles[pageId] || '';

    if (pageId === 'dashboard') loadDashboard();
    if (pageId === 'visitor-register') initVisitorRegister();
    if (pageId === 'visitor-list') loadVisitorList();
    if (pageId === 'approval') loadApprovalList();
    if (pageId === 'check-in-out') initSecurityCheckin();
    if (pageId === 'export') loadExportPage();
    if (pageId === 'users') loadUserList();
    if (pageId === 'settings') loadSettings();
    if (pageId === 'qrcode') loadQRCodePage();
    if (pageId === 'report') loadReportPage();
    if (pageId === 'statistics') loadStatistics();
    if (pageId === 'logs') { currentLogPage = 1; loadLogs(); }
    if (pageId === 'backup') loadBackupList();
    if (pageId === 'blacklist') loadBlacklist();
}

async function loadDashboard() {
    const visitors = await apiGet('/api/visitors');
    allVisitors = visitors;
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('todayVisitors').textContent = visitors.filter(v => v.visitDate === today).length;
    document.getElementById('currentVisitors').textContent = visitors.filter(v => v.status === 'arrived').length;
    // 统计所有待审核状态
    const pendingCount = visitors.filter(v => ['pending', 'level2_pending', 'level3_pending', 'security_pending'].includes(v.status)).length;
    document.getElementById('pendingApprovals').textContent = pendingCount;
    document.getElementById('monthVisitors').textContent = visitors.filter(v => v.visitDate && v.visitDate.startsWith(today.substring(0, 7))).length;
    const badge = document.getElementById('pendingCount');
    if (badge) {
        badge.textContent = pendingCount;
        badge.style.display = pendingCount > 0 ? 'inline' : 'none';
    }
    const tbody = document.getElementById('recentVisitors');
    const recent = visitors.slice(0, 5);
    tbody.innerHTML = recent.map(v => `
        <tr>
            <td>${v.name}</td>
            <td>${v.reason}</td>
            <td>${v.visitedStaff}</td>
            <td>${getStatusBadge(v.status)}</td>
            <td>${formatDateTime(v.createdAt)}</td>
        </tr>
    `).join('') || '<tr><td colspan="5" style="text-align:center;">暂无数据</td></tr>';
}

// ==================== 访客登记 ====================
async function initVisitorRegister() {
    const options = await apiGet('/api/options');
    const companySelect = document.getElementById('visitorCompany');
    if (companySelect) {
        companySelect.innerHTML = '<option value="">请选择来访单位</option>' +
            options.visitorCompanies.map(c => `<option value="${c}">${c}</option>`).join('');
    }
    const orgSelect = document.getElementById('visitedOrg');
    if (orgSelect) {
        orgSelect.innerHTML = '<option value="">请选择被访单位</option>' +
            options.visitedOrgs.map(o => `<option value="${o}">${o}</option>`).join('');
    }
    loadDeptStaffOptions();
}

async function loadDeptStaffOptions() {
    const options = await apiGet('/api/options');
    const deptSelect = document.getElementById('visitedDepartment');
    const staffSelect = document.getElementById('visitedPerson');
    if (deptSelect) {
        deptSelect.innerHTML = '<option value="">请选择被访部门</option>' +
            Object.keys(options.deptStaff).map(d => `<option value="${d}">${d}</option>`).join('');
        deptSelect.onchange = () => {
            const dept = deptSelect.value;
            if (staffSelect) {
                staffSelect.innerHTML = '<option value="">请选择被访人</option>' +
                    (options.deptStaff[dept] || []).map(s => `<option value="${s}">${s}</option>`).join('');
            }
        };
    }
}

function loadDepartments() {
    loadDeptStaffOptions();
}

function loadStaff() {}

async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const video = document.getElementById('camera');
        video.srcObject = stream;
        video.style.display = 'block';
        document.getElementById('captureBtn').style.display = 'inline-block';
        document.getElementById('stopCameraBtn').style.display = 'inline-block';
    } catch (err) {
        alert('无法启动摄像头: ' + err.message);
    }
}

function stopCamera() {
    const video = document.getElementById('camera');
    if (video.srcObject) {
        video.srcObject.getTracks().forEach(t => t.stop());
        video.srcObject = null;
    }
    video.style.display = 'none';
    document.getElementById('captureBtn').style.display = 'none';
    document.getElementById('stopCameraBtn').style.display = 'none';
}

function capturePhoto() {
    const video = document.getElementById('camera');
    const canvas = document.getElementById('photoCanvas');
    if (!video.srcObject) {
        alert('请先启动摄像头');
        return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    capturedPhoto = canvas.toDataURL('image/jpeg');
    const preview = document.getElementById('photoPreview');
    preview.src = capturedPhoto;
    preview.style.display = 'block';
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            capturedPhoto = e.target.result;
            const preview = document.getElementById('photoPreview');
            preview.src = capturedPhoto;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

async function submitVisitor(event) {
    event.preventDefault();
    const name = document.getElementById('visitorName').value.trim();
    const phone = document.getElementById('visitorPhone').value.trim();
    const idCard = document.getElementById('visitorIdCard').value.trim();
    const plateNumber = document.getElementById('visitorPlateNumber')?.value.trim() || '';
    const company = document.getElementById('visitorCompany').value;
    const visitedOrg = document.getElementById('visitedOrg').value;
    const visitedDept = document.getElementById('visitedDepartment').value;
    const visitedStaff = document.getElementById('visitedPerson').value;
    const visitDate = document.getElementById('visitDate').value;
    const visitTime = document.getElementById('visitTime').value;
    const reason = document.getElementById('visitPurpose').value.trim();
    if (!name || !phone || !company || !visitedOrg || !visitedDept || !visitedStaff || !visitDate || !reason) {
        showToast('请填写完整信息', 'warning');
        return;
    }

    const submitBtn = event.target.querySelector('button[type="submit"]');
    setButtonLoading(submitBtn, true, '提交登记');

    try {
        const settings = await apiGet('/api/settings');
        await apiPost('/api/visitors', {
            name, phone, idCard, plateNumber, company, visitedOrg, visitedDept, visitedStaff,
            visitDate, visitTime, reason,
            status: settings.requireApproval ? 'pending' : 'approved',
            photo: capturedPhoto,
            registeredBy: currentUser ? currentUser.username : 'self'
        });
        showToast('登记成功', 'success');
        document.getElementById('visitorForm').reset();
        capturedPhoto = null;
        document.getElementById('photoPreview').style.display = 'none';
        stopCamera();
        // 刷新访客列表
        loadVisitorList();
    } catch (err) {
        showToast('登记失败: ' + err.message, 'error');
    } finally {
        setButtonLoading(submitBtn, false);
    }
}

// ==================== 访客列表 ====================
async function loadVisitorList() {
    const visitors = await apiGet('/api/visitors');
    allVisitors = visitors;
    const statusFilter = document.getElementById('filterStatus').value;
    const search = document.getElementById('searchKeyword').value.trim().toLowerCase();
    let filtered = visitors;
    if (statusFilter) filtered = filtered.filter(v => v.status === statusFilter);
    if (search) filtered = filtered.filter(v => v.name.toLowerCase().includes(search) || v.visitorCode.toLowerCase().includes(search) || v.phone.includes(search));
    const tbody = document.getElementById('visitorTableBody');
    tbody.innerHTML = filtered.map(v => `
        <tr>
            <td>${v.name}</td>
            <td>${v.phone}</td>
            <td>${v.company}</td>
            <td>${v.visitedOrg}</td>
            <td>${v.visitedDept}</td>
            <td>${v.visitedStaff}</td>
            <td>${v.reason}</td>
            <td>${v.visitDate} ${v.visitTime || ''}</td>
            <td>${getStatusBadge(v.status)}</td>
            <td>
                <button class="btn-success" onclick="viewVisitorDetail(${v.id})">查看</button>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="10" style="text-align:center;">暂无数据</td></tr>';
}

function searchVisitors() {
    loadVisitorList();
}

function resetSearch() {
    document.getElementById('searchKeyword').value = '';
    document.getElementById('filterStatus').value = '';
    document.getElementById('filterDate').value = '';
    loadVisitorList();
}

function viewVisitorDetail(id) {
    const visitor = allVisitors.find(v => v.id === id);
    if (!visitor) return;

    // 构建审核链显示
    let approvalChainHtml = '';
    if (visitor.approvalChain && visitor.approvalChain.length > 0) {
        approvalChainHtml = '<div style="margin-top: 15px; padding: 15px; background: #f5f7fa; border-radius: 8px;">';
        approvalChainHtml += '<p style="font-weight: 600; margin-bottom: 10px;">审核流程：</p>';
        approvalChainHtml += '<div style="display: flex; flex-direction: column; gap: 8px;">';

        visitor.approvalChain.forEach((item, index) => {
            let statusText = '';
            let statusColor = '';

            if (item.status === 'pending') {
                statusText = '待审核';
                statusColor = '#fa8c16';
            } else if (item.status === 'approved') {
                statusText = '已通过';
                statusColor = '#52c41a';
            } else if (item.status === 'rejected') {
                statusText = '已拒绝';
                statusColor = '#ff4d4f';
            }

            const isCurrent = item.level === visitor.currentApprovalLevel && item.status === 'pending';
            const highlightStyle = isCurrent ? 'background: #e6f7ff; border-left: 3px solid #1890ff;' : '';

            approvalChainHtml += `
                <div style="padding: 10px; background: white; border-radius: 4px; ${highlightStyle}">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span><strong>${item.roleName}：</strong>${item.approverName}</span>
                        <span style="color: ${statusColor}; font-weight: 500;">${statusText}</span>
                    </div>
                    ${item.approvedAt ? `<div style="font-size: 12px; color: #999; margin-top: 5px;">审核时间：${formatDateTime(item.approvedAt)}</div>` : ''}
                    ${item.comment ? `<div style="font-size: 12px; color: #666; margin-top: 5px;">备注：${item.comment}</div>` : ''}
                </div>
            `;
        });

        approvalChainHtml += '</div></div>';
    }

    document.getElementById('visitorDetail').innerHTML = `
        <p><strong>访客编号：</strong>${visitor.visitorCode}</p>
        <p><strong>姓名：</strong>${visitor.name}</p>
        <p><strong>电话：</strong>${visitor.phone}</p>
        <p><strong>身份证号：</strong>${visitor.idCard || '-'}</p>
        <p><strong>来访单位：</strong>${visitor.company || '个人来访'}</p>
        <p><strong>被访单位：</strong>${visitor.visitedOrg}</p>
        <p><strong>被访部门：</strong>${visitor.visitedDept}</p>
        <p><strong>被访人：</strong>${visitor.visitedStaff}</p>
        <p><strong>来访事由：</strong>${visitor.reason}</p>
        <p><strong>预约时间：</strong>${visitor.visitDate} ${visitor.visitTime || ''}</p>
        <p><strong>状态：</strong>${getStatusBadge(visitor.status)}</p>
        <p><strong>登记时间：</strong>${formatDateTime(visitor.createdAt)}</p>
        ${visitor.arrivalTime ? `<p><strong>到访时间：</strong>${formatDateTime(visitor.arrivalTime)}</p>` : ''}
        ${visitor.departureTime ? `<p><strong>离场时间：</strong>${formatDateTime(visitor.departureTime)}</p>` : ''}
        ${approvalChainHtml}
        ${visitor.photo ? `<p style="margin-top: 15px;"><strong>访客照片：</strong></p><img src="${visitor.photo}" style="max-width:200px; border-radius: 8px;">` : ''}
    `;
    document.getElementById('visitorModal').classList.add('active');
}

function closeModal() {
    document.getElementById('visitorModal').classList.remove('active');
}

// ==================== 审核管理 ====================
async function loadApprovalList() {
    const visitors = await apiGet('/api/visitors');
    allVisitors = visitors;
    renderApprovalList('pending');
}

function renderApprovalList(status) {
    // 根据当前用户角色过滤可审核的访客
    let filtered = allVisitors;

    if (currentUser.role === 'staff') {
        // 员工只能看到本部门或自己是被访人的记录
        filtered = allVisitors.filter(v => {
            // 是本部门的访客申请
            if (v.visitedDept === currentUser.department) {
                // 检查是否需要当前用户审核
                const currentApproval = v.approvalChain?.find(a => a.level === v.currentApprovalLevel);
                if (currentApproval) {
                    // 科长审核
                    if (currentApproval.role === 'dept_manager' && currentUser.position === 'dept_manager') {
                        return true;
                    }
                    // 部长审核
                    if (currentApproval.role === 'dept_head' && currentUser.position === 'dept_head') {
                        return true;
                    }
                    // 被访人审核
                    if (currentApproval.role === 'host' && currentUser.realName === v.visitedStaff) {
                        return true;
                    }
                }
                // 已审核完成的也可以看到
                if (v.status !== 'pending' && v.status !== 'level2_pending' && v.status !== 'level3_pending') {
                    return true;
                }
            }
            // 或自己是被访人
            if (v.visitedStaff === currentUser.realName) {
                return true;
            }
            return false;
        });
    }

    // 根据状态标签过滤
    if (status === 'pending') {
        filtered = filtered.filter(v => ['pending', 'level2_pending', 'level3_pending'].includes(v.status));
    } else {
        filtered = filtered.filter(v => v.status === status);
    }

    const listDiv = document.getElementById('approvalList');

    // 只在待审核标签显示批量操作
    const showBatchActions = status === 'pending' && (currentUser.role === 'admin' || currentUser.position === 'dept_manager' || currentUser.position === 'dept_head');

    listDiv.innerHTML = filtered.map(v => {
        // 构建审核链显示
        const approvalChainHtml = renderApprovalChain(v);

        // 判断当前用户是否可以审核
        const canApprove = checkCanApprove(v);

        // 复选框（只在待审核状态显示）
        const checkboxHtml = showBatchActions && canApprove ?
            `<input type="checkbox" class="visitor-checkbox" data-id="${v.id}" onchange="toggleSelectVisitor(${v.id})" style="margin-right: 10px;">` : '';

        return `
        <div class="approval-card" style="display: flex; align-items: flex-start;">
            <div style="margin-top: 5px;">${checkboxHtml}</div>
            <div class="approval-info" style="flex: 1;">
                <h4>${v.name} - ${v.company || '个人来访'}</h4>
                <p>被访部门: ${v.visitedDept} | 被访人: ${v.visitedStaff}</p>
                <p>事由: ${v.reason}</p>
                <p>预约时间: ${v.visitDate} ${v.visitTime || ''}</p>
                <p>状态: ${getStatusBadge(v.status)}</p>
                ${approvalChainHtml}
            </div>
            ${canApprove ? `
            <div class="approval-actions">
                <button class="btn-success" onclick="approveVisitor(${v.id})">通过</button>
                <button class="btn-danger" onclick="rejectVisitor(${v.id})">拒绝</button>
            </div>
            ` : ''}
        </div>
    `}).join('') || '<p style="text-align:center;color:#999;">暂无记录</p>';

    // 重置批量选择
    selectedVisitors = [];
    updateBatchButtons();
}

// 渲染审核链
function renderApprovalChain(visitor) {
    if (!visitor.approvalChain || visitor.approvalChain.length === 0) {
        return '';
    }

    let html = '<div class="approval-chain" style="margin-top: 10px; padding: 10px; background: #f5f7fa; border-radius: 4px;">';
    html += '<p style="font-size: 12px; color: #666; margin-bottom: 5px;">审核流程：</p>';
    html += '<div style="display: flex; gap: 5px; flex-wrap: wrap;">';

    visitor.approvalChain.forEach((item, index) => {
        let statusIcon = '';
        let statusClass = '';

        if (item.status === 'pending') {
            statusIcon = '⏳';
            statusClass = 'pending';
        } else if (item.status === 'approved') {
            statusIcon = '✓';
            statusClass = 'approved';
        } else if (item.status === 'rejected') {
            statusIcon = '✗';
            statusClass = 'rejected';
        }

        const isCurrent = item.level === visitor.currentApprovalLevel && item.status === 'pending';
        const highlightStyle = isCurrent ? 'border: 2px solid #1890ff; font-weight: bold;' : '';

        html += `
            <div class="approval-step ${statusClass}" style="${highlightStyle} padding: 5px 10px; border-radius: 4px; background: ${item.status === 'approved' ? '#e6f7e6' : item.status === 'rejected' ? '#ffe6e6' : '#fff'};">
                <span>${statusIcon} ${item.roleName}: ${item.approverName}</span>
                ${item.approvedAt ? `<span style="font-size: 11px; color: #999;">${new Date(item.approvedAt).toLocaleDateString()}</span>` : ''}
            </div>
        `;

        if (index < visitor.approvalChain.length - 1) {
            html += '<span style="color: #999;">→</span>';
        }
    });

    html += '</div></div>';
    return html;
}

// 检查当前用户是否可以审核
function checkCanApprove(visitor) {
    // 管理员可以审核所有
    if (currentUser.role === 'admin') return true;

    // 员工需要检查权限
    if (currentUser.role === 'staff') {
        // 必须是被访部门
        if (visitor.visitedDept !== currentUser.department) return false;

        const currentApproval = visitor.approvalChain?.find(a => a.level === visitor.currentApprovalLevel);
        if (!currentApproval || currentApproval.status !== 'pending') return false;

        // 科长审核
        if (currentApproval.role === 'dept_manager' && currentUser.position === 'dept_manager') {
            return true;
        }
        // 部长审核
        if (currentApproval.role === 'dept_head' && currentUser.position === 'dept_head') {
            return true;
        }
        // 被访人审核
        if (currentApproval.role === 'host' && currentUser.realName === visitor.visitedStaff) {
            return true;
        }
    }

    return false;
}

function showApprovalTab(tab) {
    document.querySelectorAll('.approval-tabs .tab-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    renderApprovalList(tab);
}

async function approveVisitor(id) {
    const comment = prompt('请输入审核意见（可选）：') || '';
    try {
        const result = await apiPost(`/api/visitors/${id}/approve`, {
            action: 'approve',
            comment: comment,
            userId: currentUser.id
        });
        if (result.success) {
            alert('审核通过');
            loadApprovalList();
        } else {
            alert(result.error || '审核失败');
        }
    } catch (err) {
        alert('审核失败: ' + err.message);
    }
}

async function rejectVisitor(id) {
    const comment = prompt('请输入拒绝原因：') || '';
    if (!comment) {
        alert('请输入拒绝原因');
        return;
    }
    try {
        const result = await apiPost(`/api/visitors/${id}/approve`, {
            action: 'reject',
            comment: comment,
            userId: currentUser.id
        });
        if (result.success) {
            alert('已拒绝');
            loadApprovalList();
        } else {
            alert(result.error || '操作失败');
        }
    } catch (err) {
        alert('操作失败: ' + err.message);
    }
}

// ==================== 安保进出登记 ====================
async function initSecurityCheckin() {
    const visitors = await apiGet('/api/visitors');
    allVisitors = visitors;
    renderSecurityLists();
}

function renderSecurityLists() {
    // 安保只能看到已通过全部审核（security_pending）或已到访的访客
    const pendingList = allVisitors.filter(v => v.status === 'security_pending');
    const arrivedList = allVisitors.filter(v => v.status === 'arrived');

    const container = document.getElementById('checkinResult');
    container.innerHTML = `
        <h3 style="margin: 20px 0 15px; color: #1890ff;">待到访访客 (${pendingList.length})</h3>
        ${pendingList.length > 0 ? pendingList.map(v => `
            <div class="visitor-card" style="margin-bottom: 15px;">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap: wrap;">
                    <div>
                        <h4 style="margin-bottom: 8px;">${v.name} - ${v.company || '个人来访'}</h4>
                        <p style="color:#666;">被访部门: ${v.visitedDept} | 被访人: ${v.visitedStaff}</p>
                        <p style="color:#666;">预约时间: ${v.visitDate} ${v.visitTime || ''}</p>
                        <p style="color:#666;">预约单号: <strong>${v.visitorCode}</strong></p>
                    </div>
                    <button class="btn-arrived" onclick="openSecurityCameraForVisitor(${v.id}, 'arrival')">登记到访</button>
                </div>
            </div>
        `).join('') : '<p style="color:#999; padding: 20px;">暂无待到访访客</p>'}

        <h3 style="margin: 30px 0 15px; color: #52c41a;">在访访客 (${arrivedList.length})</h3>
        ${arrivedList.length > 0 ? arrivedList.map(v => `
            <div class="visitor-card" style="margin-bottom: 15px; border-left: 4px solid #52c41a;">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap: wrap;">
                    <div>
                        <h4 style="margin-bottom: 8px;">${v.name} - ${v.company || '个人来访'}</h4>
                        <p style="color:#666;">被访部门: ${v.visitedDept} | 被访人: ${v.visitedStaff}</p>
                        <p style="color:#666;">到访时间: ${formatDateTime(v.arrivalTime)}</p>
                        <p style="color:#666;">预约单号: <strong>${v.visitorCode}</strong></p>
                    </div>
                    <button class="btn-completed" onclick="openSecurityCameraForVisitor(${v.id}, 'departure')">登记离场</button>
                </div>
            </div>
        `).join('') : '<p style="color:#999; padding: 20px;">暂没有在访访客</p>'}
    `;
}

function openSecurityCameraForVisitor(id, action) {
    currentSecurityVisitor = allVisitors.find(v => v.id === id);
    currentSecurityAction = action;
    document.getElementById('securityCameraModal').classList.add('active');
    document.getElementById('cameraModalTitle').textContent = action === 'arrival' ? '到访拍照' : '离场拍照';
    document.getElementById('securityPhotoPreview').style.display = 'none';
    document.getElementById('securityCamera').style.display = 'block';
    document.getElementById('captureSecurityBtn').style.display = 'inline-block';
    document.getElementById('retakeSecurityBtn').style.display = 'none';
    document.getElementById('confirmSecurityBtn').style.display = 'none';
    startSecurityCamera();
}

async function startSecurityCamera() {
    try {
        securityStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const video = document.getElementById('securityCamera');
        video.srcObject = securityStream;
    } catch (err) {
        alert('无法启动摄像头: ' + err.message);
    }
}

function closeSecurityCameraModal() {
    if (securityStream) {
        securityStream.getTracks().forEach(t => t.stop());
        securityStream = null;
    }
    document.getElementById('securityCameraModal').classList.remove('active');
    securityPhoto = null;
}

function captureSecurityPhoto() {
    const video = document.getElementById('securityCamera');
    const canvas = document.getElementById('securityCanvas');
    if (!video.srcObject) {
        alert('摄像头未启动');
        return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    securityPhoto = canvas.toDataURL('image/jpeg');

    if (securityStream) {
        securityStream.getTracks().forEach(t => t.stop());
        securityStream = null;
    }
    video.style.display = 'none';

    const preview = document.getElementById('securityPhotoPreview');
    preview.src = securityPhoto;
    preview.style.display = 'block';

    document.getElementById('captureSecurityBtn').style.display = 'none';
    document.getElementById('retakeSecurityBtn').style.display = 'inline-block';
    document.getElementById('confirmSecurityBtn').style.display = 'inline-block';
}

function retakeSecurityPhoto() {
    securityPhoto = null;
    document.getElementById('securityPhotoPreview').style.display = 'none';
    document.getElementById('securityCamera').style.display = 'block';
    document.getElementById('captureSecurityBtn').style.display = 'inline-block';
    document.getElementById('retakeSecurityBtn').style.display = 'none';
    document.getElementById('confirmSecurityBtn').style.display = 'none';
    startSecurityCamera();
}

// 文件上传备选方案
function handleSecurityFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        securityPhoto = e.target.result;

        document.getElementById('securityCamera').style.display = 'none';

        const preview = document.getElementById('securityPhotoPreview');
        preview.src = securityPhoto;
        preview.style.display = 'block';

        document.getElementById('captureSecurityBtn').style.display = 'none';
        document.getElementById('retakeSecurityBtn').style.display = 'inline-block';
        document.getElementById('confirmSecurityBtn').style.display = 'inline-block';

        if (securityStream) {
            securityStream.getTracks().forEach(t => t.stop());
            securityStream = null;
        }
    };
    reader.readAsDataURL(file);
}

async function confirmSecurityAction() {
    if (!securityPhoto) {
        alert('请先拍照');
        return;
    }
    try {
        const result = await apiPost(`/api/visitors/${currentSecurityVisitor.id}/security`, {
            action: currentSecurityAction,
            photo: securityPhoto
        });
        if (result.success) {
            alert(currentSecurityAction === 'arrival' ? '到访登记成功' : '离场登记成功');
            closeSecurityCameraModal();
            initSecurityCheckin();
        } else {
            alert(result.error || '操作失败');
        }
    } catch (err) {
        alert('操作失败: ' + err.message);
    }
}

// ==================== 数据导出 ====================
function loadExportPage() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('exportStartDate').value = today;
    document.getElementById('exportEndDate').value = today;
}

async function exportToExcel() {
    const startDate = document.getElementById('exportStartDate').value;
    const endDate = document.getElementById('exportEndDate').value;
    if (!startDate || !endDate) {
        alert('请选择开始和结束日期');
        return;
    }
    const visitors = allVisitors.filter(v => v.visitDate >= startDate && v.visitDate <= endDate);
    if (visitors.length === 0) {
        alert('该时间段没有数据');
        return;
    }
    const data = visitors.map(v => ({
        '访客编号': v.visitorCode,
        '姓名': v.name,
        '电话': v.phone,
        '身份证号': v.idCard || '',
        '来访单位': v.company,
        '被访单位': v.visitedOrg,
        '被访部门': v.visitedDept,
        '被访人': v.visitedStaff,
        '来访日期': v.visitDate,
        '来访时间': v.visitTime || '',
        '来访事由': v.reason,
        '状态': v.status,
        '登记时间': formatDateTime(v.createdAt),
        '到访时间': formatDateTime(v.arrivalTime),
        '离场时间': formatDateTime(v.departureTime)
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '访客记录');
    XLSX.writeFile(wb, `访客记录_${startDate}_${endDate}.xlsx`);
}

// ==================== 用户管理 ====================
async function loadUserList() {
    const users = await apiGet('/api/users');
    const tbody = document.getElementById('userTableBody');
    tbody.innerHTML = users.map(u => `
        <tr>
            <td>${u.username}</td>
            <td>${u.realName}</td>
            <td>${getRoleName(u.role)}</td>
            <td>${u.department}</td>
            <td>${u.phone}</td>
            <td>${u.status === 'active' ? '正常' : '禁用'}</td>
            <td>
                <button class="btn-success" onclick="editUser(${u.id})">编辑</button>
                ${u.id !== 1 ? `<button class="btn-danger" onclick="deleteUser(${u.id})">删除</button>` : ''}
            </td>
        </tr>
    `).join('') || '<tr><td colspan="7" style="text-align:center;">暂无数据</td></tr>';
}

function showUserModal() {
    document.getElementById('userId').value = '';
    document.getElementById('userForm').reset();
    document.getElementById('passwordHint').textContent = '';
    document.getElementById('userModal').classList.add('active');
}

function closeUserModal() {
    document.getElementById('userModal').classList.remove('active');
}

async function saveUser(event) {
    event.preventDefault();
    const id = document.getElementById('userId').value;
    const username = document.getElementById('userUsername').value.trim();
    const password = document.getElementById('userPassword').value;
    const realName = document.getElementById('userRealName').value.trim();
    const role = document.getElementById('userRole').value;
    const department = document.getElementById('userDepartment').value.trim();
    const phone = document.getElementById('userPhone').value.trim();

    if (!username || !realName || !role) {
        alert('请填写完整信息');
        return;
    }
    if (!id && !password) {
        alert('新增用户必须设置密码');
        return;
    }

    const userData = { username, realName, role, department, phone };
    if (password) userData.password = password;

    try {
        if (id) {
            await apiPut(`/api/users/${id}`, userData);
        } else {
            await apiPost('/api/users', { ...userData, password });
        }
        closeUserModal();
        loadUserList();
    } catch (err) {
        alert('保存失败: ' + err.message);
    }
}

async function editUser(id) {
    const users = await apiGet('/api/users');
    const user = users.find(u => u.id === id);
    if (!user) return;
    document.getElementById('userId').value = user.id;
    document.getElementById('userUsername').value = user.username;
    document.getElementById('userRealName').value = user.realName;
    document.getElementById('userRole').value = user.role;
    document.getElementById('userDepartment').value = user.department || '';
    document.getElementById('userPhone').value = user.phone || '';
    document.getElementById('userPassword').value = '';
    document.getElementById('passwordHint').textContent = '(不填则不修改)';
    document.getElementById('userModal').classList.add('active');
}

async function deleteUser(id) {
    if (!confirm('确定删除此用户?')) return;
    await apiDelete(`/api/users/${id}`);
    loadUserList();
}

// ==================== 系统设置 ====================
async function loadSettings() {
    const settings = await apiGet('/api/settings');
    document.getElementById('requireApproval').checked = settings.requireApproval;
    document.getElementById('approvalLevel').value = settings.approvalLevel || '1';
    document.getElementById('requirePhoto').checked = settings.requirePhoto;
    document.getElementById('savePhotos').checked = settings.savePhotos;
    toggleApprovalConfig();
    loadApproverLists();
    const options = await apiGet('/api/options');
    tempVisitorCompanies = [...options.visitorCompanies];
    tempVisitedOrgs = [...options.visitedOrgs];
    tempDeptStaff = JSON.parse(JSON.stringify(options.deptStaff));
    renderVisitorCompanies();
    renderVisitedOrgs();
    renderDeptStaff();

    document.getElementById('visitorCompanyInput').onkeydown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const val = e.target.value.trim();
            if (val && !tempVisitorCompanies.includes(val)) {
                tempVisitorCompanies.push(val);
                renderVisitorCompanies();
                e.target.value = '';
            }
        }
    };
    document.getElementById('visitedOrgInput').onkeydown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const val = e.target.value.trim();
            if (val && !tempVisitedOrgs.includes(val)) {
                tempVisitedOrgs.push(val);
                renderVisitedOrgs();
                e.target.value = '';
            }
        }
    };
}

function toggleApprovalConfig() {
    const level = document.getElementById('approvalLevel').value;
    document.getElementById('level2ApproverGroup').style.display = level === '2' ? 'block' : 'none';
}

async function loadApproverLists() {
    const users = await apiGet('/api/users');
    const settings = await apiGet('/api/settings');
    const level1Div = document.getElementById('level1Approvers');
    const level2Div = document.getElementById('level2Approvers');
    level1Div.innerHTML = users.map(u => `
        <div class="approver-item">
            <input type="checkbox" value="${u.id}" ${(settings.level1Approvers || []).includes(u.id) ? 'checked' : ''}>
            <span>${u.realName} (${getRoleName(u.role)})</span>
        </div>
    `).join('');
    level2Div.innerHTML = users.map(u => `
        <div class="approver-item">
            <input type="checkbox" value="${u.id}" ${(settings.level2Approvers || []).includes(u.id) ? 'checked' : ''}>
            <span>${u.realName} (${getRoleName(u.role)})</span>
        </div>
    `).join('');
}

async function saveSettings() {
    const settings = {
        requireApproval: document.getElementById('requireApproval').checked,
        approvalLevel: document.getElementById('approvalLevel').value,
        requirePhoto: document.getElementById('requirePhoto').checked,
        savePhotos: document.getElementById('savePhotos').checked,
        level1Approvers: Array.from(document.querySelectorAll('#level1Approvers input:checked')).map(cb => parseInt(cb.value)),
        level2Approvers: Array.from(document.querySelectorAll('#level2Approvers input:checked')).map(cb => parseInt(cb.value))
    };

    const deptStaff = {};
    document.querySelectorAll('#deptStaffConfig .dept-staff-item').forEach(item => {
        const dept = item.querySelector('.dept-input').value.trim();
        const staff = item.querySelector('.staff-input').value.split(',').map(s => s.trim()).filter(Boolean);
        if (dept) deptStaff[dept] = staff;
    });

    await apiPut('/api/settings', settings);
    await apiPut('/api/options', {
        visitorCompanies: tempVisitorCompanies,
        visitedOrgs: tempVisitedOrgs,
        deptStaff: deptStaff
    });

    alert('设置已保存');
}

function renderVisitorCompanies() {
    document.getElementById('visitorCompanyTags').innerHTML = tempVisitorCompanies.map(c => `
        <span class="tag">${c}<span class="remove" onclick="removeVisitorCompany('${c}')">×</span></span>
    `).join('');
}

function removeVisitorCompany(c) {
    tempVisitorCompanies = tempVisitorCompanies.filter(x => x !== c);
    renderVisitorCompanies();
}

function renderVisitedOrgs() {
    document.getElementById('visitedOrgTags').innerHTML = tempVisitedOrgs.map(o => `
        <span class="tag">${o}<span class="remove" onclick="removeVisitedOrg('${o}')">×</span></span>
    `).join('');
}

function removeVisitedOrg(o) {
    tempVisitedOrgs = tempVisitedOrgs.filter(x => x !== o);
    renderVisitedOrgs();
}

function renderDeptStaff() {
    const container = document.getElementById('deptStaffConfig');
    container.innerHTML = '';

    Object.entries(tempDeptStaff).forEach(([dept, staff]) => {
        const div = document.createElement('div');
        div.className = 'dept-staff-item';
        div.innerHTML = `
            <input type="text" class="dept-input" value="${dept}" placeholder="部门名称">
            <input type="text" class="staff-input" value="${staff.join(',')}" placeholder="人员姓名(逗号分隔)">
            <button type="button" onclick="this.parentElement.remove()" class="btn-danger btn-sm">删除</button>
        `;
        container.appendChild(div);
    });

    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'dept-staff-item';
    emptyDiv.innerHTML = `
        <input type="text" class="dept-input" placeholder="部门名称">
        <input type="text" class="staff-input" placeholder="人员姓名(逗号分隔)">
        <button type="button" onclick="this.parentElement.remove()" class="btn-danger btn-sm">删除</button>
    `;
    container.appendChild(emptyDiv);
}

function addDeptStaff() {
    const div = document.createElement('div');
    div.className = 'dept-staff-item';
    div.innerHTML = `
        <input type="text" class="dept-input" placeholder="部门名称">
        <input type="text" class="staff-input" placeholder="人员姓名(逗号分隔)">
        <button type="button" onclick="this.parentElement.remove()" class="btn-danger btn-sm">删除</button>
    `;
    document.getElementById('deptStaffConfig').appendChild(div);
}

function removeDeptStaff(btn) {
    btn.parentElement.remove();
}

// ==================== 二维码生成 ====================
function loadQRCodePage() {
    const baseUrl = getBaseUrl();
    const selfRegisterUrl = baseUrl + 'index.html?mode=self-register';
    document.getElementById('qrcodeUrl').value = selfRegisterUrl;
    generateQRCode(selfRegisterUrl);
}

function generateQRCode(url) {
    const qrCanvas = document.getElementById('qrcodeCanvas');
    const qrImage = document.getElementById('qrcodeImage');

    if (typeof QRCode !== 'undefined') {
        qrCanvas.innerHTML = '';
        qrCanvas.style.display = 'none';
        qrImage.style.display = 'none';

        new QRCode(qrCanvas, {
            text: url,
            width: 256,
            height: 256,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.M
        });

        setTimeout(() => {
            const canvas = qrCanvas.querySelector('canvas');
            if (canvas) {
                qrImage.src = canvas.toDataURL('image/png');
                qrImage.style.display = 'block';
            }
        }, 100);
    } else {
        qrCanvas.innerHTML = '<p style="color:red;">二维码库加载失败，请刷新页面重试</p>';
        qrCanvas.style.display = 'block';
    }
}

function downloadQRCode() {
    const qrImage = document.getElementById('qrcodeImage');
    if (!qrImage.src || qrImage.src === '') {
        alert('请先生成二维码');
        return;
    }
    const link = document.createElement('a');
    link.download = '访客自助登记二维码.png';
    link.href = qrImage.src;
    link.click();
}

function printQRCode() {
    const qrImage = document.getElementById('qrcodeImage');
    if (!qrImage.src || qrImage.src === '') {
        alert('请先生成二维码');
        return;
    }
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head><title>打印二维码</title></head>
        <body style="text-align:center; padding:50px;">
            <h2>访客自助登记</h2>
            <p>请使用微信扫一扫进行登记</p>
            <img src="${qrImage.src}" style="width:300px; height:300px;">
            <p style="margin-top:20px; color:#666;">${document.getElementById('qrcodeUrl').value}</p>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

// ==================== 访客报表功能 ====================
async function loadReportPage() {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    document.getElementById('reportStartDate').value = firstDayOfMonth.toISOString().split('T')[0];
    document.getElementById('reportEndDate').value = today.toISOString().split('T')[0];
    await loadReportOptions();
}

async function loadReportOptions() {
    const options = await apiGet('/api/options');

    const companySelect = document.getElementById('reportVisitorCompany');
    companySelect.innerHTML = '<option value="">全部单位</option>' +
        options.visitorCompanies.map(c => `<option value="${c}">${c}</option>`).join('');

    const orgSelect = document.getElementById('reportVisitedOrg');
    orgSelect.innerHTML = '<option value="">全部单位</option>' +
        options.visitedOrgs.map(o => `<option value="${o}">${o}</option>`).join('');

    const deptSelect = document.getElementById('reportVisitedDept');
    const departments = Object.keys(options.deptStaff);
    deptSelect.innerHTML = '<option value="">全部部门</option>' +
        departments.map(d => `<option value="${d}">${d}</option>`).join('');

    deptSelect.onchange = () => {
        const dept = deptSelect.value;
        const staffSelect = document.getElementById('reportVisitedStaff');
        if (dept) {
            const staff = options.deptStaff[dept] || [];
            staffSelect.innerHTML = '<option value="">全部人员</option>' +
                staff.map(s => `<option value="${s}">${s}</option>`).join('');
        } else {
            const allStaff = Object.values(options.deptStaff).flat();
            staffSelect.innerHTML = '<option value="">全部人员</option>' +
                [...new Set(allStaff)].map(s => `<option value="${s}">${s}</option>`).join('');
        }
    };

    const allStaff = Object.values(options.deptStaff).flat();
    document.getElementById('reportVisitedStaff').innerHTML = '<option value="">全部人员</option>' +
        [...new Set(allStaff)].map(s => `<option value="${s}">${s}</option>`).join('');
}

async function generateReport() {
    const filters = {
        startDate: document.getElementById('reportStartDate').value,
        endDate: document.getElementById('reportEndDate').value,
        status: document.getElementById('reportStatus').value,
        visitorCompany: document.getElementById('reportVisitorCompany').value,
        visitedOrg: document.getElementById('reportVisitedOrg').value,
        visitedDept: document.getElementById('reportVisitedDept').value,
        visitedStaff: document.getElementById('reportVisitedStaff').value,
        visitorName: document.getElementById('reportVisitorName').value.trim().toLowerCase(),
        visitorPhone: document.getElementById('reportVisitorPhone').value.trim()
    };

    const visitors = await apiGet('/api/visitors');

    currentReportData = visitors.filter(v => {
        if (filters.startDate && v.visitDate < filters.startDate) return false;
        if (filters.endDate && v.visitDate > filters.endDate) return false;
        if (filters.status && v.status !== filters.status) return false;
        if (filters.visitorCompany && v.company !== filters.visitorCompany) return false;
        if (filters.visitedOrg && v.visitedOrg !== filters.visitedOrg) return false;
        if (filters.visitedDept && v.visitedDept !== filters.visitedDept) return false;
        if (filters.visitedStaff && v.visitedStaff !== filters.visitedStaff) return false;
        if (filters.visitorName && !v.name.toLowerCase().includes(filters.visitorName)) return false;
        if (filters.visitorPhone && !v.phone.includes(filters.visitorPhone)) return false;
        return true;
    });

    updateReportStats();
    renderReportTable();
}

function updateReportStats() {
    document.getElementById('reportTotalCount').textContent = currentReportData.length;
    document.getElementById('reportCompletedCount').textContent = currentReportData.filter(v => v.status === 'completed').length;
    document.getElementById('reportArrivedCount').textContent = currentReportData.filter(v => v.status === 'arrived').length;
    // 待处理包括所有待审核状态
    document.getElementById('reportPendingCount').textContent = currentReportData.filter(v => ['pending', 'level2_pending', 'level3_pending', 'security_pending'].includes(v.status)).length;
}

function renderReportTable() {
    const tbody = document.getElementById('reportTableBody');

    if (currentReportData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="15" style="text-align:center;">没有找到符合条件的数据</td></tr>';
        return;
    }

    tbody.innerHTML = currentReportData.map((v, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${v.name}</td>
            <td>${v.phone}</td>
            <td>${v.company}</td>
            <td>${v.visitedOrg}</td>
            <td>${v.visitedDept}</td>
            <td>${v.visitedStaff}</td>
            <td>${v.reason}</td>
            <td>${v.visitDate}</td>
            <td>${getStatusBadge(v.status)}</td>
            <td>${formatDateTime(v.createdAt)}</td>
            <td>${formatDateTime(v.arrivalTime)}</td>
            <td>${getPhotoThumbnail(v.arrivalPhoto, 'arrival')}</td>
            <td>${formatDateTime(v.departureTime)}</td>
            <td>${getPhotoThumbnail(v.departurePhoto, 'departure')}</td>
        </tr>
    `).join('');
}

function getPhotoThumbnail(photo, type) {
    if (!photo) return '<span class="photo-placeholder">无</span>';
    return `<img src="${photo}" class="photo-thumbnail"
        onclick="showPhotoModal('${photo}', '${type === 'arrival' ? '到访照片' : '离场照片'}')" title="点击查看大图">`;
}

function showPhotoModal(photo, title) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <h2>${title}</h2>
            <div style="text-align: center; padding: 20px;">
                <img src="${photo}" style="max-width: 100%; max-height: 500px; border-radius: 8px;">
            </div>
        </div>
    `;
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    document.body.appendChild(modal);
}

function resetReportFilters() {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    document.getElementById('reportStartDate').value = firstDayOfMonth.toISOString().split('T')[0];
    document.getElementById('reportEndDate').value = today.toISOString().split('T')[0];
    document.getElementById('reportStatus').value = '';
    document.getElementById('reportVisitorCompany').value = '';
    document.getElementById('reportVisitedOrg').value = '';
    document.getElementById('reportVisitedDept').value = '';
    document.getElementById('reportVisitedStaff').value = '';
    document.getElementById('reportVisitorName').value = '';
    document.getElementById('reportVisitorPhone').value = '';

    loadReportOptions();

    currentReportData = [];
    document.getElementById('reportTableBody').innerHTML = '<tr><td colspan="15" style="text-align:center;">请点击"生成报表"查看数据</td></tr>';
    updateReportStats();
}

function exportReportToExcel() {
    if (currentReportData.length === 0) {
        alert('没有数据可导出，请先生成报表');
        return;
    }

    const data = currentReportData.map((v, index) => ({
        '序号': index + 1,
        '访客姓名': v.name,
        '联系电话': v.phone,
        '身份证号': v.idCard || '',
        '来访单位': v.company,
        '被访单位': v.visitedOrg,
        '被访部门': v.visitedDept,
        '被访人': v.visitedStaff,
        '来访事由': v.reason,
        '预约日期': v.visitDate,
        '预约时间': v.visitTime || '',
        '状态': v.status,
        '登记时间': formatDateTime(v.createdAt),
        '到访时间': formatDateTime(v.arrivalTime),
        '离场时间': formatDateTime(v.departureTime),
        '访客编号': v.visitorCode
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '访客报表');

    const startDate = document.getElementById('reportStartDate').value;
    const endDate = document.getElementById('reportEndDate').value;
    XLSX.writeFile(wb, `访客报表_${startDate}_${endDate}.xlsx`);
}

// ==================== 批量操作 ====================
let selectedVisitors = [];

function toggleSelectAll() {
    const checkboxes = document.querySelectorAll('.visitor-checkbox');
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const isChecked = selectAllCheckbox.checked;

    checkboxes.forEach(cb => {
        cb.checked = isChecked;
        const id = parseInt(cb.dataset.id);
        if (isChecked && !selectedVisitors.includes(id)) {
            selectedVisitors.push(id);
        } else if (!isChecked) {
            selectedVisitors = selectedVisitors.filter(v => v !== id);
        }
    });

    updateBatchButtons();
}

function toggleSelectVisitor(id) {
    const checkbox = document.querySelector(`.visitor-checkbox[data-id="${id}"]`);
    if (checkbox.checked) {
        if (!selectedVisitors.includes(id)) {
            selectedVisitors.push(id);
        }
    } else {
        selectedVisitors = selectedVisitors.filter(v => v !== id);
    }
    updateBatchButtons();
}

function updateBatchButtons() {
    const batchButtons = document.querySelectorAll('.batch-action-btn');
    batchButtons.forEach(btn => {
        btn.disabled = selectedVisitors.length === 0;
        btn.textContent = btn.dataset.text + (selectedVisitors.length > 0 ? ` (${selectedVisitors.length})` : '');
    });
}

async function batchApprove() {
    if (selectedVisitors.length === 0) return;

    const comment = prompt('请输入批量审核意见（可选）：') || '';
    if (!confirm(`确定要批量通过 ${selectedVisitors.length} 条记录吗？`)) return;

    try {
        const result = await apiPost('/api/visitors/batch/approve', {
            ids: selectedVisitors,
            action: 'approve',
            comment: comment,
            userId: currentUser.id
        });

        alert(`批量审核完成：成功 ${result.successCount} 条，失败 ${result.failCount} 条`);
        selectedVisitors = [];
        loadApprovalList();
    } catch (err) {
        alert('批量审核失败: ' + err.message);
    }
}

async function batchReject() {
    if (selectedVisitors.length === 0) return;

    const comment = prompt('请输入批量拒绝原因：') || '';
    if (!comment) {
        alert('请输入拒绝原因');
        return;
    }
    if (!confirm(`确定要批量拒绝 ${selectedVisitors.length} 条记录吗？`)) return;

    try {
        const result = await apiPost('/api/visitors/batch/approve', {
            ids: selectedVisitors,
            action: 'reject',
            comment: comment,
            userId: currentUser.id
        });

        alert(`批量审核完成：成功 ${result.successCount} 条，失败 ${result.failCount} 条`);
        selectedVisitors = [];
        loadApprovalList();
    } catch (err) {
        alert('批量审核失败: ' + err.message);
    }
}

async function batchDeleteVisitors() {
    if (selectedVisitors.length === 0) return;

    if (!confirm(`确定要删除选中的 ${selectedVisitors.length} 条记录吗？此操作不可恢复！`)) return;

    try {
        const result = await apiPost('/api/visitors/batch/delete', {
            ids: selectedVisitors,
            userId: currentUser.id
        });

        alert(`成功删除 ${result.deletedCount} 条记录`);
        selectedVisitors = [];
        loadVisitorList();
    } catch (err) {
        alert('批量删除失败: ' + err.message);
    }
}

// ==================== 实时通知 ====================
let notificationInterval = null;

function startNotificationPolling() {
    // 每30秒检查一次待审核数量
    notificationInterval = setInterval(async () => {
        if (!currentUser) return;

        try {
            const visitors = await apiGet('/api/visitors');
            const pendingCount = visitors.filter(v =>
                ['pending', 'level2_pending', 'level3_pending'].includes(v.status) &&
                checkCanApprove(v)
            ).length;

            updateNotificationBadge(pendingCount);
        } catch (err) {
            console.error('轮询通知失败:', err);
        }
    }, 30000);
}

function stopNotificationPolling() {
    if (notificationInterval) {
        clearInterval(notificationInterval);
        notificationInterval = null;
    }
}

function updateNotificationBadge(count) {
    const badge = document.getElementById('pendingCount');
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline' : 'none';

        // 添加闪烁效果提醒
        if (count > 0) {
            badge.classList.add('badge-pulse');
            setTimeout(() => badge.classList.remove('badge-pulse'), 2000);
        }
    }
}

// ==================== 操作日志 ====================
let currentLogs = [];
let totalLogPages = 1;

async function loadLogs(page = 1) {
    const userFilter = document.getElementById('logUserFilter')?.value || '';
    const actionFilter = document.getElementById('logActionFilter')?.value || '';
    const startDate = document.getElementById('logStartDate')?.value || '';
    const endDate = document.getElementById('logEndDate')?.value || '';

    const params = new URLSearchParams({
        page: page,
        limit: 20
    });

    if (userFilter) params.append('user', userFilter);
    if (actionFilter) params.append('action', actionFilter);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    try {
        const result = await apiGet(`/api/logs?${params}`);
        currentLogs = result.logs || [];
        currentLogPage = result.page || 1;
        totalLogPages = result.totalPages || 1;

        renderLogs();
        renderLogPagination();
    } catch (err) {
        console.error('加载日志失败:', err);
    }
}

function renderLogs() {
    const tbody = document.getElementById('logTableBody');
    if (!tbody) return;

    if (currentLogs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">暂无日志记录</td></tr>';
        return;
    }

    tbody.innerHTML = currentLogs.map(log => `
        <tr>
            <td>${formatDateTime(log.createdAt)}</td>
            <td>${log.userName || '-'}</td>
            <td>${log.action}</td>
            <td>${log.details || '-'}</td>
            <td>${log.ip || '-'}</td>
        </tr>
    `).join('');
}

function renderLogPagination() {
    const container = document.getElementById('logPagination');
    if (!container) return;

    let html = `
        <button onclick="loadLogs(${currentLogPage - 1})" ${currentLogPage <= 1 ? 'disabled' : ''}>上一页</button>
        <span>第 ${currentLogPage} / ${totalLogPages} 页</span>
        <button onclick="loadLogs(${currentLogPage + 1})" ${currentLogPage >= totalLogPages ? 'disabled' : ''}>下一页</button>
    `;
    container.innerHTML = html;
}

function exportLogs() {
    if (currentLogs.length === 0) {
        alert('没有日志可导出');
        return;
    }

    const data = currentLogs.map(log => ({
        '时间': formatDateTime(log.createdAt),
        '用户': log.userName || '-',
        '操作': log.action,
        '详情': log.details || '-',
        'IP地址': log.ip || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '操作日志');
    XLSX.writeFile(wb, `操作日志_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// ==================== 数据备份 ====================
async function loadBackupList() {
    try {
        const backups = await apiGet('/api/backup/list');
        const tbody = document.getElementById('backupTableBody');
        if (!tbody) return;

        if (backups.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">暂无备份文件</td></tr>';
            return;
        }

        tbody.innerHTML = backups.map(b => `
            <tr>
                <td>${b.fileName}</td>
                <td>${(b.size / 1024).toFixed(2)} KB</td>
                <td>${formatDateTime(b.createdAt)}</td>
                <td>
                    <a href="/api/backup/download/${b.fileName}" class="btn-success" download>下载</a>
                    <button class="btn-danger" onclick="restoreBackup('${b.fileName}')">恢复</button>
                    <button class="btn-secondary" onclick="deleteBackup('${b.fileName}')">删除</button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        alert('加载备份列表失败: ' + err.message);
    }
}

async function createBackup() {
    try {
        const result = await apiGet('/api/backup');
        alert(`备份创建成功: ${result.fileName}`);
        loadBackupList();
    } catch (err) {
        alert('备份失败: ' + err.message);
    }
}

async function restoreBackup(fileName) {
    if (!confirm(`确定要从 ${fileName} 恢复数据吗？当前数据将被覆盖！`)) return;

    try {
        const result = await apiPost('/api/backup/restore', { fileName });
        if (result.success) {
            alert('数据恢复成功，请刷新页面');
            location.reload();
        }
    } catch (err) {
        alert('恢复失败: ' + err.message);
    }
}

async function deleteBackup(fileName) {
    if (!confirm(`确定要删除备份 ${fileName} 吗？`)) return;

    try {
        await apiDelete(`/api/backup/${fileName}`);
        loadBackupList();
    } catch (err) {
        alert('删除失败: ' + err.message);
    }
}

// ==================== 统计报表 ====================
async function loadStatistics() {
    const startDate = document.getElementById('statStartDate')?.value || '';
    const endDate = document.getElementById('statEndDate')?.value || '';

    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    try {
        const stats = await apiGet(`/api/statistics?${params}`);
        renderStatistics(stats);
    } catch (err) {
        console.error('加载统计失败:', err);
    }
}

function renderStatistics(stats) {
    // 渲染概览卡片
    const overviewContainer = document.getElementById('statOverview');
    if (overviewContainer) {
        overviewContainer.innerHTML = `
            <div class="stat-card">
                <div class="stat-icon">📊</div>
                <div class="stat-info">
                    <h3>总访客数</h3>
                    <p>${stats.total}</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: linear-gradient(135deg, #fa8c16 0%, #d46b08 100%);">⏳</div>
                <div class="stat-info">
                    <h3>待审核</h3>
                    <p>${stats.statusSummary.pending}</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);">📋</div>
                <div class="stat-info">
                    <h3>待安保确认</h3>
                    <p>${stats.statusSummary.approved}</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%);">✓</div>
                <div class="stat-info">
                    <h3>已完结</h3>
                    <p>${stats.statusSummary.completed}</p>
                </div>
            </div>
        `;
    }

    // 渲染部门统计图表
    renderDeptChart(stats.deptStats);

    // 渲染日期趋势图表
    renderDateChart(stats.dateStats);
}

function renderDeptChart(deptStats) {
    const container = document.getElementById('deptChart');
    if (!container) return;

    const depts = Object.entries(deptStats);
    if (depts.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#999;">暂无数据</p>';
        return;
    }

    // 简单的柱状图 HTML 实现
    const maxValue = Math.max(...depts.map(d => d[1].total));

    container.innerHTML = `
        <div class="chart-container">
            ${depts.map(([dept, data]) => `
                <div class="chart-bar-item">
                    <div class="chart-bar-label">${dept}</div>
                    <div class="chart-bar-wrapper">
                        <div class="chart-bar" style="width: ${(data.total / maxValue * 100).toFixed(1)}%;">
                            <span class="chart-bar-value">${data.total}</span>
                        </div>
                    </div>
                    <div class="chart-bar-detail">
                        待审:${data.pending} 通过:${data.approved} 拒绝:${data.rejected} 完成:${data.completed}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function renderDateChart(dateStats) {
    const container = document.getElementById('dateChart');
    if (!container) return;

    const dates = Object.entries(dateStats).sort((a, b) => a[0].localeCompare(b[0]));
    if (dates.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#999;">暂无数据</p>';
        return;
    }

    const maxValue = Math.max(...dates.map(d => d[1]));

    container.innerHTML = `
        <div class="date-chart-container">
            ${dates.map(([date, count]) => `
                <div class="date-chart-item">
                    <div class="date-chart-bar" style="height: ${(count / maxValue * 100).toFixed(1)}%;">
                        <span class="date-chart-value">${count}</span>
                    </div>
                    <div class="date-chart-label">${date.slice(5)}</div>
                </div>
            `).join('')}
        </div>
    `;
}
function getPositionName(position) {
    const positions = {
        'dept_manager': '科长',
        'dept_head': '部长',
        '': '普通员工'
    };
    return positions[position] || position;
}

// ==================== 用户批量导入 ====================
function downloadUserTemplate() {
    const template = [
        { '用户名': 'zhangsan', '姓名': '张三', '密码': '123456', '角色': 'staff', '职位': 'staff', '部门': '技术部', '电话': '13800138000' },
        { '用户名': 'lisi', '姓名': '李四', '密码': '123456', '角色': 'staff', '职位': 'dept_manager', '部门': '技术部', '电话': '13800138001' },
        { '用户名': 'wangwu', '姓名': '王五', '密码': '123456', '角色': 'staff', '职位': 'dept_head', '部门': '技术部', '电话': '13800138002' },
        { '用户名': '', '姓名': '', '密码': '', '角色': '', '职位': '', '部门': '', '电话': '' }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '用户导入模板');
    XLSX.writeFile(wb, '用户导入模板.xlsx');
}

function handleUserFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);

            if (jsonData.length === 0) {
                alert('文件中没有数据');
                return;
            }

            // 预览导入数据
            previewUserImport(jsonData);
        } catch (err) {
            alert('解析文件失败: ' + err.message);
        }
    };
    reader.readAsArrayBuffer(file);
}

function previewUserImport(data) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'userImportPreviewModal';

    // 转换数据
    const users = data.map(row => ({
        username: row['用户名'] || row['username'] || '',
        realName: row['姓名'] || row['realName'] || '',
        password: row['密码'] || row['password'] || '123456',
        role: row['角色'] || row['role'] || 'staff',
        position: row['职位'] || row['position'] || 'staff',
        department: row['部门'] || row['department'] || '',
        phone: row['电话'] || row['phone'] || ''
    })).filter(u => u.username && u.realName);

    if (users.length === 0) {
        alert('没有有效的用户数据，请检查文件格式');
        return;
    }

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 900px; max-height: 80vh; overflow: auto;">
            <span class="close" onclick="document.getElementById('userImportPreviewModal').remove()">&times;</span>
            <h2>用户导入预览</h2>
            <p>共 ${users.length} 条记录，请确认后导入</p>
            <table class="data-table" style="margin-top: 15px;">
                <thead>
                    <tr>
                        <th>用户名</th>
                        <th>姓名</th>
                        <th>角色</th>
                        <th>职位</th>
                        <th>部门</th>
                        <th>电话</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(u => `
                        <tr>
                            <td>${u.username}</td>
                            <td>${u.realName}</td>
                            <td>${getRoleName(u.role)}</td>
                            <td>${getPositionName(u.position)}</td>
                            <td>${u.department || '-'}</td>
                            <td>${u.phone || '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div class="form-actions" style="margin-top: 20px;">
                <button type="button" class="btn-secondary" onclick="document.getElementById('userImportPreviewModal').remove()">取消</button>
                <button type="button" class="btn-success" onclick="confirmUserImport()">确认导入</button>
            </div>
        </div>
    `;

    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    document.body.appendChild(modal);

    // 保存到全局变量
    window.pendingUserImport = users;
}

async function confirmUserImport() {
    const users = window.pendingUserImport;
    if (!users || users.length === 0) return;

    try {
        const result = await apiPost('/api/users/batch', { users });

        const successCount = result.results.filter(r => r.success).length;
        const failCount = result.results.filter(r => !r.success).length;

        alert(`导入完成：成功 ${successCount} 条，失败 ${failCount} 条`);

        document.getElementById('userImportPreviewModal')?.remove();
        window.pendingUserImport = null;

        // 刷新用户列表
        loadUserList();
    } catch (err) {
        alert('导入失败: ' + err.message);
    }
}

// ==================== 部门批量导入 ====================
function downloadDeptTemplate() {
    const template = [
        { '部门名称': '技术部', '科长姓名': '张三', '部长姓名': '李四', '员工列表(逗号分隔)': '王五,赵六,孙七' },
        { '部门名称': '销售部', '科长姓名': '王科长', '部长姓名': '钱部长', '员工列表(逗号分隔)': '赵六,钱七,孙八' },
        { '部门名称': '', '科长姓名': '', '部长姓名': '', '员工列表(逗号分隔)': '' }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '部门导入模板');
    XLSX.writeFile(wb, '部门导入模板.xlsx');
}

function handleDeptFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);

            if (jsonData.length === 0) {
                alert('文件中没有数据');
                return;
            }

            // 预览导入数据
            previewDeptImport(jsonData);
        } catch (err) {
            alert('解析文件失败: ' + err.message);
        }
    };
    reader.readAsArrayBuffer(file);
}

function previewDeptImport(data) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'deptImportPreviewModal';

    // 转换数据
    const departments = data.map(row => ({
        name: row['部门名称'] || row['部门'] || '',
        manager: row['科长姓名'] || row['科长'] || '',
        head: row['部长姓名'] || row['部长'] || '',
        staff: (row['员工列表(逗号分隔)'] || row['员工列表'] || row['员工'] || '').split(/[,，]/).map(s => s.trim()).filter(Boolean)
    })).filter(d => d.name);

    if (departments.length === 0) {
        alert('没有有效的部门数据，请检查文件格式');
        return;
    }

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 900px; max-height: 80vh; overflow: auto;">
            <span class="close" onclick="document.getElementById('deptImportPreviewModal').remove()">&times;</span>
            <h2>部门导入预览</h2>
            <p>共 ${departments.length} 条记录，请确认后导入</p>
            <table class="data-table" style="margin-top: 15px;">
                <thead>
                    <tr>
                        <th>部门名称</th>
                        <th>科长</th>
                        <th>部长</th>
                        <th>员工数</th>
                        <th>员工列表</th>
                    </tr>
                </thead>
                <tbody>
                    ${departments.map(d => `
                        <tr>
                            <td>${d.name}</td>
                            <td>${d.manager || '-'}</td>
                            <td>${d.head || '-'}</td>
                            <td>${d.staff.length}</td>
                            <td>${d.staff.join(', ') || '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div class="form-actions" style="margin-top: 20px;">
                <button type="button" class="btn-secondary" onclick="document.getElementById('deptImportPreviewModal').remove()">取消</button>
                <button type="button" class="btn-success" onclick="confirmDeptImport()">确认导入</button>
            </div>
        </div>
    `;

    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    document.body.appendChild(modal);

    // 保存到全局变量
    window.pendingDeptImport = departments;
}

async function confirmDeptImport() {
    const departments = window.pendingDeptImport;
    if (!departments || departments.length === 0) return;

    try {
        await apiPost('/api/departments/batch', { departments });

        alert(`成功导入 ${departments.length} 个部门`);

        document.getElementById('deptImportPreviewModal')?.remove();
        window.pendingDeptImport = null;

        // 刷新部门设置
        const options = await apiGet('/api/options');
        tempDeptStaff = JSON.parse(JSON.stringify(options.deptStaff || {}));
        renderDeptStaff();
    } catch (err) {
        alert('导入失败: ' + err.message);
    }
}

// ==================== 数据可视化图表 ====================
let trendChart = null;
let deptChart = null;

function renderVisitorCharts(visitors) {
    renderVisitorTrendChart(visitors);
    renderDeptVisitorChart(visitors);
}

// 近7日访客趋势图
function renderVisitorTrendChart(visitors) {
    const ctx = document.getElementById('visitorTrendChart');
    if (!ctx) return;

    // 生成近7天日期
    const dates = [];
    const counts = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        dates.push(dateStr.slice(5)); // 显示 MM-DD
        counts.push(visitors.filter(v => v.visitDate === dateStr).length);
    }

    if (trendChart) {
        trendChart.destroy();
    }

    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: '访客数量',
                data: counts,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#667eea'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// 部门访客统计图
function renderDeptVisitorChart(visitors) {
    const ctx = document.getElementById('deptVisitorChart');
    if (!ctx) return;

    // 统计各部门访客数量
    const deptStats = {};
    visitors.forEach(v => {
        const dept = v.visitedDept || '未分配';
        deptStats[dept] = (deptStats[dept] || 0) + 1;
    });

    // 取前6个部门，其余归为其他
    const sortedDepts = Object.entries(deptStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6);

    const labels = sortedDepts.map(d => d[0]);
    const data = sortedDepts.map(d => d[1]);

    // 配色方案
    const colors = [
        '#667eea', '#764ba2', '#f093fb', '#f5576c',
        '#4facfe', '#00f2fe', '#43e97b', '#fa709a'
    ];

    if (deptChart) {
        deptChart.destroy();
    }

    deptChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors.slice(0, labels.length),
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        boxWidth: 12,
                        padding: 10,
                        font: {
                            size: 12
                        }
                    }
                }
            }
        }
    });
}
