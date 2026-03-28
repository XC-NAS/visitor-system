const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// 数据目录
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

// 数据文件路径
const DB_FILE = path.join(DATA_DIR, 'database.json');

// 初始化数据
function initDB() {
    if (!fs.existsSync(DB_FILE)) {
        const defaultData = {
            users: [
                { id: 1, username: 'admin', password: 'admin', realName: '系统管理员', role: 'admin', department: '管理部', position: 'admin', phone: '13800138000', status: 'active' },
                { id: 2, username: 'front', password: 'front', realName: '前台接待', role: 'front', department: '前台', position: 'staff', phone: '13800138001', status: 'active' },
                { id: 10, username: 'tech_manager', password: 'tech_manager', realName: '李科长', role: 'staff', department: '技术部', position: 'dept_manager', phone: '13800138010', status: 'active' },
                { id: 11, username: 'tech_head', password: 'tech_head', realName: '王部长', role: 'staff', department: '技术部', position: 'dept_head', phone: '13800138011', status: 'active' },
                { id: 12, username: 'zhangsan', password: 'zhangsan', realName: '张三', role: 'staff', department: '技术部', position: 'staff', phone: '13800138012', status: 'active' },
                { id: 13, username: 'lisi', password: 'lisi', realName: '李四', role: 'staff', department: '技术部', position: 'staff', phone: '13800138013', status: 'active' },
                { id: 20, username: 'sales_manager', password: 'sales_manager', realName: '赵科长', role: 'staff', department: '销售部', position: 'dept_manager', phone: '13800138020', status: 'active' },
                { id: 21, username: 'sales_head', password: 'sales_head', realName: '钱部长', role: 'staff', department: '销售部', position: 'dept_head', phone: '13800138021', status: 'active' },
                { id: 22, username: 'zhaoliu', password: 'zhaoliu', realName: '赵六', role: 'staff', department: '销售部', position: 'staff', phone: '13800138022', status: 'active' },
                { id: 4, username: 'security', password: 'security', realName: '安保队长', role: 'security', department: '安保部', position: 'staff', phone: '13800138003', status: 'active' },
                { id: 41, username: 'security2', password: 'security2', realName: '保安小李', role: 'security', department: '安保部', position: 'staff', phone: '13800138041', status: 'active' }
            ],
            visitors: [],
            blacklist: [],
            notifications: [],
            operationLogs: [],
            settings: {
                requireApproval: true,
                approvalFlow: 'dept_chain',
                requirePhoto: true,
                savePhotos: true
            },
            options: {
                visitedOrgs: ['本公司总部', '分公司A', '分公司B'],
                deptStaff: {
                    '技术部': { manager: '李科长', head: '王部长', staff: ['张三', '李四', '王五'] },
                    '销售部': { manager: '赵科长', head: '钱部长', staff: ['赵六', '钱七'] },
                    '人事部': { manager: '孙科长', head: '周部长', staff: ['孙八'] },
                    '财务部': { manager: '吴科长', head: '郑部长', staff: ['周九', '吴十'] }
                }
            }
        };
        fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2));
        return defaultData;
    }
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function saveDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function getDB() {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

db = initDB();

// 添加操作日志
function addLog(action, details, userId, username) {
    const data = getDB();
    if (!data.operationLogs) data.operationLogs = [];
    data.operationLogs.push({
        id: Date.now(),
        action,
        details,
        userId,
        username,
        createdAt: new Date().toISOString()
    });
    // 只保留最近1000条日志
    if (data.operationLogs.length > 1000) {
        data.operationLogs = data.operationLogs.slice(-1000);
    }
    saveDB(data);
}

// 获取用户信息（从请求头）
function getUserFromHeader(req) {
    const userId = req.headers['user-id'];
    const userRole = req.headers['user-role'];
    if (!userId) return null;
    const data = getDB();
    const user = data.users.find(u => u.id == userId);
    if (user) {
        return {
            id: user.id,
            username: user.username,
            realName: user.realName,
            role: user.role,
            department: user.department,
            position: user.position
        };
    }
    return { id: userId, role: userRole };
}

// ===== 登录接口 =====
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const data = getDB();
    const user = data.users.find(u => u.username === username && u.password === password && u.status === 'active');
    if (user) {
        res.json({
            id: user.id,
            username: user.username,
            realName: user.realName,
            role: user.role,
            department: user.department,
            position: user.position,
            phone: user.phone
        });
    } else {
        res.status(401).json({ error: '用户名或密码错误' });
    }
});

// ===== 访客管理接口 =====
app.get('/api/visitors', (req, res) => {
    const data = getDB();
    const user = getUserFromHeader(req);
    let visitors = data.visitors || [];

    if (!user) return res.json([]);
    if (user.role === 'admin' || user.role === 'front' || user.role === 'security') {
        return res.json(visitors);
    }
    if (user.role === 'staff') {
        const filtered = visitors.filter(v => {
            if (v.status === 'rejected') return false;
            if (v.visitedDept === user.department) return true;
            if (v.visitedStaff === user.realName || v.visitedStaff === user.username) return true;
            return false;
        });
        return res.json(filtered);
    }
    res.json([]);
});

// 检查黑名单
function checkBlacklist(phone, idCard) {
    const data = getDB();
    const blacklist = data.blacklist || [];
    return blacklist.find(b => {
        if (phone && b.phone === phone) return true;
        if (idCard && b.idCard === idCard) return true;
        return false;
    });
}

// 添加通知
function addNotification(type, title, message, recipientId, recipientRole, data = {}) {
    const dbData = getDB();
    if (!dbData.notifications) dbData.notifications = [];
    dbData.notifications.push({
        id: Date.now(),
        type,
        title,
        message,
        recipientId,
        recipientRole,
        data,
        isRead: false,
        createdAt: new Date().toISOString()
    });
    saveDB(dbData);
}

// 创建访客
app.post('/api/visitors', (req, res) => {
    const data = getDB();
    const visitor = req.body;

    // 检查黑名单
    const blacklisted = checkBlacklist(visitor.phone, visitor.idCard);
    if (blacklisted) {
        return res.status(403).json({
            error: '该访客已被列入黑名单，禁止预约',
            blacklistReason: blacklisted.reason
        });
    }

    visitor.id = Date.now();
    visitor.visitorCode = 'V' + Math.random().toString(36).substr(2, 8).toUpperCase();
    visitor.createdAt = new Date().toISOString();
    visitor.arrivalTime = null;
    visitor.departureTime = null;
    visitor.arrivalPhoto = null;
    visitor.departurePhoto = null;
    visitor.approvalChain = [];

    if (visitor.status === 'pending') {
        visitor.approvalChain = [
            { level: 1, role: 'dept_manager', status: 'pending', approverId: null, approverName: null, approvedAt: null, comment: null },
            { level: 2, role: 'dept_head', status: 'pending', approverId: null, approverName: null, approvedAt: null, comment: null },
            { level: 3, role: 'host', status: 'pending', approverId: null, approverName: null, approvedAt: null, comment: null }
        ];
    }

    data.visitors.push(visitor);
    saveDB(data);

    // 发送通知给相关审核人
    if (visitor.status === 'pending') {
        const deptStaff = data.options?.deptStaff?.[visitor.visitedDept];
        if (deptStaff) {
            const manager = data.users.find(u => u.realName === deptStaff.manager || u.username === deptStaff.manager);
            if (manager) {
                addNotification(
                    'approval_required',
                    '新访客待审核',
                    `访客 ${visitor.name} 申请访问 ${visitor.visitedDept}，等待您审核`,
                    manager.id,
                    null,
                    { visitorId: visitor.id, visitorCode: visitor.visitorCode }
                );
            }
        }
    }

    addLog('create_visitor', `创建访客登记: ${visitor.name}`, req.headers['user-id'], null);
    res.json(visitor);
});

// 更新访客状态（审核）
app.put('/api/visitors/:id', (req, res) => {
    const data = getDB();
    const visitor = data.visitors.find(v => v.id == req.params.id);
    if (!visitor) return res.status(404).json({ error: '访客不存在' });

    const updates = req.body;
    const user = getUserFromHeader(req);

    Object.assign(visitor, updates);

    // 更新审批链
    if (updates.approvalChain && user) {
        const currentLevel = visitor.approvalChain.find(l => l.status === 'pending');
        if (currentLevel) {
            currentLevel.status = updates.status === 'approved' ? 'approved' : 'rejected';
            currentLevel.approverId = user.id;
            currentLevel.approverName = user.realName || user.username;
            currentLevel.approvedAt = new Date().toISOString();
            currentLevel.comment = updates.comment || '';

            // 发送通知给下一级
            if (updates.status === 'approved') {
                const nextLevel = visitor.approvalChain.find(l => l.level === currentLevel.level + 1);
                if (nextLevel) {
                    const nextApprovers = data.users.filter(u => {
                        if (nextLevel.role === 'host') return u.realName === visitor.visitedStaff;
                        if (nextLevel.role === 'dept_head') {
                            const deptStaff = data.options?.deptStaff?.[visitor.visitedDept];
                            return u.realName === deptStaff?.head;
                        }
                        return false;
                    });
                    nextApprovers.forEach(approver => {
                        addNotification(
                            'approval_required',
                            '访客审核待处理',
                            `访客 ${visitor.name} 已通过上级审核，等待您审核`,
                            approver.id,
                            null,
                            { visitorId: visitor.id, visitorCode: visitor.visitorCode }
                        );
                    });
                }
            }
        }
    }

    saveDB(data);
    addLog('update_visitor', `更新访客状态: ${visitor.name} -> ${updates.status}`, req.headers['user-id'], null);
    res.json(visitor);
});

// 删除访客
app.delete('/api/visitors/:id', (req, res) => {
    const data = getDB();
    const visitor = data.visitors.find(v => v.id == req.params.id);
    if (!visitor) return res.status(404).json({ error: '访客不存在' });

    data.visitors = data.visitors.filter(v => v.id != req.params.id);
    saveDB(data);
    addLog('delete_visitor', `删除访客: ${visitor.name}`, req.headers['user-id'], null);
    res.json({ success: true });
});

// ===== 黑名单管理 =====
app.get('/api/blacklist', (req, res) => {
    const data = getDB();
    res.json(data.blacklist || []);
});

app.post('/api/blacklist', (req, res) => {
    const data = getDB();
    if (!data.blacklist) data.blacklist = [];
    const entry = {
        id: Date.now(),
        ...req.body,
        createdAt: new Date().toISOString()
    };
    data.blacklist.push(entry);
    saveDB(data);
    addLog('add_blacklist', `添加黑名单: ${entry.name}`, req.headers['user-id'], null);
    res.json(entry);
});

app.delete('/api/blacklist/:id', (req, res) => {
    const data = getDB();
    const entry = data.blacklist?.find(b => b.id == req.params.id);
    if (!entry) return res.status(404).json({ error: '记录不存在' });

    data.blacklist = data.blacklist.filter(b => b.id != req.params.id);
    saveDB(data);
    addLog('remove_blacklist', `移除黑名单: ${entry.name}`, req.headers['user-id'], null);
    res.json({ success: true });
});

// ===== 通知接口 =====
app.get('/api/notifications', (req, res) => {
    const data = getDB();
    const user = getUserFromHeader(req);
    if (!user) return res.json([]);

    const notifications = (data.notifications || [])
        .filter(n => !n.isRead && (n.recipientId === user.id || n.recipientRole === user.role))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 20);
    res.json(notifications);
});

app.put('/api/notifications/:id/read', (req, res) => {
    const data = getDB();
    const notification = data.notifications?.find(n => n.id == req.params.id);
    if (notification) {
        notification.isRead = true;
        saveDB(data);
    }
    res.json({ success: true });
});

// ===== 操作日志接口 =====
app.get('/api/logs', (req, res) => {
    const data = getDB();
    const { page = 1, limit = 20 } = req.query;
    const logs = (data.operationLogs || [])
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const start = (page - 1) * limit;
    const paginatedLogs = logs.slice(start, start + parseInt(limit));
    res.json({
        logs: paginatedLogs,
        total: logs.length,
        page: parseInt(page),
        totalPages: Math.ceil(logs.length / limit)
    });
});

// ===== 用户管理 =====
app.get('/api/users', (req, res) => {
    const data = getDB();
    res.json(data.users.map(u => ({ ...u, password: undefined })));
});

app.post('/api/users', (req, res) => {
    const data = getDB();
    const user = { id: Date.now(), ...req.body, status: 'active' };
    data.users.push(user);
    saveDB(data);
    addLog('create_user', `创建用户: ${user.username}`, req.headers['user-id'], null);
    res.json(user);
});

app.put('/api/users/:id', (req, res) => {
    const data = getDB();
    const user = data.users.find(u => u.id == req.params.id);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    Object.assign(user, req.body);
    saveDB(data);
    addLog('update_user', `更新用户: ${user.username}`, req.headers['user-id'], null);
    res.json(user);
});

app.delete('/api/users/:id', (req, res) => {
    const data = getDB();
    const user = data.users.find(u => u.id == req.params.id);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    data.users = data.users.filter(u => u.id != req.params.id);
    saveDB(data);
    addLog('delete_user', `删除用户: ${user.username}`, req.headers['user-id'], null);
    res.json({ success: true });
});

// 批量创建用户
app.post('/api/users/batch', (req, res) => {
    const data = getDB();
    const results = [];
    req.body.users.forEach(user => {
        const existing = data.users.find(u => u.username === user.username);
        if (existing) {
            results.push({ success: false, username: user.username, error: '用户名已存在' });
        } else {
            const newUser = { id: Date.now() + Math.random(), ...user, status: 'active' };
            data.users.push(newUser);
            results.push({ success: true, username: user.username, id: newUser.id });
        }
    });
    saveDB(data);
    addLog('batch_create_users', `批量创建 ${results.filter(r => r.success).length} 个用户`, req.headers['user-id'], null);
    res.json({ results });
});

// ===== 设置与选项 =====
app.get('/api/settings', (req, res) => {
    const data = getDB();
    res.json(data.settings);
});

app.put('/api/settings', (req, res) => {
    const data = getDB();
    data.settings = { ...data.settings, ...req.body };
    saveDB(data);
    addLog('update_settings', '更新系统设置', req.headers['user-id'], null);
    res.json(data.settings);
});

app.get('/api/options', (req, res) => {
    const data = getDB();
    res.json(data.options);
});

app.put('/api/options', (req, res) => {
    const data = getDB();
    data.options = { ...data.options, ...req.body };
    saveDB(data);
    addLog('update_options', '更新选项配置', req.headers['user-id'], null);
    res.json(data.options);
});

// 批量导入部门
app.post('/api/departments/batch', (req, res) => {
    const data = getDB();
    if (!data.options.deptStaff) data.options.deptStaff = {};
    req.body.departments.forEach(dept => {
        data.options.deptStaff[dept.name] = {
            manager: dept.manager,
            head: dept.head,
            staff: dept.staff || []
        };
    });
    saveDB(data);
    addLog('batch_import_departments', `批量导入 ${req.body.departments.length} 个部门`, req.headers['user-id'], null);
    res.json({ success: true });
});

// ===== 启动服务器 =====
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
