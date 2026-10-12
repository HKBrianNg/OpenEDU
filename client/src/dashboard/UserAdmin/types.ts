// client/src/dashboard/UserAdmin/types.ts

export interface UserRecord {
  id: string;
  email: string;
  nickname: string;
  role: 'user' | 'admin';
  status: 'active' | 'disabled' | 'pending';
  created_at: string;
}
