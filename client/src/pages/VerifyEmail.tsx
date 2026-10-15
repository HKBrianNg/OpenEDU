// client/src/pages/VerifyEmail.tsx
import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useLocale } from '../store/LocaleContext';
import { useVerifyEmail } from '../store/hooks/useAuth';

const VerifyEmail = () => {
  const { t } = useLocale();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const { verify, verifying } = useVerifyEmail();
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying');
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- token 是 URL 外部状态；effect 把内部 status 同步到「正在校验 / 失败 / 成功」三个结果 */
    if (!token) {
      setStatus('failed');
      setErrMsg(t('verify.invalidLink'));
      return;
    }
    verify(token).then((result) => {
      if (result.code === 'VERIFY_SUCCESS' || result.code === 'ALREADY_VERIFIED') {
        setStatus('success');
      } else if (result.code === 'VERIFY_EXPIRED') {
        setStatus('failed');
        setErrMsg(t('verify.expired'));
      } else {
        setStatus('failed');
        setErrMsg(result.message || t('verify.failed'));
      }
    });
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [token, t, verify]);

  // verifying 收尾时仍按 status 渲染；hook 暴露的 verifying 给后续可能的"重新发送"等场景复用
  void verifying;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-md text-center">
        {status === 'verifying' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              {t('verify.verifying')}
            </h2>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-green-500 text-5xl mb-4">✓</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              {t('verify.success')}
            </h2>
            <p className="text-gray-600 mb-6">{t('verify.successMessage')}</p>
            <Link
              to="/login"
              className="inline-block bg-red-500 text-white px-6 py-2 rounded-md hover:bg-red-600 transition-colors"
            >
              {t('verify.goToLogin')}
            </Link>
          </>
        )}

        {status === 'failed' && (
          <>
            <div className="text-red-500 text-5xl mb-4">✗</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              {t('verify.failed')}
            </h2>
            <p className="text-gray-600 mb-6">{errMsg}</p>
            <Link
              to="/register"
              className="inline-block bg-red-500 text-white px-6 py-2 rounded-md hover:bg-red-600 transition-colors"
            >
              {t('verify.backToRegister')}
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
