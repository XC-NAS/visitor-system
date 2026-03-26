// ==================== API 配置 ====================
const API_BASE = '';

async function apiGet(url) {
    const res = await fetch(API_BASE + url);
    return res.json();
}

async function apiPost(url, data) {
    const res = await fetch(API_BASE + url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return res.json();
}

async function apiPut(url, data) {
    const res = await fetch(API_BASE + url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return res.json();
}

async function apiDelete(url) {
    const res = await fetch(API_BASE + url, { method: 'DELETE' });
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
        'pending': { text: '待审核', class: 'status-pending' },
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
        alert('请输入用户名和密码');
        return;
    }
    try {
        const res = await apiPost('/api/login', { username, password });
        if (res.error) {
            alert(res.error);
            return;
        }
        currentUser = res;
        sessionStorage.setItem('currentUser', JSON.stringify(res));
        showMainApp();
    } catch (err) {
        alert('登录失败: ' + err.message);
    }
}

function logout() {
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
    if (currentUser.role === 'admin') {
        document.body.classList.add('user-admin');
    } else {
        document.body.classList.remove('user-admin');
    }
    loadDashboard();
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
        alert('请填写完整信息');
        return;
    }
    const settings = await apiGet('/api/settings');
    try {
        const result = await apiPost('/api/visitors', {
            name, phone, idCard, company, visitedOrg, visitedDept, visitedStaff,
            visitDate, visitTime, reason,
            status: settings.requireApproval ? 'pending' : 'approved',
            registeredBy: 'self'
        });
        document.getElementById('visitorSelfForm').style.display = 'none';
        document.getElementById('selfRegisterSuccess').style.display = 'block';
        document.getElementById('visitorCode').textContent = result.visitorCode;
    } catch (err) {
        alert('提交失败: ' + err.message);
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
    event.target.classList.add('active');
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
}

async function loadDashboard() {
    const visitors = await apiGet('/api/visitors');
    allVisitors = visitors;
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('todayVisitors').textContent = visitors.filter(v => v.visitDate === today).length;
    document.getElementById('currentVisitors').textContent = visitors.filter(v => v.status === 'arrived').length;
    document.getElementById('pendingApprovals').textContent = visitors.filter(v => v.status === 'pending').length;
    document.getElementById('monthVisitors').textContent = visitors.filter(v => v.visitDate && v.visitDate.startsWith(today.substring(0, 7))).length;
    const pendingCount = visitors.filter(v => v.status === 'pending').length;
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
    const company = document.getElementById('visitorCompany').value;
    const visitedOrg = document.getElementById('visitedOrg').value;
    const visitedDept = document.getElementById('visitedDepartment').value;
    const visitedStaff = document.getElementById('visitedPerson').value;
    const visitDate = document.getElementById('visitDate').value;
    const visitTime = document.getElementById('visitTime').value;
    const reason = document.getElementById('visitPurpose').value.trim();
    if (!name || !phone || !company || !visitedOrg || !visitedDept || !visitedStaff || !visitDate || !reason) {
        alert('请填写完整信息');
        return;
    }
    const settings = await apiGet('/api/settings');
    try {
        await apiPost('/api/visitors', {
            name, phone, idCard, company, visitedOrg, visitedDept, visitedStaff,
            visitDate, visitTime, reason,
            status: settings.requireApproval ? 'pending' : 'approved',
            photo: capturedPhoto,
            registeredBy: currentUser ? currentUser.username : 'self'
        });
        alert('登记成功');
        document.getElementById('visitorForm').reset();
        capturedPhoto = null;
        document.getElementById('photoPreview').style.display = 'none';
        stopCamera();
    } catch (err) {
        alert('登记失败: ' + err.message);
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
    document.getElementById('visitorDetail').innerHTML = `
        <p><strong>访客编号：</strong>${visitor.visitorCode}</p>
        <p><strong>姓名：</strong>${visitor.name}</p>
        <p><strong>电话：</strong>${visitor.phone}</p>
        <p><strong>身份证号：</strong>${visitor.idCard || '-'}</p>
        <p><strong>来访单位：</strong>${visitor.company}</p>
        <p><strong>被访单位：</strong>${visitor.visitedOrg}</p>
        <p><strong>被访部门：</strong>${visitor.visitedDept}</p>
        <p><strong>被访人：</strong>${visitor.visitedStaff}</p>
        <p><strong>来访事由：</strong>${visitor.reason}</p>
        <p><strong>预约时间：</strong>${visitor.visitDate} ${visitor.visitTime || ''}</p>
        <p><strong>状态：</strong>${getStatusBadge(visitor.status)}</p>
        <p><strong>登记时间：</strong>${formatDateTime(visitor.createdAt)}</p>
        ${visitor.photo ? `<p><strong>访客照片：</strong></p><img src="${visitor.photo}" style="max-width:200px;">` : ''}
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
    const filtered = allVisitors.filter(v => v.status === status);
    const listDiv = document.getElementById('approvalList');
    listDiv.innerHTML = filtered.map(v => `
        <div class="approval-card">
            <div class="approval-info">
                <h4>${v.name} - ${v.company}</h4>
                <p>被访人: ${v.visitedStaff} | 事由: ${v.reason}</p>
                <p>预约时间: ${v.visitDate} ${v.visitTime || ''}</p>
                <p>状态: ${getStatusBadge(v.status)}</p>
            </div>
            ${v.status === 'pending' ? `
            <div class="approval-actions">
                <button class="btn-success" onclick="approveVisitor(${v.id})">通过</button>
                <button class="btn-danger" onclick="rejectVisitor(${v.id})">拒绝</button>
            </div>
            ` : ''}
        </div>
    `).join('') || '<p style="text-align:center;color:#999;">暂无记录</p>';
}

function showApprovalTab(tab) {
    document.querySelectorAll('.approval-tabs .tab-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    renderApprovalList(tab);
}

async function approveVisitor(id) {
    await apiPut(`/api/visitors/${id}`, {
        status: 'approved',
        approvedBy: currentUser.username,
        approvedAt: new Date().toISOString()
    });
    loadApprovalList();
}

async function rejectVisitor(id) {
    await apiPut(`/api/visitors/${id}`, {
        status: 'rejected',
        approvedBy: currentUser.username,
        approvedAt: new Date().toISOString()
    });
    loadApprovalList();
}

// ==================== 安保进出登记 ====================
async function initSecurityCheckin() {
    const visitors = await apiGet('/api/visitors');
    allVisitors = visitors;
    renderSecurityLists();
}

function renderSecurityLists() {
    const approvedList = allVisitors.filter(v => v.status === 'approved');
    const arrivedList = allVisitors.filter(v => v.status === 'arrived');

    const container = document.getElementById('checkinResult');
    container.innerHTML = `
        <h3 style="margin: 20px 0 15px; color: #1890ff;">待到访访客 (${approvedList.length})</h3>
        ${approvedList.length > 0 ? approvedList.map(v => `
            <div class="visitor-card" style="margin-bottom: 15px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <h4 style="margin-bottom: 8px;">${v.name} - ${v.company}</h4>
                        <p style="color:#666;">被访人: ${v.visitedStaff} | 预约时间: ${v.visitDate} ${v.visitTime || ''}</p>
                        <p style="color:#666;">预约单号: <strong>${v.visitorCode}</strong></p>
                    </div>
                    <button class="btn-arrived" onclick="openSecurityCameraForVisitor(${v.id}, 'arrival')">登记到访</button>
                </div>
            </div>
        `).join('') : '<p style="color:#999; padding: 20px;">暂无待到访访客</p>'}

        <h3 style="margin: 30px 0 15px; color: #52c41a;">在访访客 (${arrivedList.length})</h3>
        ${arrivedList.length > 0 ? arrivedList.map(v => `
            <div class="visitor-card" style="margin-bottom: 15px; border-left: 4px solid #52c41a;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <h4 style="margin-bottom: 8px;">${v.name} - ${v.company}</h4>
                        <p style="color:#666;">被访人: ${v.visitedStaff}</p>
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
    if (currentSecurityAction === 'arrival') {
        await apiPut(`/api/visitors/${currentSecurityVisitor.id}`, {
            status: 'arrived',
            arrivalPhoto: securityPhoto,
            arrivalTime: new Date().toISOString()
        });
        alert('到访登记成功');
    } else if (currentSecurityAction === 'departure') {
        await apiPut(`/api/visitors/${currentSecurityVisitor.id}`, {
            status: 'completed',
            departurePhoto: securityPhoto,
            departureTime: new Date().toISOString()
        });
        alert('离场登记成功');
    }
    closeSecurityCameraModal();
    initSecurityCheckin();
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
    document.getElementById('reportPendingCount').textContent = currentReportData.filter(v => ['pending', 'approved'].includes(v.status)).length;
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
