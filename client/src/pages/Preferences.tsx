import { useEffect, useState } from 'react';
import { Card, Form, Select, Switch, Button, App, Typography, Divider, Input, Modal } from 'antd';
import { useLocale } from '../store/LocaleContext';
import { useTheme } from '../store/ThemeContext';
import { useAuth } from '../store/AuthContext';
import { usePreferences, type Preferences } from '../store/hooks/usePreferences';
import { useUpdateNickname, useChangePassword } from '../store/hooks/useAuth';

const { Title } = Typography;

interface PasswordFormValues {
  oldPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export default function Preferences() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [pwForm] = Form.useForm();
  const { data, loading, saving, save } = usePreferences();
  const { t, setLocale, locale } = useLocale();
  const { setTheme, theme } = useTheme();
  const { user, updateUser } = useAuth();

  // ---- 账户区：昵称 ----
  const { updateNickname, loading: savingNickname } = useUpdateNickname();
  const [nickname, setNickname] = useState(user?.nickname || '');

  const handleSaveNickname = async () => {
    const trimmed = nickname.trim();
    if (trimmed.length < 2) {
      message.warning(t('auth.nicknameMin'));
      return;
    }
    const result = await updateNickname(trimmed);
    if (result.ok) {
      updateUser({ nickname: trimmed });
      message.success(result.message || t('pref.nicknameUpdated'));
    } else {
      message.error(result.message || t('pref.updateFailed'));
    }
  };

  // ---- 账户区：修改密码 ----
  const { changePassword, loading: changingPassword } = useChangePassword();
  const [pwModalOpen, setPwModalOpen] = useState(false);

  const handleChangePassword = async (values: PasswordFormValues) => {
    const result = await changePassword({
      oldPassword: values.oldPassword,
      newPassword: values.newPassword,
    });
    if (result.ok) {
      message.success(result.message || t('pref.passwordChanged'));
      setPwModalOpen(false);
      pwForm.resetFields();
    } else if (result.code === 'WRONG_OLD_PASSWORD') {
      pwForm.setFields([{ name: 'oldPassword', errors: [result.message || t('pref.oldPasswordWrong')] }]);
    } else {
      message.error(result.message || t('pref.updateFailed'));
    }
  };

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

        <Divider>{t('pref.account')}</Divider>
        <Form layout="vertical" component="div">
          <Form.Item label={t('pref.emailLabel')}>
            <Input value={user?.email || ''} disabled />
          </Form.Item>
          <Form.Item label={t('pref.nicknameLabel')}>
            <Input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={30}
            />
          </Form.Item>
          <Button
            type="primary"
            loading={savingNickname}
            onClick={handleSaveNickname}
            style={{ marginBottom: 16 }}
          >
            {t('pref.saveNickname')}
          </Button>
          <div>
            <Button onClick={() => setPwModalOpen(true)}>{t('pref.changePassword')}</Button>
          </div>
        </Form>
      </Card>

      <Modal
        title={t('pref.changePassword')}
        open={pwModalOpen}
        onOk={() => pwForm.submit()}
        onCancel={() => setPwModalOpen(false)}
        confirmLoading={changingPassword}
        destroyOnHidden
      >
        <Form form={pwForm} layout="vertical" onFinish={handleChangePassword}>
          <Form.Item
            label={t('pref.oldPassword')}
            name="oldPassword"
            rules={[{ required: true, message: t('pref.oldPasswordRequired') }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item
            label={t('pref.newPassword')}
            name="newPassword"
            rules={[
              { required: true, message: t('auth.passwordRequired') },
              { min: 8, message: t('pref.newPasswordMin') },
            ]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item
            label={t('pref.confirmNewPassword')}
            name="confirmNewPassword"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: t('auth.confirmPasswordRequired') },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error(t('auth.passwordMismatch')));
                },
              }),
            ]}
          >
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
