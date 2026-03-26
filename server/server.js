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
                { id: 1, username: 'admin', password: 'admin', realName: '系统管理员', role: 'admin', department: '管理部', phone: '13800138000', status: 'active' },
                { id: 2, username: 'front', password: 'front', realName: '前台接待', role: 'front', department: '前台', phone: '13800138001', status: 'active' },
                { id: 3, username: 'staff', password: 'staff', realName: '普通员工', role: 'staff', department: '技术部', phone: '13800138002', status: 'active' },
                { id: 4, username: 'security', password: 'security', realName: '安保人员', role: 'security', department: '安保部', phone: '13800138003', status: 'active' }
            ],
            visitors: [],
            settings: {
                requireApproval: true,
                approvalLevel: '1',
                requirePhoto: true,
                savePhotos: true,
                level1Approvers: [],
                level2Approvers: []
            },
            options: {
                visitorCompanies: ['阿里巴巴', '腾讯科技', '百度公司', '字节跳动', '华为技术'],
                visitedOrgs: ['本公司总部', '分公司A', '分公司B'],
                deptStaff: {
                    '技术部': ['张三', '李四', '王五'],
                    '销售部': ['赵六', '钱七'],
                    '人事部': ['孙八'],
                    '财务部': ['周九', '吴十']
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
            phone: user.phone
        });
    } else {
        res.status(401).json({ error: '用户名或密码错误' });
    }
});

// ===== 访客管理接口 =====
app.get('/api/visitors', (req, res) => {
    const data = getDB();
    res.json(data.visitors.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

app.post('/api/visitors', (req, res) => {
    const v = req.body;
    const data = getDB();
    const visitor = {
        id: Date.now(),
        visitorCode: 'V' + Date.now().toString(36).toUpperCase(),
        name: v.name,
        phone: v.phone,
        idCard: v.idCard || '',
        company: v.company,
        visitedOrg: v.visitedOrg,
        visitedDept: v.visitedDept,
        visitedStaff: v.visitedStaff,
        visitDate: v.visitDate,
        visitTime: v.visitTime || '',
        reason: v.reason,
        status: v.status || 'pending',
        photo: v.photo || null,
        arrivalPhoto: null,
        departurePhoto: null,
        arrivalTime: null,
        departureTime: null,
        registeredBy: v.registeredBy || 'self',
        approvedBy: null,
        approvedAt: null,
        createdAt: new Date().toISOString()
    };
    data.visitors.push(visitor);
    saveDB(data);
    res.json({ id: visitor.id, visitorCode: visitor.visitorCode });
});

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
        phone: u.phone || '',
        status: 'active'
    };
    data.users.push(newUser);
    saveDB(data);
    res.json({ id: newUser.id });
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

// 启动服务器
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
    console.log(`数据文件位置: ${DB_FILE}`);
});
