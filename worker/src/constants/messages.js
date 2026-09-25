const messages = {
  'zh-CN': {
    // 通用
    INVALID_INPUT: '请填写邮箱和密码',
    INVALID_EMAIL: '邮箱格式不正确',
    WEAK_PASSWORD: '密码长度至少8位',
    NOT_FOUND: '接口不存在',
    INTERNAL_ERROR: '服务器内部错误',

    // 认证
    REGISTER_SUCCESS: '注册成功，请查看邮箱验证码',
    EMAIL_ALREADY_EXISTS: '该邮箱已被注册',
    VERIFICATION_SENT: '验证码已发送到您的邮箱',
    VERIFY_SUCCESS: '邮箱验证成功',
    CODE_INCORRECT: '验证码错误',
    CODE_EXPIRED: '验证码已过期',
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
    EMAIL_NOT_VERIFIED: '请先验证邮箱',
    USER_NOT_FOUND: '用户不存在',
    PASSWORD_RESET_SENT: '密码重置链接已发送到您的邮箱',
    RESET_SUCCESS: '密码重置成功',

    // JWT
    TOKEN_EXPIRED: '登录已过期，请重新登录',
    UNAUTHORIZED: '请先登录',
    FORBIDDEN: '权限不足',
    ACCOUNT_DELETED: '账号已注销',

    USERS_LIST_RETRIEVED: '获取用户列表成功',
    USER_STATUS_UPDATED: '用户状态已更新',
    USER_ROLE_UPDATED: '用户角色已更新',
    INVALID_STATUS: '无效的状态值，可选: active, rejected, disabled',
    INVALID_ROLE: '无效的角色值，可选: reader, author, admin',
    CANNOT_MODIFY_SELF: '不能修改自己的状态或角色',

  },

  'en': {
    INVALID_INPUT: 'Please provide email and password',
    INVALID_EMAIL: 'Invalid email format',
    WEAK_PASSWORD: 'Password must be at least 8 characters',
    NOT_FOUND: 'API endpoint not found',
    INTERNAL_ERROR: 'Internal server error',

    REGISTER_SUCCESS: 'Registration successful, please check your email for verification code',
    EMAIL_ALREADY_EXISTS: 'This email is already registered',
    VERIFICATION_SENT: 'Verification code has been sent to your email',
    VERIFY_SUCCESS: 'Email verified successfully',
    CODE_INCORRECT: 'Incorrect verification code',
    CODE_EXPIRED: 'Verification code has expired',
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
    EMAIL_NOT_VERIFIED: 'Please verify your email first',
    USER_NOT_FOUND: 'User not found',
    PASSWORD_RESET_SENT: 'Password reset link has been sent to your email',
    RESET_SUCCESS: 'Password reset successful',

    TOKEN_EXPIRED: 'Login expired, please login again',
    UNAUTHORIZED: 'Please login first',
    FORBIDDEN: 'Insufficient permissions',
    ACCOUNT_DELETED: 'Account deleted', 

    USERS_LIST_RETRIEVED: 'Users list retrieved successfully',
    USER_STATUS_UPDATED: 'User status updated',
    USER_ROLE_UPDATED: 'User role updated',
    INVALID_STATUS: 'Invalid status, options: active, rejected, disabled',
    INVALID_ROLE: 'Invalid role, options: reader, author, admin',
    CANNOT_MODIFY_SELF: 'Cannot modify your own status or role',
  },
};

function getMessage(code, lang = 'zh-CN') {
  return messages[lang]?.[code] || messages['zh-CN'][code] || code;
}

export { getMessage };

