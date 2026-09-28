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
  message,
  Spin,
  List,
  Tag,
  Empty,
} from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { useLocale } from '../store/LocaleContext';

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

const STORAGE_KEY = 'home_calendar_events';

const Home: React.FC = () => {
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
        message.warning(t('calendar.templateFailed'));
      })
      .finally(() => setLoadingTemplates(false));
  }, [t]);

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
    message.success(editingEvent ? t('calendar.updated') : t('calendar.added'));
  };

  const deleteEvent = (id: string) => {
    const nextEvents = events.filter((e) => e.id !== id);
    saveEvents(nextEvents);
    message.success(t('calendar.deleted'));
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
        {dayEvents.slice(0, 3).map((event) => (
          <li key={event.id} style={{ marginBottom: 2 }}>
            <Badge
              status="success"
              text={
                <span
                  style={{ fontSize: 12, cursor: 'pointer', color: '#333' }}
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
        {dayEvents.length > 3 && (
          <li style={{ fontSize: 11, color: '#999' }}>
            +{dayEvents.length - 3} {t('calendar.more')}
          </li>
        )}
      </ul>
    );
  };

  const dayEvents = getEventsForDate(selectedViewDate);

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ marginBottom: 24 }}>{t('calendar.title')}</h1>

      <Card>
        <Calendar
          cellRender={cellRender}
          onSelect={handleSelectDate}
        />
      </Card>

      {/* 选中日期的日程列表 */}
      <Card
        title={`📅 ${selectedViewDate.format('YYYY年MM月DD日')}${t('calendar.scheduleOf')}`}
        style={{ marginTop: 16 }}
        size="small"
      >
        {dayEvents.length === 0 ? (
          <Empty description={t('calendar.noSchedule')} />
        ) : (
          <List
            dataSource={dayEvents}
            renderItem={(event) => (
              <List.Item
                actions={[
                  <Button
                    type="link"
                    size="small"
                    onClick={() => handleListItemClick(event)}
                  >
                    {t('calendar.editBtn')}
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  title={
                    <span>
                      {event.time && <Tag color="blue">{event.time}</Tag>}
                      {event.title}
                    </span>
                  }
                  description={event.note}
                />
              </List.Item>
            )}
          />
        )}
      </Card>

      <Modal
        title={
          editingEvent
            ? t('calendar.edit')
            : `${t('calendar.selectDate')}${selectedDate.format('YYYY-MM-DD')}）`
        }
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              {editingEvent && (
                <Popconfirm
                  title={t('calendar.confirmDelete')}
                  onConfirm={() => {
                    deleteEvent(editingEvent.id);
                    setModalOpen(false);
                  }}
                >
                  <Button danger>{t('calendar.delete')}</Button>
                </Popconfirm>
              )}
            </div>
            <div>
              <Button onClick={() => setModalOpen(false)} style={{ marginRight: 8 }}>
                {t('calendar.cancel')}
              </Button>
              <Button type="primary" onClick={handleSubmit}>
                {editingEvent ? t('calendar.save') : t('calendar.add')}
              </Button>
            </div>
          </div>
        }
        destroyOnClose
      >
        <Spin spinning={loadingTemplates}>
          <Form form={form} layout="vertical">
            <Form.Item label={t('calendar.fromTemplate')}>
              <Select
                placeholder={t('calendar.fromTemplate')}
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
              label={t('calendar.titleLabel')}
              rules={[{ required: true, message: t('calendar.titlePlaceholder') }]}
            >
              <Input placeholder={t('calendar.titlePlaceholder')} />
            </Form.Item>

            <Form.Item name="time" label={t('calendar.timeLabel')}>
              <TimePicker format="HH:mm" minuteStep={5} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item name="note" label={t('calendar.noteLabel')}>
              <Input.TextArea rows={3} placeholder={t('calendar.notePlaceholder')} />
            </Form.Item>
          </Form>
        </Spin>
      </Modal>
    </div>
  );
};

export default Home;