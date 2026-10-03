// client/src/dashboard/AdminConsole/AdminConsole.tsx

import { Button } from 'antd';
import { useLocale } from '../../store/LocaleContext';

interface AdminConsoleProps {
  onExit?: () => void;
}

export default function AdminConsole({ onExit }: AdminConsoleProps) {
  const { t } = useLocale();

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        {onExit && (
          <Button
            onClick={onExit}
            style={{
              borderRadius: 99,
              border: '1px solid #d0d0d0',
              background: '#fff',
              color: '#333',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            ← {t('Dashboard.AdminConsole.backToDashboard')}
          </Button>
        )}
      </div>
      <h1>Admin Console</h1>
    </div>
  );
}