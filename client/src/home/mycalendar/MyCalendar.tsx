// client/src/home/mycalendar/MyCalendar.tsx

import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Card,
  Modal,
  Form,
  Input,
  TimePicker,
  Button,
  Badge,
  Popconfirm,
  Select,
  Spin,
  Tag,
  Empty,
  App,
} from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { useLocale } from '../../store/LocaleContext';

interface EventItem {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  time?: string; // HH:mm
  note?: string;
}

interface TemplateItem {
  title: string;
  time?: string;
  note?: string;
}

interface MyCalendarProps {
  onExit?: () => void;
}

const STORAGE_KEY = 'home_calendar_events';

const MyCalendar: React.FC<MyCalendarProps> = ({ onExit }) => {
  const { message } = App.useApp();
  const { t } = useLocale();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [selectedViewDate, setSelectedViewDate] = useState<Dayjs>(dayjs());
  const [form] = Form.useForm();
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  // 加载 localStorage 日程
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setEvents(JSON.parse(raw));
      }
    } catch (e) {
      console.warn('读取日历数据失败', e);
    }
  }, []);

  // 加载模板 JSON
  useEffect(() => {
    fetch('/data/CalendarTemplate/CalendarTemplate.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: TemplateItem[]) => {
        setTemplates(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.warn('CalendarTemplate.json 加载失败', err);
        message.warning(t('mycalendar.templateFailed'));
      })
      .finally(() => setLoadingTemplates(false));
  }, [t, message]);

  const saveEvents = (next: EventItem[]) => {
    setEvents(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const openAddModal = (date: Dayjs) => {
    setEditingEvent(null);
    setSelectedDate(date);
    form.resetFields();
    form.setFieldsValue({
      time: null,
    });
    setModalOpen(true);
  };

  const openEditModal = (event: EventItem) => {
    setEditingEvent(event);
    setSelectedDate(dayjs(event.date));
    form.setFieldsValue({
      title: event.title,
      time: event.time ? dayjs(event.time, 'HH:mm') : null,
      note: event.note,
    });
    setModalOpen(true);
  };

  const applyTemplate = (template: TemplateItem) => {
    form.setFieldsValue({
      title: template.title,
      time: template.time ? dayjs(template.time, 'HH:mm') : null,
      note: template.note ?? '',
    });
  };

  const handleTemplateChange = (title: string | undefined) => {
    if (!title) return;
    const template = templates.find((t) => t.title === title);
    if (template) applyTemplate(template);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const dateStr = selectedDate.format('YYYY-MM-DD');

    const newEvent: EventItem = {
      id: editingEvent?.id || `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      date: dateStr,
      title: values.title,
      time: values.time ? (values.time as Dayjs).format('HH:mm') : undefined,
      note: values.note,
    };

    let nextEvents: EventItem[];
    if (editingEvent) {
      nextEvents = events.map((e) => (e.id === editingEvent.id ? newEvent : e));
    } else {
      nextEvents = [...events, newEvent];
    }

    saveEvents(nextEvents);
    setModalOpen(false);
    message.success(editingEvent ? t('mycalendar.updated') : t('mycalendar.added'));
  };

  const deleteEvent = (id: string) => {
    const nextEvents = events.filter((e) => e.id !== id);
    saveEvents(nextEvents);
    message.success(t('mycalendar.deleted'));
  };

  const getEventsForDate = (date: Dayjs): EventItem[] =>
    events.filter((e) => e.date === date.format('YYYY-MM-DD'));

  // 日历点击
  const handleSelectDate = (date: Dayjs) => {
    setSelectedViewDate(date);
    openAddModal(date);
  };

  // 点击日程列表项
  const handleListItemClick = (event: EventItem) => {
    openEditModal(event);
  };

  const cellRender = (date: Dayjs) => {
    const dayEvents = getEventsForDate(date);
    if (dayEvents.length === 0) return null;

    return (
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {dayEvents.slice(0, 2).map((event) => (
          <li key={event.id} style={{ marginBottom: 1 }}>
            <Badge
              status="success"
              text={
                <span
                  style={{ fontSize: 10, cursor: 'pointer', color: '#333', lineHeight: 1.2 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleListItemClick(event);
                  }}
                >
                  {event.time && `${event.time} `}
                  {event.title}
                </span>
              }
            />
          </li>
        ))}
        {dayEvents.length > 2 && (
          <li style={{ fontSize: 9, color: '#999', lineHeight: 1.2 }}>
            +{dayEvents.length - 2} {t('mycalendar.more')}
          </li>
        )}
      </ul>
    );
  };

  const dayEvents = getEventsForDate(selectedViewDate);

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      {/* 标题行：标题在左，返回按钮在右 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>{t('mycalendar.title')}</h1>
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
            ← {t('mycalendar.backToLobby') || '返回大厅'}
          </Button>
        )}
      </div>

      {/* 选中日期的日程列表 - 放上面 */}
      <Card
        title={`📅 ${selectedViewDate.format('YYYY年MM月DD日')}${t('mycalendar.scheduleOf')}`}
        style={{ marginBottom: 16 }}
        size="small"
      >
        {dayEvents.length === 0 ? (
          <Empty description={t('mycalendar.noSchedule')} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {dayEvents.map((event) => (
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
                  <span>
                    {event.time && <Tag color="blue">{event.time}</Tag>}
                    <strong>{event.title}</strong>
                  </span>
                  <div style={{ color: '#888', fontSize: 12, marginTop: 4 }}>
                    {event.note}
                  </div>
                </div>
                <Button
                  type="link"
                  size="small"
                  onClick={() => handleListItemClick(event)}
                >
                  {t('mycalendar.editBtn')}
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 日历 - 放下面 */}
      <Card>
        <Calendar
          cellRender={cellRender}
          onSelect={handleSelectDate}
          fullscreen={false}
        />
      </Card>

      {/* 缩小日期格子 */}
      <style>{`
        .ant-picker-calendar-date {
          min-height: 40px !important;
          padding: 2px !important;
        }
        .ant-picker-calendar-date-content {
          min-height: 30px !important;
          font-size: 12px;
        }
        .ant-picker-calendar-date-value {
          font-size: 12px;
        }
        .ant-picker-cell-inner {
          padding: 4px !important;
        }
      `}</style>

      {/* 弹窗 */}
      <Modal
        title={
          editingEvent
            ? t('mycalendar.edit')
            : `${t('mycalendar.selectDate')}${selectedDate.format('YYYY-MM-DD')}）`
        }
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              {editingEvent && (
                <Popconfirm
                  title={t('mycalendar.confirmDelete')}
                  onConfirm={() => {
                    deleteEvent(editingEvent.id);
                    setModalOpen(false);
                  }}
                >
                  <Button danger>{t('mycalendar.delete')}</Button>
                </Popconfirm>
              )}
            </div>
            <div>
              <Button onClick={() => setModalOpen(false)} style={{ marginRight: 8 }}>
                {t('mycalendar.cancel')}
              </Button>
              <Button type="primary" onClick={handleSubmit}>
                {editingEvent ? t('mycalendar.save') : t('mycalendar.add')}
              </Button>
            </div>
          </div>
        }
        destroyOnHidden
        forceRender
      >
        <Spin spinning={loadingTemplates}>
          <Form form={form} layout="vertical">
            <Form.Item label={t('mycalendar.fromTemplate')}>
              <Select
                placeholder={t('mycalendar.fromTemplate')}
                allowClear
                showSearch
                optionFilterProp="label"
                onChange={handleTemplateChange}
                options={templates.map((tpl) => ({
                  label: `${tpl.title}${tpl.time ? `（${tpl.time}）` : ''}`,
                  value: tpl.title,
                }))}
              />
            </Form.Item>

            <Form.Item
              name="title"
              label={t('mycalendar.titleLabel')}
              rules={[{ required: true, message: t('mycalendar.titlePlaceholder') }]}
            >
              <Input placeholder={t('mycalendar.titlePlaceholder')} />
            </Form.Item>

            <Form.Item name="time" label={t('mycalendar.timeLabel')}>
              <TimePicker format="HH:mm" minuteStep={5} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item name="note" label={t('mycalendar.noteLabel')}>
              <Input.TextArea rows={3} placeholder={t('mycalendar.notePlaceholder')} />
            </Form.Item>
          </Form>
        </Spin>
      </Modal>
    </div>
  );
};

export default MyCalendar;