// worker/src/constants/messages.js

const messages = {
  'zh-CN': {
    // 通用
    HEALTH_OK: '系统正常',
    INVALID_INPUT: '请填写邮箱和密码',
    INVALID_EMAIL: '邮箱格式不正确',
    WEAK_PASSWORD: '密码长度至少8位',
    NOT_FOUND: '接口不存在',
    INTERNAL_ERROR: '服务器内部错误',
    DB_CONNECT_SUCCESS: '数据库连接成功',

    // 认证
    EMAIL_ALREADY_EXISTS: '该邮箱已被注册',
    CODE_NOT_FOUND: '请先获取验证码',
    CODE_INVALID: '验证码无效或已过期',
    TOO_MANY_ATTEMPTS: '验证码错误次数过多，请重新获取',
    ALREADY_VERIFIED: '邮箱已验证',
    LOGIN_SUCCESS: '登录成功',
    INVALID_CREDENTIALS: '邮箱或密码错误',
    ACCOUNT_DISABLED: '账号已被禁用',
    ACCOUNT_PENDING: '账号正在等待管理员审核',
    ACCOUNT_PENDING_APPROVAL: '账号正在等待管理员审核',
    ACCOUNT_REJECTED: '注册申请未通过审核',
    USER_NOT_FOUND: '用户不存在',
    PASSWORD_RESET_SENT: '密码重置链接已发送到您的邮箱',
    RESET_SUCCESS: '密码重置成功',

    // JWT
    TOKEN_EXPIRED: '登录已过期，请重新登录',
    UNAUTHORIZED: '请先登录',
    FORBIDDEN: '权限不足',
    ACCOUNT_DELETED: '账号已注销',

    // Admin 用户管理
    USERS_LIST_RETRIEVED: '获取用户列表成功',
    USER_STATUS_UPDATED: '用户状态已更新',
    USER_ROLE_UPDATED: '用户角色已更新',
    INVALID_STATUS: '无效的状态值，可选: active, rejected, disabled',
    INVALID_ROLE: '无效的角色值，可选: reader, author, admin',
    CANNOT_MODIFY_SELF: '不能修改自己的状态或角色',
    USER_RETRIEVED: '获取用户成功',
    USER_UPDATED: '用户更新成功',
    USER_DELETED: '用户删除成功',
    EMAIL_TAKEN: '该邮箱已被使用',
    NICKNAME_TAKEN: '该昵称已被使用',

     // 认证通用
    EMAIL_EXISTS: '该邮箱已被注册', 
    NICKNAME_EXISTS: '该昵称已被使用',
    
    // 注册与邮件验证（核心改动）
    REGISTER_SUCCESS: '注册成功，请查收邮件完成验证', 
    EMAIL_SEND_FAILED: '验证邮件发送失败，请稍后重试',
    VERIFY_SUCCESS: '邮箱验证成功，请前往登录', 
    VERIFY_FAILED: '邮箱验证失败，链接无效或已过期',
    
    // 登录状态拦截
    EMAIL_NOT_VERIFIED: '账号未激活，请先查看邮件完成验证',

    // preferences
    PREFERENCES_RETRIEVED: '偏好设置获取成功',
    PREFERENCES_UPDATED: '偏好设置更新成功',
    PREFERENCES_NOT_FOUND: '偏好设置不存在',

    VERIFY_EXPIRED: '验证链接已过期，请重新注册',
   
    EMAIL_CHECKED: '邮箱检查成功',
    NICKNAME_CHECKED: '昵称检查成功',

    // Learning Progress
    PROGRESS_RETRIEVED: '学习进度获取成功',
    PROGRESS_UPDATED: '学习进度更新成功',
    PROGRESS_DELETED: '学习进度已删除',
    PROGRESS_STATS_RETRIEVED: '学习统计获取成功',
    PROGRESS_NOT_FOUND: '学习进度不存在',
    PROGRESS_INVALID_STATUS: '无效的状态值，可选: learning, mastered',
    MISSING_USER_ID: '缺少用户ID',
    MISSING_PARAMS: '缺少必要参数',

    // Calendar Events
    CALENDAR_EVENTS_RETRIEVED: '日程列表获取成功',
    CALENDAR_EVENT_RETRIEVED: '日程获取成功',
    CALENDAR_EVENT_CREATED: '日程创建成功',
    CALENDAR_EVENT_UPDATED: '日程更新成功',
    CALENDAR_EVENT_DELETED: '日程删除成功',
    CALENDAR_EVENT_NOT_FOUND: '日程不存在',
  },

  'en': {
    HEALTH_OK: 'System OK',
    INVALID_INPUT: 'Please provide email and password',
    INVALID_EMAIL: 'Invalid email format',
    WEAK_PASSWORD: 'Password must be at least 8 characters',
    NOT_FOUND: 'API endpoint not found',
    INTERNAL_ERROR: 'Internal server error',
    DB_CONNECT_SUCCESS: 'Database connection successful',

    EMAIL_ALREADY_EXISTS: 'This email is already registered',
    CODE_NOT_FOUND: 'Please get a verification code first',
    CODE_INVALID: 'Invalid or expired verification code',
    TOO_MANY_ATTEMPTS: 'Too many incorrect attempts, please request a new code',
    ALREADY_VERIFIED: 'Email already verified',
    LOGIN_SUCCESS: 'Login successful',
    INVALID_CREDENTIALS: 'Invalid email or password',
    ACCOUNT_DISABLED: 'Account has been disabled',
    ACCOUNT_PENDING: 'Account is pending admin approval',
    ACCOUNT_PENDING_APPROVAL: 'Account is pending admin approval',
    ACCOUNT_REJECTED: 'Registration request was not approved',
    USER_NOT_FOUND: 'User not found',
    PASSWORD_RESET_SENT: 'Password reset link has been sent to your email',
    RESET_SUCCESS: 'Password reset successful',

    TOKEN_EXPIRED: 'Login expired, please login again',
    UNAUTHORIZED: 'Please login first',
    FORBIDDEN: 'Insufficient permissions',
    ACCOUNT_DELETED: 'Account deleted', 

    // Admin User Management
    USERS_LIST_RETRIEVED: 'Users list retrieved successfully',
    USER_STATUS_UPDATED: 'User status updated',
    USER_ROLE_UPDATED: 'User role updated',
    INVALID_STATUS: 'Invalid status, options: active, rejected, disabled',
    INVALID_ROLE: 'Invalid role, options: reader, author, admin',
    CANNOT_MODIFY_SELF: 'Cannot modify your own status or role',
    USER_RETRIEVED: 'User retrieved successfully',
    USER_UPDATED: 'User updated successfully',
    USER_DELETED: 'User deleted successfully',
    EMAIL_TAKEN: 'Email already taken',
    NICKNAME_TAKEN: 'Nickname already taken',

    REGISTER_SUCCESS: 'Registration successful. Please check your email to verify.',
    EMAIL_SEND_FAILED: 'Failed to send verification email. Please try again.',
    VERIFY_SUCCESS: 'Email verified successfully. Please log in.',
    VERIFY_FAILED: 'Verification failed. Link is invalid or expired.',
    EMAIL_EXISTS: 'Email already registered.',
    NICKNAME_EXISTS: 'Nickname already taken.',
    EMAIL_NOT_VERIFIED: 'Account pending. Please verify your email first.',

    PREFERENCES_RETRIEVED: 'Preferences retrieved successfully',
    PREFERENCES_UPDATED: 'Preferences updated successfully',  
    PREFERENCES_NOT_FOUND: 'Preferences not found',

    VERIFY_EXPIRED: 'Verification link has expired. Please register again.',
    EMAIL_CHECKED: 'Email checked successfully',
    NICKNAME_CHECKED: 'Nickname checked successfully',
   
    // Learning Progress
    PROGRESS_RETRIEVED: 'Learning progress retrieved successfully',
    PROGRESS_UPDATED: 'Learning progress updated successfully',
    PROGRESS_DELETED: 'Learning progress deleted',
    PROGRESS_STATS_RETRIEVED: 'Learning statistics retrieved successfully',
    PROGRESS_NOT_FOUND: 'Learning progress not found',
    PROGRESS_INVALID_STATUS: 'Invalid status, options: learning, mastered',
    MISSING_USER_ID: 'Missing user ID',
    MISSING_PARAMS: 'Missing required parameters',

    // Calendar Events
    CALENDAR_EVENTS_RETRIEVED: 'Calendar events retrieved successfully',
    CALENDAR_EVENT_RETRIEVED: 'Calendar event retrieved successfully',
    CALENDAR_EVENT_CREATED: 'Calendar event created successfully',
    CALENDAR_EVENT_UPDATED: 'Calendar event updated successfully',
    CALENDAR_EVENT_DELETED: 'Calendar event deleted successfully',
    CALENDAR_EVENT_NOT_FOUND: 'Calendar event not found',
  },
};

function getMessage(code, lang = 'zh-CN') {
  return messages[lang]?.[code] || messages['zh-CN'][code] || code;
}

export { getMessage };