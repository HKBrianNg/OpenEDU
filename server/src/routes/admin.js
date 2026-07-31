// server/src/routes/admin.js
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { getUsers, setUserStatus, setUserRole } from '../controllers/admin.js';

const router = Router();

// 所有管理员接口都需要登录 + admin 角色
router.use(authenticate, authorize('admin'));

router.get('/users', getUsers);
router.put('/users/:id/status', setUserStatus);
router.put('/users/:id/role', setUserRole);

export default router;