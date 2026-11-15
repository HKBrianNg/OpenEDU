// desktop/src/pages/home/components/PreferencesModal.tsx
import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Tabs,
  Form,
  Input,
  Button,
  Select,
  Switch,
  Slider,
  Divider,
  App,
  Space,
  Typography,
} from 'antd';
import {
  SoundOutlined,
  TranslationOutlined,
  BellOutlined,
  SafetyOutlined,
  UserOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { useLocale } from '../../../store/LocaleContext';
import { useTheme } from '../../../store/ThemeContext';
import { useAuth } from '../../../store/AuthContext';
import { usePreferences } from '../../../store/hooks/usePreferences';
import { useUpdateNickname, useChangePassword } from '../../../store/hooks/useAuth';
import {
  speechSupported,
  loadSpeechSettings,
  saveSpeechSettings,
  loadVoices,
  listVoicesFor,
  speakOnce,
  type SpeechSettings,
  type SpeechLang,
} from '../../../utils/speech';

const { Text } = Typography;

interface PreferencesModalProps {
  open: boolean;
  onClose: () => void;
}

export default function PreferencesModal({ open, onClose }: PreferencesModalProps) {
  const { t, locale, setLocale } = useLocale();
  const { isDark, toggleTheme } = useTheme();
  const { user, updateUser } = useAuth();
  const { message } = App.useApp();

  const { data: prefData, saving: prefSaving, refresh, save } = usePreferences();
  const { updateNickname, loading: nickLoading } = useUpdateNickname();
  const { changePassword, loading: pwdLoading } = useChangePassword();

  const [nickname, setNickname] = useState(user?.nickname || '');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [notifEmail, setNotifEmail] = useState(true);
  const [notifPush, setNotifPush] = useState(true);
  const [notifSms, setNotifSms] = useState(false);
  const [privacyProfile, setPrivacyProfile] = useState(false);
  const [privacyEmail, setPrivacyEmail] = useState(false);

  const [speechSettings, setSpeechSettings] = useState<SpeechSettings>(() =>
    loadSpeechSettings(),
  );
  const [zhVoices, setZhVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [enVoices, setEnVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (open) {
      refresh();
      if (speechSupported) {
        loadVoices().then(() => {
          setZhVoices(listVoicesFor('zh-CN'));
          setEnVoices(listVoicesFor('en-US'));
        });
      }
    }
  }, [open]);

  useEffect(() => {
    if (prefData) {
      setNotifEmail(prefData.notifications?.email ?? true);
      setNotifPush(prefData.notifications?.push ?? true);
      setNotifSms(prefData.notifications?.sms ?? false);
      setPrivacyProfile(prefData.privacy?.profile_public ?? false);
      setPrivacyEmail(prefData.privacy?.show_email ?? false);
    }
  }, [prefData]);

  useEffect(() => {
    setNickname(user?.nickname || '');
  }, [user?.nickname, open]);

  const handleSavePreferences = async () => {
    const values = {
      theme: isDark ? 'dark' : 'light',
      language: locale,
      notifications: { email: notifEmail, push: notifPush, sms: notifSms },
      privacy: { profile_public: privacyProfile, show_email: privacyEmail },
    };

    const result = await save(values);
    if (result.ok) {
      message.success(t('preferences.saveSuccess') || '保存成功');
    } else {
      message.error(result.message || t('preferences.saveFailed') || '保存失败');
    }
  };

  const handleSaveNickname = async () => {
    if (!nickname.trim()) {
      message.warning(t('preferences.nicknameRequired') || '昵称不能为空');
      return;
    }
    const result = await updateNickname(nickname.trim());
    if (result.ok) {
      updateUser({ nickname: nickname.trim() });
      message.success(t('preferences.nicknameUpdated') || '昵称已更新');
    } else {
      message.error(result.message || t('preferences.updateFailed') || '更新失败');
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword) {
      message.warning(t('preferences.passwordRequired') || '请填写完整密码');
      return;
    }
    if (newPassword !== confirmPassword) {
      message.error(t('preferences.passwordMismatch') || '两次新密码不一致');
      return;
    }
    if (newPassword.length < 6) {
      message.error(t('preferences.passwordTooShort') || '密码至少 6 位');
      return;
    }
    const result = await changePassword({ oldPassword, newPassword });
    if (result.ok) {
      message.success(t('preferences.passwordUpdated') || '密码已修改');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      message.error(result.message || t('preferences.updateFailed') || '修改失败');
    }
  };

  const handleSaveSpeech = () => {
    saveSpeechSettings(speechSettings);
    message.success(t('preferences.speechSaved') || '朗读设置已保存');
  };

  const handleTestSpeech = (lang: SpeechLang) => {
    const text = lang === 'zh-CN'
      ? t('preferences.testZhText') || '这是一段朗读测试语音。'
      : t('preferences.testEnText') || 'This is a speech test.';
    speakOnce(text, lang);
  };

  const tabItems = useMemo(
    () => [
      {
        key: 'appearance',
        label: (
          <span>
            <TranslationOutlined /> {t('preferences.appearance') || '外观与语言'}
          </span>
        ),
        children: (
          <Form layout="vertical">
            <Form.Item label={t('preferences.language') || '语言'}>
              <Select value={locale} onChange={setLocale} style={{ maxWidth: 240 }}>
                <Select.Option value="zh-CN">简体中文</Select.Option>
                <Select.Option value="zh-TW">繁體中文</Select.Option>
                <Select.Option value="en">English</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item label={t('preferences.theme') || '主题'}>
              <Space>
                <Switch
                  checkedChildren={<SoundOutlined />}
                  unCheckedChildren={<SoundOutlined />}
                  checked={isDark}
                  onChange={toggleTheme}
                />
                <Text type="secondary">
                  {isDark
                    ? t('preferences.darkMode') || '深色模式'
                    : t('preferences.lightMode') || '浅色模式'}
                </Text>
              </Space>
            </Form.Item>
          </Form>
        ),
      },
      {
        key: 'notifications',
        label: (
          <span>
            <BellOutlined /> {t('preferences.notifications') || '通知'}
          </span>
        ),
        children: (
          <Form layout="vertical">
            <Form.Item>
              <Space>
                <Switch checked={notifEmail} onChange={setNotifEmail} />
                <Text>{t('preferences.emailNotif') || '邮件通知'}</Text>
              </Space>
            </Form.Item>
            <Form.Item>
              <Space>
                <Switch checked={notifPush} onChange={setNotifPush} />
                <Text>{t('preferences.pushNotif') || '推送通知'}</Text>
              </Space>
            </Form.Item>
            <Form.Item>
              <Space>
                <Switch checked={notifSms} onChange={setNotifSms} />
                <Text>{t('preferences.smsNotif') || '短信通知'}</Text>
              </Space>
            </Form.Item>
            <Button type="primary" loading={prefSaving} onClick={handleSavePreferences} icon={<SaveOutlined />}>
              {t('preferences.save') || '保存'}
            </Button>
          </Form>
        ),
      },
      {
        key: 'privacy',
        label: (
          <span>
            <SafetyOutlined /> {t('preferences.privacy') || '隐私'}
          </span>
        ),
        children: (
          <Form layout="vertical">
            <Form.Item>
              <Space>
                <Switch checked={privacyProfile} onChange={setPrivacyProfile} />
                <Text>{t('preferences.publicProfile') || '公开个人资料'}</Text>
              </Space>
            </Form.Item>
            <Form.Item>
              <Space>
                <Switch checked={privacyEmail} onChange={setPrivacyEmail} />
                <Text>{t('preferences.showEmail') || '公开邮箱地址'}</Text>
              </Space>
            </Form.Item>
            <Button type="primary" loading={prefSaving} onClick={handleSavePreferences} icon={<SaveOutlined />}>
              {t('preferences.save') || '保存'}
            </Button>
          </Form>
        ),
      },
      {
        key: 'account',
        label: (
          <span>
            <UserOutlined /> {t('preferences.account') || '账户'}
          </span>
        ),
        children: (
          <Form layout="vertical">
            <Form.Item label={t('preferences.nickname') || '昵称'}>
              <Space>
                <Input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder={t('preferences.nicknamePlaceholder') || '输入昵称'}
                  style={{ width: 200 }}
                  onPressEnter={handleSaveNickname}
                />
                <Button type="primary" loading={nickLoading} onClick={handleSaveNickname}>
                  {t('preferences.save') || '保存'}
                </Button>
              </Space>
            </Form.Item>
            <Divider />
            <Form.Item label={t('preferences.changePassword') || '修改密码'}>
              <Space direction="vertical" size="small" style={{ width: '100%', maxWidth: 320 }}>
                <Input.Password
                  placeholder={t('preferences.oldPassword') || '当前密码'}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                />
                <Input.Password
                  placeholder={t('preferences.newPassword') || '新密码'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <Input.Password
                  placeholder={t('preferences.confirmPassword') || '确认新密码'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <Button type="primary" danger loading={pwdLoading} onClick={handleChangePassword}>
                  {t('preferences.updatePassword') || '修改密码'}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        ),
      },
      ...(speechSupported
        ? [
            {
              key: 'speech',
              label: (
                <span>
                  <SoundOutlined /> {t('preferences.speech') || '朗读语音'}
                </span>
              ),
              children: (
                <Form layout="vertical">
                  <Form.Item label={t('preferences.zhVoice') || '中文语音'}>
                    <Select
                      value={speechSettings.zhVoice || undefined}
                      placeholder={t('preferences.autoPick') || '自动选择'}
                      allowClear
                      style={{ maxWidth: 320 }}
                      onChange={(v) =>
                        setSpeechSettings((s) => ({ ...s, zhVoice: v ?? null }))
                      }
                    >
                      {zhVoices.map((v) => (
                        <Select.Option key={v.voiceURI} value={v.voiceURI}>
                          {v.name}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                  <Form.Item label={t('preferences.enVoice') || '英文语音'}>
                    <Select
                      value={speechSettings.enVoice || undefined}
                      placeholder={t('preferences.autoPick') || '自动选择'}
                      allowClear
                      style={{ maxWidth: 320 }}
                      onChange={(v) =>
                        setSpeechSettings((s) => ({ ...s, enVoice: v ?? null }))
                      }
                    >
                      {enVoices.map((v) => (
                        <Select.Option key={v.voiceURI} value={v.voiceURI}>
                          {v.name}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                  <Form.Item label={t('preferences.rate') || '语速'}>
                    <Slider
                      min={0.5}
                      max={1.6}
                      step={0.1}
                      value={speechSettings.rate}
                      onChange={(v) =>
                        setSpeechSettings((s) => ({ ...s, rate: v }))
                      }
                      style={{ maxWidth: 240 }}
                    />
                  </Form.Item>
                  <Form.Item label={t('preferences.pitch') || '音调'}>
                    <Slider
                      min={0.5}
                      max={1.6}
                      step={0.1}
                      value={speechSettings.pitch}
                      onChange={(v) =>
                        setSpeechSettings((s) => ({ ...s, pitch: v }))
                      }
                      style={{ maxWidth: 240 }}
                    />
                  </Form.Item>
                  <Space>
                    <Button onClick={handleSaveSpeech} type="primary" icon={<SaveOutlined />}>
                      {t('preferences.save') || '保存'}
                    </Button>
                    <Button onClick={() => handleTestSpeech('zh-CN')}>
                      {t('preferences.testZh') || '测试中文'}
                    </Button>
                    <Button onClick={() => handleTestSpeech('en-US')}>
                      {t('preferences.testEn') || 'Test English'}
                    </Button>
                  </Space>
                </Form>
              ),
            },
          ]
        : []),
    ],
    [
      locale, setLocale, isDark, toggleTheme, t,
      notifEmail, notifPush, notifSms, privacyProfile, privacyEmail, prefSaving,
      nickname, nickLoading, pwdLoading, oldPassword, newPassword, confirmPassword,
      speechSettings, zhVoices, enVoices,
      handleSavePreferences, handleSaveNickname, handleChangePassword, handleSaveSpeech, handleTestSpeech,
    ],
  );

  return (
    <Modal
      title={t('shell.preferences.title') || '偏好设置'}
      open={open}
      onCancel={onClose}
      footer={null}
      width={720}
      destroyOnClose
    >
      <Tabs items={tabItems} destroyOnHidden />
    </Modal>
  );
}