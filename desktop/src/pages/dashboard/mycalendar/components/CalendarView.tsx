import { Calendar, Badge } from 'antd';
import { Dayjs } from 'dayjs';
import type { EventItem } from '../types';

interface Props {
  events: EventItem[];
  onSelectDate: (date: Dayjs) => void;
}

const CalendarView: React.FC<Props> = ({ events, onSelectDate }) => {
  const getEventsForDate = (date: Dayjs) =>
    events.filter((e) => e.date === date.format('YYYY-MM-DD'));

  const cellRender = (date: Dayjs) => {
    const dayEvents = getEventsForDate(date);
    if (!dayEvents.length) return null;

    return (
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, textAlign: 'center' }}>
        {dayEvents.slice(0, 3).map((event, idx) => (
          <li key={event.id}>
            <Badge
              dot
              color={idx === 0 ? '#52c41a' : idx === 1 ? '#1677ff' : '#faad14'}
              style={{ margin: '0 1px' }}
            />
          </li>
        ))}
        {dayEvents.length > 3 && (
          <li style={{ fontSize: 9, color: '#999' }}>···</li>
        )}
      </ul>
    );
  };

  return <Calendar cellRender={cellRender} onSelect={onSelectDate} fullscreen={false} />;
};

export default CalendarView;