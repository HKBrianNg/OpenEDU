// client/src/pages/Preferences.tsx

import { useState, useEffect } from 'react';
import { Card, Form, Select, Switch, Button, App, Typography, Divider } from 'antd';
import { useAuth } from '../store/AuthContext';
import { useLocale } from '../store/LocaleContext';

const { Title } = Typography;

// 从环境变量读取后台地址
const API_BASE = import.meta.env.VITE_API_BASE_URL;

interface Preferences {
  theme: string;
  language: string;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  privacy: {
    profile_public: boolean;
    show_email: boolean;
  };
}

export default function Preferences() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { token } = useAuth();
  const { t } = useLocale();

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/preferences`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (response.ok) {
        form.setFieldsValue(data.data);
      } else {
        message.error(data.message || t('pref.fetchFailed'));
      }
    } catch (error) {
      message.error(t('pref.networkError'));
    } finally {
      setLoading(false);
    }
  };

  const onFinish = async (values: Preferences) => {
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE}/api/preferences`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(values),
      });
      const data = await response.json();

      if (response.ok) {
        message.success(data.message || t('pref.updateSuccess'));
      } else {
        message.error(data.message || t('pref.updateFailed'));
      }
    } catch (error) {
      message.error(t('pref.networkError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 24 }}>
      <Title level={4}>{t('pref.title')}</Title>
      <Card loading={loading}>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            theme: 'system',
            language: 'zh-CN',
            notifications: { email: true, push: true, sms: false },
            privacy: { profile_public: true, show_email: false },
          }}
        >
          <Form.Item label={t('pref.theme')} name="theme">
            <Select
              options={[
                { value: 'system', label: t('pref.themeSystem') },
                { value: 'light', label: t('pref.themeLight') },
                { value: 'dark', label: t('pref.themeDark') },
              ]}
            />
          </Form.Item>

          <Form.Item label={t('pref.language')} name="language">
            <Select
              options={[
                { value: 'zh-CN', label: '简体中文' },
                { value: 'en-US', label: 'English' },
              ]}
            />
          </Form.Item>

          <Divider>{t('pref.notifications')}</Divider>

          <Form.Item label={t('pref.emailNotif')} name={['notifications', 'email']} valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item label={t('pref.pushNotif')} name={['notifications', 'push']} valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item label={t('pref.smsNotif')} name={['notifications', 'sms']} valuePropName="checked">
            <Switch />
          </Form.Item>

          <Divider>{t('pref.privacy')}</Divider>

          <Form.Item label={t('pref.profilePublic')} name={['privacy', 'profile_public']} valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item label={t('pref.showEmail')} name={['privacy', 'show_email']} valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={saving} block>
              {t('pref.save')}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}