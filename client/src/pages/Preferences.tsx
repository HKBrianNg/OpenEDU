import { useEffect } from 'react';
import { Card, Form, Select, Switch, Button, App, Typography, Divider } from 'antd';
import { useLocale } from '../store/LocaleContext';
import { useTheme } from '../store/ThemeContext';
import { usePreferences, type Preferences } from '../store/hooks/usePreferences';

const { Title } = Typography;

export default function Preferences() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const { data, loading, saving, save } = usePreferences();
  const { t, setLocale, locale } = useLocale();
  const { setTheme, theme } = useTheme();

  // 数据到达后回填表单 + 同步全局 theme/locale（副作用放 effect，避免渲染期 setState）
  useEffect(() => {
    if (data && !form.isFieldsTouched()) {
      form.setFieldsValue(data);
      if (data.theme === 'dark') setTheme('dark');
      else if (data.theme === 'light') setTheme('light');
      if (data.language === 'en-US') setLocale('en');
      else if (data.language === 'zh-CN') setLocale('zh');
    }
  }, [data, form, setTheme, setLocale]);

  const onFinish = async (values: Preferences) => {
    const result = await save(values);
    if (result.ok) {
      // 保存成功同步全局
      if (values.theme === 'dark') setTheme('dark');
      else if (values.theme === 'light') setTheme('light');
      if (values.language === 'en-US') setLocale('en');
      else if (values.language === 'zh-CN') setLocale('zh');
      message.success(result.message || t('pref.updateSuccess'));
    } else {
      message.error(result.message || t('pref.updateFailed'));
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
            theme: theme,
            language: locale === 'zh' ? 'zh-CN' : 'en-US',
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
