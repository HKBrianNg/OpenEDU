// client/src/home/mycalendar/components/EventList.tsx

import { Card, Empty, Tag, Button, Popconfirm } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { Dayjs } from 'dayjs';
import type { EventItem } from '../types';

interface Props {
  date: Dayjs;
  events: EventItem[];
  onAdd: () => void;       // + 按钮回调（以当前日期新增）
  onEdit: (event: EventItem) => void; // Edit 按钮回调
  onDelete: (id: string) => void;     // 删除按钮回调
  t: (key: string) => string;
}

const EventList: React.FC<Props> = ({ date, events, onAdd, onEdit, onDelete, t }) => {
  return (
    <Card
      title={`📅 ${date.format('YYYY年MM月DD日')}${t('mycalendar.scheduleOf')}`}
      style={{ marginBottom: 16 }}
      size="small"
      extra={
        <Button
          type="primary"
          size="small"
          icon={<PlusOutlined />}
          onClick={onAdd}
        >
          {t('mycalendar.add') || '新增'}
        </Button>
      }
    >
      {events.length === 0 ? (
        <Empty description={t('mycalendar.noSchedule')} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {events.map((event) => (
            <div
              key={event.id}
              style={{
                padding: '12px 8px',
                borderBottom: '1px solid #f0f0f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                {event.time && <Tag color="blue">{event.time}</Tag>}
                <strong>{event.title}</strong>
                <div style={{ color: '#888', fontSize: 12, marginTop: 4 }}>
                  {event.note}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Button type="link" size="small" onClick={() => onEdit(event)}>
                  {t('mycalendar.editBtn')}
                </Button>
                <Popconfirm
                  title={t('mycalendar.confirmDelete')}
                  onConfirm={() => onDelete(event.id)}
                >
                  <Button type="link" size="small" danger>
                    {t('mycalendar.delete')}
                  </Button>
                </Popconfirm>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default EventList;