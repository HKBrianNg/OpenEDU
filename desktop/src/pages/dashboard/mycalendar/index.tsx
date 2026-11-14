import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, App, Spin, Empty } from 'antd';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { useLocale } from '../../../store/LocaleContext';
import { useAuth } from '../../../store/AuthContext';
import { useEvents } from './hooks/useEvents';
import { useTemplates } from './hooks/useTemplates';
import CalendarView from './components/CalendarView';
import EventList from './components/EventList';
import EventModal from './components/EventModal';
import type { EventItem } from './types';
import './mycalendar.css';

export function MyCalendar() {
  const { message } = App.useApp();
  const { t } = useLocale();
  const { token } = useAuth();
  const { events, loading: loadingEvents, addOrUpdateEvent, deleteEvent, getEventsForDate } = useEvents();
  const { templates, loading: loadingTemplates } = useTemplates();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [selectedViewDate, setSelectedViewDate] = useState<Dayjs>(dayjs());

  const handleAdd = () => {
    setEditingEvent(null);
    setSelectedDate(selectedViewDate);
    setModalOpen(true);
  };

  const handleEdit = (event: EventItem) => {
    setEditingEvent(event);
    setSelectedDate(dayjs(event.date));
    setModalOpen(true);
  };

  const handleSelectDate = (date: Dayjs) => {
    setSelectedViewDate(date);
  };

  const handleSubmit = async (values: { title?: string; time?: Dayjs | null; note?: string }) => {
    const dateStr = selectedDate.format('YYYY-MM-DD');
    const newEvent: Omit<EventItem, 'id'> = {
      date: dateStr,
      title: values.title ?? '',
      time: values.time ? values.time.format('HH:mm') : undefined,
      note: values.note,
    };
    try {
      await addOrUpdateEvent(newEvent, editingEvent?.id);
      setModalOpen(false);
      message.success(editingEvent ? t('mycalendar.updated') : t('mycalendar.added'));
    } catch (e) {
      message.error(e instanceof Error ? e.message : t('mycalendar.saveFailed'));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteEvent(id);
      message.success(t('mycalendar.deleted'));
    } catch (e) {
      message.error(e instanceof Error ? e.message : t('mycalendar.deleteFailed'));
    }
  };

  const dayEvents = getEventsForDate(selectedViewDate.format('YYYY-MM-DD'));

  if (!token) {
    return (
      <div className="my-calendar-scroll">
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px 48px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h1 style={{ margin: 0 }}>{t('mycalendar.title')}</h1>
          </div>
          <Empty
            description={t('mycalendar.loginRequired')}
            style={{ padding: '48px 0' }}
          >
            <Link to="/login">
              <Button type="primary" style={{ background: '#ff4d4f', borderColor: '#ff4d4f' }}>
                {t('auth.loginButton')}
              </Button>
            </Link>
          </Empty>
        </div>
      </div>
    );
  }

  return (
    <div className="my-calendar-scroll">
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px 48px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ margin: 0 }}>{t('mycalendar.title')}</h1>
        </div>

        <Spin spinning={loadingEvents}>
          <EventList
            date={selectedViewDate}
            events={dayEvents}
            onAdd={handleAdd}
            onEdit={handleEdit}
            onDelete={handleDelete}
            t={t}
          />

          <CalendarView
            events={events}
            onSelectDate={handleSelectDate}
          />
        </Spin>

        <EventModal
          open={modalOpen}
          editingEvent={editingEvent}
          selectedDate={selectedDate}
          templates={templates}
          loadingTemplates={loadingTemplates}
          t={t}
          onClose={() => setModalOpen(false)}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}

MyCalendar.displayName = 'MyCalendar';