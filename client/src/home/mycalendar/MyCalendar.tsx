import React, { useState } from 'react';
import { Button, App } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { useLocale } from '../../store/LocaleContext';
import { useEvents } from './hooks/useEvents';
import { useTemplates } from './hooks/useTemplates';
import CalendarView from './components/CalendarView';
import EventList from './components/EventList';
import EventModal from './components/EventModal';
import type { EventItem } from './types';
import type { MyCalendarProps } from './types';

const MyCalendar: React.FC<MyCalendarProps> = ({ onExit }) => {
  const { message } = App.useApp();
  const { t } = useLocale();
  const { events, addOrUpdateEvent, deleteEvent, getEventsForDate } = useEvents();
  const { templates, loading: loadingTemplates } = useTemplates();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [selectedViewDate, setSelectedViewDate] = useState<Dayjs>(dayjs());

  // 点 + 按钮：新增
  const handleAdd = () => {
    setEditingEvent(null);
    setSelectedDate(selectedViewDate);  // 以当前查看的日期为准
    setModalOpen(true);
  };

  // 点列表 Edit：编辑
  const handleEdit = (event: EventItem) => {
    setEditingEvent(event);
    setSelectedDate(dayjs(event.date));
    setModalOpen(true);
  };

  // 点日历格子：只切换查看日期，不弹窗
  const handleSelectDate = (date: Dayjs) => {
    setSelectedViewDate(date);
  };

  const handleSubmit = async (values: any) => {
    const dateStr = selectedDate.format('YYYY-MM-DD');
    const newEvent: EventItem = {
      id: editingEvent?.id || `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      date: dateStr,
      title: values.title,
      time: values.time ? values.time.format('HH:mm') : undefined,
      note: values.note,
    };
    addOrUpdateEvent(newEvent, editingEvent?.id);
    setModalOpen(false);
    message.success(editingEvent ? t('mycalendar.updated') : t('mycalendar.added'));
  };

  const dayEvents = getEventsForDate(selectedViewDate.format('YYYY-MM-DD'));

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>{t('mycalendar.title')}</h1>
        {onExit && (
          <Button
            onClick={onExit}
            style={{ borderRadius: 99, border: '1px solid #d0d0d0', background: '#fff', color: '#333' }}
          >
            ← {t('mycalendar.backToLobby') || '返回大厅'}
          </Button>
        )}
      </div>

     <EventList
      date={selectedViewDate}
      events={dayEvents}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={deleteEvent}  // 补充此行，直接传入 useEvents 的删除方法
      t={t}
    />

      <CalendarView
        events={events}
        onSelectDate={handleSelectDate}
      />

      <style>{`
        .ant-picker-calendar-date { min-height: 40px !important; padding: 2px !important; }
        .ant-picker-calendar-date-content { min-height: 30px !important; font-size: 12px; }
        .ant-picker-calendar-date-value { font-size: 12px; }
        .ant-picker-cell-inner { padding: 4px !important; }
      `}</style>

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
  );
};

export default MyCalendar;