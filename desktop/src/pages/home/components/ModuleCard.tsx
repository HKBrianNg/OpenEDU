// ModuleCard.tsx
import { Card } from 'antd';
import { useNavigate } from 'react-router-dom';

interface Props {
  title: string;
  description: string;
  gradient: string;
  icon: React.ReactNode;
  route: string;
}

export function ModuleCard({ title, description, gradient, icon, route }: Props) {
  const navigate = useNavigate();
  return (
    <Card
      hoverable
      onClick={() => navigate(route)}
      styles={{ body: { padding: '12px' } }}
      style={{ borderRadius: 12, overflow: 'hidden' }}
    >
      <div
        style={{
          height: 72,  // 固定，不再自适应撑很大
          background: gradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '-12px -12px 8px -12px',
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 12, color: '#666' }}>{description}</div>
      </div>
    </Card>
  );
}
