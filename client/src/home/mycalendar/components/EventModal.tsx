// client/src/home/mycalendar/components/EventModal.tsx

import { Modal, Form, Input, TimePicker, Button, Spin } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { useEffect } from 'react';
import type { EventItem, TemplateItem } from '../types';
import TemplateSelect from './TemplateSelect';

interface Props {
  open: boolean;
  editingEvent: EventItem | null;
  selectedDate: Dayjs;
  templates: TemplateItem[];
  loadingTemplates: boolean;
  t: (key: string) => string;
  onClose: () => void;
  onSubmit: (values: any) => void;
}

const EventModal: React.FC<Props> = ({
  open,
  editingEvent,
  selectedDate,
  templates,
  loadingTemplates,
  t,
  onClose,
  onSubmit,
}) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (open) {
      form.resetFields();
      if (editingEvent) {
        form.setFieldsValue({
          title: editingEvent.title,
          time: editingEvent.time ? dayjs(editingEvent.time, 'HH:mm') : null,
          note: editingEvent.note,
        });
      } else {
        form.setFieldsValue({ time: null });
      }
    }
  }, [open, editingEvent, form]);

  return (
    <Modal
      title={editingEvent ? t('mycalendar.edit') : `${t('mycalendar.selectDate')}${selectedDate.format('YYYY-MM-DD')}）`}
      open={open}
      onCancel={onClose}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={onClose} style={{ marginRight: 8 }}>
            {t('mycalendar.cancel')}
          </Button>
          <Button type="primary" onClick={() => form.validateFields().then(onSubmit)}>
            {editingEvent ? t('mycalendar.save') : t('mycalendar.add')}
          </Button>
        </div>
      }
      destroyOnHidden
      forceRender
    >
      <Spin spinning={loadingTemplates}>
        <Form form={form} layout="vertical">
          <Form.Item label={t('mycalendar.fromTemplate')}>
            <TemplateSelect
              templates={templates}
              placeholder={t('mycalendar.fromTemplate')}
              onSelect={(tpl) => {
                form.setFieldsValue({
                  title: tpl.title,
                  time: tpl.time ? dayjs(tpl.time, 'HH:mm') : null,
                  note: tpl.note ?? '',
                });
              }}
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
  );
};

export default EventModal;