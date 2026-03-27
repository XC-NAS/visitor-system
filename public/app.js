
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
