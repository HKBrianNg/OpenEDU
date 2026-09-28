import { useState, useEffect, useRef } from 'react';
import { Card, Form, Select, Switch, Button, App, Typography, Divider } from 'antd';
import { useAuth } from '../store/AuthContext';
import { useLocale } from '../store/LocaleContext';
import { useTheme } from '../store/ThemeContext';

const { Title } = Typography;
const API_BASE = import.meta.env.VITE_API_BASE_URL;

interface Preferences {
  theme: string;
  language: string;
  notifications: { email: boolean; push: boolean; sms: boolean; };
  privacy: { profile_public: boolean; show_email: boolean; };
}

export default function Preferences() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { token } = useAuth();
  
  // 合并解构，避免重复调用 useLocale
  const { t, setLocale, locale } = useLocale();
  const { setTheme, theme } = useTheme();
  const fetchedRef = useRef(false); // 标记是否已拉取过

  // 首次挂载时拉取完整偏好（含通知/隐私开关）
  useEffect(() => {
    if (!fetchedRef.current) {
      fetchPreferences();
      fetchedRef.current = true;
    }
  }, []);

  const fetchPreferences = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/preferences`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();

      if (response.ok) {
        form.setFieldsValue(data.data);

        // 同步全局状态
        if (data.data.theme === 'dark') setTheme('dark');
        else if (data.data.theme === 'light') setTheme('light');

        if (data.data.language === 'en-US') setLocale('en');
        else if (data.data.language === 'zh-CN') setLocale('zh');
        
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
        // 保存成功同步全局
        if (values.theme === 'dark') setTheme('dark');
        else if (values.theme === 'light') setTheme('light');

        if (values.language === 'en-US') setLocale('en');
        else if (values.language === 'zh-CN') setLocale('zh');

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
            theme: theme,  // 直接用全局主题
            language: locale === 'zh' ? 'zh-CN' : 'en-US',  // 直接用全局语言
            notifications: { email: true, push: true, sms: false },
            privacy: { profile_public: true, show_email: false },
          }}
        >
          <Form.Item label={t('pref.theme')} name="theme">
            <Select options={[
              { value: 'system', label: t('pref.themeSystem') },
              { value: 'light', label: t('pref.themeLight') },
              { value: 'dark', label: t('pref.themeDark') },
            ]} />
          </Form.Item>

          <Form.Item label={t('pref.language')} name="language">
            <Select options={[
              { value: 'zh-CN', label: '简体中文' },
              { value: 'en-US', label: 'English' },
            ]} />
          </Form.Item>

          <Divider>{t('pref.notifications')}</Divider>
          <Form.Item label={t('pref.emailNotif')} name={['notifications', 'email']} valuePropName="checked"><Switch /></Form.Item>
          <Form.Item label={t('pref.pushNotif')} name={['notifications', 'push']} valuePropName="checked"><Switch /></Form.Item>
          <Form.Item label={t('pref.smsNotif')} name={['notifications', 'sms']} valuePropName="checked"><Switch /></Form.Item>

          <Divider>{t('pref.privacy')}</Divider>
          <Form.Item label={t('pref.profilePublic')} name={['privacy', 'profile_public']} valuePropName="checked"><Switch /></Form.Item>
          <Form.Item label={t('pref.showEmail')} name={['privacy', 'show_email']} valuePropName="checked"><Switch /></Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={saving} block>{t('pref.save')}</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}