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
                // 技术部 - 科长
                { id: 10, username: 'tech_manager', password: 'tech_manager', realName: '李科长', role: 'staff', department: '技术部', position: 'dept_manager', phone: '13800138010', status: 'active' },
                // 技术部 - 部长
                { id: 11, username: 'tech_head', password: 'tech_head', realName: '王部长', role: 'staff', department: '技术部', position: 'dept_head', phone: '13800138011', status: 'active' },
                // 技术部 - 普通员工
                { id: 12, username: 'zhangsan', password: 'zhangsan', realName: '张三', role: 'staff', department: '技术部', position: 'staff', phone: '13800138012', status: 'active' },
                { id: 13, username: 'lisi', password: 'lisi', realName: '李四', role: 'staff', department: '技术部', position: 'staff', phone: '13800138013', status: 'active' },
                // 销售部
                { id: 20, username: 'sales_manager', password: 'sales_manager', realName: '赵科长', role: 'staff', department: '销售部', position: 'dept_manager', phone: '13800138020', status: 'active' },
                { id: 21, username: 'sales_head', password: 'sales_head', realName: '钱部长', role: 'staff', department: '销售部', position: 'dept_head', phone: '13800138021', status: 'active' },
                { id: 22, username: 'zhaoliu', password: 'zhaoliu', realName: '赵六', role: 'staff', department: '销售部', position: 'staff', phone: '13800138022', status: 'active' },
                // 安保部
                { id: 4, username: 'security', password: 'security', realName: '安保队长', role: 'security', department: '安保部', position: 'staff', phone: '13800138003', status: 'active' },
                { id: 41, username: 'security2', password: 'security2', realName: '保安小李', role: 'security', department: '安保部', position: 'staff', phone: '13800138041', status: 'active' }
            ],
            visitors: [],
            settings: {
                requireApproval: true,
                approvalFlow: 'dept_chain',  // dept_chain: 部门科长-部长-被访人
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

// 保存数据
function saveDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// 获取数据
function getDB() {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

// 初始化
db = initDB();

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
// 获取访客列表（带权限过滤）
app.get('/api/visitors', (req, res) => {
    const data = getDB();
    const userId = req.headers['user-id'];
    const userRole = req.headers['user-role'];

    // 从数据库获取用户信息（避免header中的中文编码问题）
    const user = userId ? data.users.find(u => u.id == userId) : null;
    const userDept = user ? user.department : '';
    const userPosition = user ? user.position : '';
    const userName = user ? user.realName : '';

    let visitors = data.visitors;

    // 根据权限过滤
    if (userRole === 'staff') {
        // 员工只能看到需要他审核的或已完成的
        visitors = visitors.filter(v => {
            // 是本部门的访客申请
            if (v.visitedDept === userDept) {
                // 检查是否需要当前用户审核
                const pendingApproval = v.approvalChain?.find(a =>
                    a.status === 'pending' &&
                    ((a.role === 'dept_manager' && userPosition === 'dept_manager') ||
                     (a.role === 'dept_head' && userPosition === 'dept_head') ||
                     (a.role === 'host' && a.approverName === v.visitedStaff))
                );
                return pendingApproval || v.status === 'security_pending' || v.status === 'arrived' || v.status === 'completed';
            }
            // 或自己是被访人
            if (v.visitedStaff === userId || v.visitedStaff === userName) {
                return true;
            }
            return false;
        });
    } else if (userRole === 'security') {
        // 安保只能看到已通过全部审核的
        visitors = visitors.filter(v =>
            v.status === 'security_pending' ||
            v.status === 'arrived' ||
            v.status === 'completed'
        );
    }

    res.json(visitors.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

// 创建访客申请
app.post('/api/visitors', (req, res) => {
    const v = req.body;
    const data = getDB();
    const settings = data.settings;

    // 构建审核链
    const approvalChain = [];
    const deptConfig = data.options.deptStaff[v.visitedDept];

    if (settings.approvalFlow === 'dept_chain' && deptConfig) {
        // 科长审核
        approvalChain.push({
            level: 1,
            role: 'dept_manager',
            roleName: '科长',
            approverName: deptConfig.manager,
            status: 'pending',
            approvedAt: null,
            comment: null
        });
        // 部长审核
        approvalChain.push({
            level: 2,
            role: 'dept_head',
            roleName: '部长',
            approverName: deptConfig.head,
            status: 'pending',
            approvedAt: null,
            comment: null
        });
        // 被访人审核
        approvalChain.push({
            level: 3,
            role: 'host',
            roleName: '被访人',
            approverName: v.visitedStaff,
            status: 'pending',
            approvedAt: null,
            comment: null
        });
    }

    const visitor = {
        id: Date.now(),
        visitorCode: 'V' + Date.now().toString(36).toUpperCase(),
        name: v.name,
        phone: v.phone,
        idCard: v.idCard || '',
        company: v.company || '',  // 可选
        visitedOrg: v.visitedOrg,
        visitedDept: v.visitedDept,
        visitedStaff: v.visitedStaff,
        visitDate: v.visitDate,
        visitTime: v.visitTime || '',
        reason: v.reason,
        status: 'pending',
        approvalChain: approvalChain,
        currentApprovalLevel: 1,
        photo: v.photo || null,
        arrivalPhoto: null,
        departurePhoto: null,
        arrivalTime: null,
        departureTime: null,
        registeredBy: v.registeredBy || 'self',
        createdAt: new Date().toISOString()
    };

    data.visitors.push(visitor);
    saveDB(data);
    res.json({ id: visitor.id, visitorCode: visitor.visitorCode });
});

// 审核接口
app.post('/api/visitors/:id/approve', (req, res) => {
    const id = parseInt(req.params.id);
    const { action, comment, userId } = req.body;
    const data = getDB();
    const visitor = data.visitors.find(v => v.id === id);

    if (!visitor) {
        return res.status(404).json({ error: '访客不存在' });
    }

    const user = data.users.find(u => u.id === userId);
    if (!user) {
        return res.status(401).json({ error: '用户不存在' });
    }

    // 找到当前待审核的层级
    const currentApproval = visitor.approvalChain?.find(a => a.level === visitor.currentApprovalLevel);
    if (!currentApproval) {
        return res.status(400).json({ error: '没有待审核项' });
    }

    // 验证审核权限
    const isAuthorized = (
        (currentApproval.role === 'dept_manager' && user.position === 'dept_manager' && user.department === visitor.visitedDept) ||
        (currentApproval.role === 'dept_head' && user.position === 'dept_head' && user.department === visitor.visitedDept) ||
        (currentApproval.role === 'host' && (user.realName === visitor.visitedStaff || user.id.toString() === visitor.visitedStaff)) ||
        user.role === 'admin'
    );

    if (!isAuthorized) {
        return res.status(403).json({ error: '没有审核权限' });
    }

    if (action === 'approve') {
        // 通过审核
        currentApproval.status = 'approved';
        currentApproval.approvedAt = new Date().toISOString();
        currentApproval.comment = comment || '';
        currentApproval.approverId = userId;

        // 检查是否还有下一级
        const nextLevel = visitor.approvalChain.find(a => a.level === visitor.currentApprovalLevel + 1);
        if (nextLevel) {
            visitor.currentApprovalLevel++;
            visitor.status = `level${visitor.currentApprovalLevel}_pending`;
        } else {
            // 全部审核完成，流转到安保
            visitor.status = 'security_pending';
        }
    } else if (action === 'reject') {
        // 拒绝
        currentApproval.status = 'rejected';
        currentApproval.approvedAt = new Date().toISOString();
        currentApproval.comment = comment || '';
        currentApproval.approverId = userId;
        visitor.status = 'rejected';
    }

    saveDB(data);
    res.json({ success: true, status: visitor.status });
});

// 安保登记接口
app.post('/api/visitors/:id/security', (req, res) => {
    const id = parseInt(req.params.id);
    const { action, photo } = req.body;
    const data = getDB();
    const visitor = data.visitors.find(v => v.id === id);

    if (!visitor) {
        return res.status(404).json({ error: '访客不存在' });
    }

    if (action === 'arrival') {
        visitor.status = 'arrived';
        visitor.arrivalPhoto = photo;
        visitor.arrivalTime = new Date().toISOString();
    } else if (action === 'departure') {
        visitor.status = 'completed';
        visitor.departurePhoto = photo;
        visitor.departureTime = new Date().toISOString();
    }

    saveDB(data);
    res.json({ success: true });
});

// 更新访客信息
app.put('/api/visitors/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const updates = req.body;
    const data = getDB();
    const index = data.visitors.findIndex(v => v.id === id);
    if (index !== -1) {
        data.visitors[index] = { ...data.visitors[index], ...updates };
        saveDB(data);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: '访客不存在' });
    }
});

// 删除访客
app.delete('/api/visitors/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const data = getDB();
    data.visitors = data.visitors.filter(v => v.id !== id);
    saveDB(data);
    res.json({ success: true });
});

// ===== 用户管理接口 =====
app.get('/api/users', (req, res) => {
    const data = getDB();
    res.json(data.users.map(u => ({ ...u, password: undefined })));
});

app.post('/api/users', (req, res) => {
    const u = req.body;
    const data = getDB();
    const newUser = {
        id: Date.now(),
        username: u.username,
        password: u.password,
        realName: u.realName,
        role: u.role,
        department: u.department || '',
        position: u.position || 'staff',
        phone: u.phone || '',
        status: 'active'
    };
    data.users.push(newUser);
    saveDB(data);
    res.json({ id: newUser.id });
});

// 批量导入用户
app.post('/api/users/batch', (req, res) => {
    const { users } = req.body;
    const data = getDB();
    const results = [];

    users.forEach(u => {
        // 检查用户名是否已存在
        const existing = data.users.find(existingUser => existingUser.username === u.username);
        if (existing) {
            results.push({ username: u.username, success: false, error: '用户名已存在' });
            return;
        }

        const newUser = {
            id: Date.now() + Math.floor(Math.random() * 1000),
            username: u.username,
            password: u.password || '123456',
            realName: u.realName,
            role: u.role || 'staff',
            department: u.department || '',
            position: u.position || 'staff',
            phone: u.phone || '',
            status: 'active'
        };
        data.users.push(newUser);
        results.push({ username: u.username, success: true, id: newUser.id });
    });

    saveDB(data);
    res.json({ results });
});

app.put('/api/users/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const u = req.body;
    const data = getDB();
    const index = data.users.findIndex(user => user.id === id);
    if (index !== -1) {
        data.users[index] = { ...data.users[index], ...u };
        if (!u.password) delete data.users[index].password;
        saveDB(data);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: '用户不存在' });
    }
});

app.delete('/api/users/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const data = getDB();
    data.users = data.users.filter(u => u.id !== id);
    saveDB(data);
    res.json({ success: true });
});

// ===== 设置接口 =====
app.get('/api/settings', (req, res) => {
    const data = getDB();
    res.json(data.settings);
});

app.put('/api/settings', (req, res) => {
    const data = getDB();
    data.settings = { ...data.settings, ...req.body };
    saveDB(data);
    res.json({ success: true });
});

// ===== 选项接口 =====
app.get('/api/options', (req, res) => {
    const data = getDB();
    res.json(data.options);
});

app.put('/api/options', (req, res) => {
    const data = getDB();
    data.options = { ...data.options, ...req.body };
    saveDB(data);
    res.json({ success: true });
});

// 获取部门列表（结构化）
app.get('/api/departments', (req, res) => {
    const data = getDB();
    const depts = Object.keys(data.options.deptStaff || {});
    res.json(depts);
});

// 批量导入部门配置
app.post('/api/departments/batch', (req, res) => {
    const { departments } = req.body;
    const data = getDB();

    if (!data.options.deptStaff) {
        data.options.deptStaff = {};
    }

    departments.forEach(dept => {
        data.options.deptStaff[dept.name] = {
            manager: dept.manager || '',
            head: dept.head || '',
            staff: dept.staff || []
        };
    });

    saveDB(data);
    res.json({ success: true, count: departments.length });
});

// ===== 操作日志接口 =====
app.get('/api/logs', (req, res) => {
    const data = getDB();
    const logs = data.logs || [];
    const { page = 1, limit = 50, user, action, startDate, endDate } = req.query;

    let filtered = logs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (user) {
        filtered = filtered.filter(l => l.userName?.includes(user));
    }
    if (action) {
        filtered = filtered.filter(l => l.action?.includes(action));
    }
    if (startDate) {
        filtered = filtered.filter(l => l.createdAt >= startDate);
    }
    if (endDate) {
        filtered = filtered.filter(l => l.createdAt <= endDate + 'T23:59:59');
    }

    const start = (page - 1) * limit;
    const end = start + parseInt(limit);
    const paginated = filtered.slice(start, end);

    res.json({
        logs: paginated,
        total: filtered.length,
        page: parseInt(page),
        totalPages: Math.ceil(filtered.length / limit)
    });
});

// 添加日志函数
function addLog(userId, userName, action, details = '') {
    const data = getDB();
    if (!data.logs) data.logs = [];

    data.logs.push({
        id: Date.now(),
        userId,
        userName,
        action,
        details,
        ip: '', // 可由前端传入或从请求头获取
        createdAt: new Date().toISOString()
    });

    // 只保留最近1000条日志
    if (data.logs.length > 1000) {
        data.logs = data.logs.slice(-1000);
    }

    saveDB(data);
}

// 辅助函数：从user-id获取用户信息
function getUserFromHeader(data, req) {
    const userId = req.headers['user-id'];
    if (!userId) return null;
    return data.users.find(u => u.id == userId);
}

// ===== 数据备份接口 =====
app.get('/api/backup', (req, res) => {
    const data = getDB();
    const backupData = {
        ...data,
        backupAt: new Date().toISOString(),
        version: '1.0'
    };

    const backupName = `backup_${Date.now()}.json`;
    const backupPath = path.join(DATA_DIR, backupName);

    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));

    // 添加日志
    const user = getUserFromHeader(data, req);
    addLog(user?.id, user?.realName || '未知用户', '数据备份', `创建备份文件: ${backupName}`);

    res.json({
        success: true,
        fileName: backupName,
        downloadUrl: `/api/backup/download/${backupName}`
    });
});

// 下载备份文件
app.get('/api/backup/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(DATA_DIR, filename);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: '备份文件不存在' });
    }

    res.download(filePath, filename);
});

// 获取备份列表
app.get('/api/backup/list', (req, res) => {
    const files = fs.readdirSync(DATA_DIR)
        .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
        .map(f => {
            const stat = fs.statSync(path.join(DATA_DIR, f));
            return {
                fileName: f,
                size: stat.size,
                createdAt: stat.mtime
            };
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(files);
});

// 恢复数据
app.post('/api/backup/restore', (req, res) => {
    const { fileName } = req.body;
    const backupPath = path.join(DATA_DIR, fileName);

    if (!fs.existsSync(backupPath)) {
        return res.status(404).json({ error: '备份文件不存在' });
    }

    try {
        const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

        // 验证备份文件结构
        if (!backupData.users || !backupData.visitors) {
            return res.status(400).json({ error: '无效的备份文件' });
        }

        // 保存当前数据为临时备份
        const currentData = getDB();
        const tempBackupName = `temp_before_restore_${Date.now()}.json`;
        fs.writeFileSync(path.join(DATA_DIR, tempBackupName), JSON.stringify(currentData, null, 2));

        // 恢复数据（保留当前日志）
        const restoredData = {
            ...backupData,
            logs: currentData.logs || []
        };

        saveDB(restoredData);

        // 添加日志
        const user = getUserFromHeader(currentData, req);
        addLog(user?.id, user?.realName || '未知用户', '数据恢复', `从备份恢复: ${fileName}`);

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: '恢复失败: ' + err.message });
    }
});

// 删除备份文件
app.delete('/api/backup/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(DATA_DIR, filename);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: '备份文件不存在' });
    }

    fs.unlinkSync(filePath);

    const data = getDB();
    const user = getUserFromHeader(data, req);
    addLog(user?.id, user?.realName || '未知用户', '删除备份', `删除文件: ${filename}`);

    res.json({ success: true });
});

// ===== 批量操作接口 =====
// 批量审核
app.post('/api/visitors/batch/approve', (req, res) => {
    const { ids, action, comment, userId } = req.body;
    const data = getDB();
    const user = data.users.find(u => u.id === userId);

    if (!user) {
        return res.status(401).json({ error: '用户不存在' });
    }

    let successCount = 0;
    let failCount = 0;

    ids.forEach(id => {
        const visitor = data.visitors.find(v => v.id === id);
        if (!visitor) {
            failCount++;
            return;
        }

        const currentApproval = visitor.approvalChain?.find(a => a.level === visitor.currentApprovalLevel);
        if (!currentApproval || currentApproval.status !== 'pending') {
            failCount++;
            return;
        }

        // 验证权限
        const isAuthorized = (
            (currentApproval.role === 'dept_manager' && user.position === 'dept_manager' && user.department === visitor.visitedDept) ||
            (currentApproval.role === 'dept_head' && user.position === 'dept_head' && user.department === visitor.visitedDept) ||
            (currentApproval.role === 'host' && user.realName === visitor.visitedStaff) ||
            user.role === 'admin'
        );

        if (!isAuthorized) {
            failCount++;
            return;
        }

        if (action === 'approve') {
            currentApproval.status = 'approved';
            currentApproval.approvedAt = new Date().toISOString();
            currentApproval.comment = comment || '';
            currentApproval.approverId = userId;

            const nextLevel = visitor.approvalChain.find(a => a.level === visitor.currentApprovalLevel + 1);
            if (nextLevel) {
                visitor.currentApprovalLevel++;
                visitor.status = `level${visitor.currentApprovalLevel}_pending`;
            } else {
                visitor.status = 'security_pending';
            }
        } else if (action === 'reject') {
            currentApproval.status = 'rejected';
            currentApproval.approvedAt = new Date().toISOString();
            currentApproval.comment = comment || '';
            currentApproval.approverId = userId;
            visitor.status = 'rejected';
        }

        successCount++;
    });

    saveDB(data);

    // 添加日志
    addLog(userId, user.realName, '批量审核', `${action === 'approve' ? '通过' : '拒绝'} ${successCount} 条, 失败 ${failCount} 条`);

    res.json({ success: true, successCount, failCount });
});

// 批量删除访客
app.post('/api/visitors/batch/delete', (req, res) => {
    const { ids, userId } = req.body;
    const data = getDB();
    const user = data.users.find(u => u.id === userId);

    const originalCount = data.visitors.length;
    data.visitors = data.visitors.filter(v => !ids.includes(v.id));
    const deletedCount = originalCount - data.visitors.length;

    saveDB(data);

    if (user) {
        addLog(userId, user.realName, '批量删除访客', `删除 ${deletedCount} 条记录`);
    }

    res.json({ success: true, deletedCount });
});

// ===== 统计报表接口 =====
app.get('/api/statistics', (req, res) => {
    const data = getDB();
    const { startDate, endDate } = req.query;

    let visitors = data.visitors;
    if (startDate) {
        visitors = visitors.filter(v => v.visitDate >= startDate);
    }
    if (endDate) {
        visitors = visitors.filter(v => v.visitDate <= endDate);
    }

    // 按部门统计
    const deptStats = {};
    visitors.forEach(v => {
        if (!deptStats[v.visitedDept]) {
            deptStats[v.visitedDept] = { total: 0, pending: 0, approved: 0, rejected: 0, arrived: 0, completed: 0 };
        }
        deptStats[v.visitedDept].total++;
        if (v.status === 'pending' || v.status === 'level2_pending' || v.status === 'level3_pending') {
            deptStats[v.visitedDept].pending++;
        } else if (v.status === 'security_pending') {
            deptStats[v.visitedDept].approved++;
        } else if (v.status === 'rejected') {
            deptStats[v.visitedDept].rejected++;
        } else if (v.status === 'arrived') {
            deptStats[v.visitedDept].arrived++;
        } else if (v.status === 'completed') {
            deptStats[v.visitedDept].completed++;
        }
    });

    // 按日期统计
    const dateStats = {};
    visitors.forEach(v => {
        const date = v.visitDate;
        if (!dateStats[date]) {
            dateStats[date] = 0;
        }
        dateStats[date]++;
    });

    // 审核耗时统计
    const approvalTimeStats = [];
    visitors.filter(v => v.approvalChain).forEach(v => {
        v.approvalChain.forEach(a => {
            if (a.approvedAt && a.status !== 'pending') {
                const created = new Date(v.createdAt);
                const approved = new Date(a.approvedAt);
                const hours = Math.round((approved - created) / (1000 * 60 * 60) * 10) / 10;
                approvalTimeStats.push({
                    role: a.roleName,
                    hours: hours
                });
            }
        });
    });

    res.json({
        total: visitors.length,
        deptStats,
        dateStats,
        approvalTimeStats,
        statusSummary: {
            pending: visitors.filter(v => ['pending', 'level2_pending', 'level3_pending'].includes(v.status)).length,
            approved: visitors.filter(v => v.status === 'security_pending').length,
            rejected: visitors.filter(v => v.status === 'rejected').length,
            arrived: visitors.filter(v => v.status === 'arrived').length,
            completed: visitors.filter(v => v.status === 'completed').length
        }
    });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
    console.log(`数据文件位置: ${DB_FILE}`);
});
