// 访客数据结构示例（新审核流程）
const visitorExample = {
    id: 123,
    visitorCode: 'VABC123',
    name: '访客姓名',
    phone: '13800138000',
    // ... 其他基本信息

    // 新审核流程
    approvalChain: [
        {
            level: 1,
            role: 'dept_manager',      // 科长
            approverId: 10,
            approverName: '李科长',
            status: 'approved',         // pending/approved/rejected
            approvedAt: '2024-01-15T10:00:00Z',
            comment: '同意'
        },
        {
            level: 2,
            role: 'dept_head',         // 部长
            approverId: 11,
            approverName: '王部长',
            status: 'approved',
            approvedAt: '2024-01-15T11:00:00Z',
            comment: '同意'
        },
        {
            level: 3,
            role: 'host',              // 被访人
            approverId: 12,
            approverName: '张三',
            status: 'pending',
            approvedAt: null,
            comment: null
        }
    ],

    // 当前状态
    status: 'pending',  // pending / dept_manager_approved / dept_head_approved / host_approved / security_pending / arrived / completed / rejected

    // 保安登记
    securityStatus: 'pending',  // pending / arrived / completed
    arrivalPhoto: null,
    departurePhoto: null,
    arrivalTime: null,
    departureTime: null
};
