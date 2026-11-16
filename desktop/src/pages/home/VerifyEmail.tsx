// client/src/pages/VerifyEmail.tsx
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useLocale } from '../../store/LocaleContext';
import { useVerifyEmail } from '../../store/hooks/useAuth';

const VerifyEmail = () => {
  const { t } = useLocale();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const { verify } = useVerifyEmail();
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>(
    token ? 'verifying' : 'failed'
  );
  const [errMsg, setErrMsg] = useState('');

  const doVerify = useCallback(async () => {
    if (!token) {
      setStatus('failed');
      setErrMsg(t('verify.invalidLink'));
      return;
    }
    try {
      const result = await verify(token);
      if (result.code === 'VERIFY_SUCCESS' || result.code === 'ALREADY_VERIFIED') {
        setStatus('success');
      } else if (result.code === 'VERIFY_EXPIRED') {
        setStatus('failed');
        setErrMsg(t('verify.expired'));
      } else {
        setStatus('failed');
        setErrMsg(result.message || t('verify.failed'));
      }
    } catch {
      setStatus('failed');
      setErrMsg(t('verify.failed'));
    }
  }, [token, t, verify]);

  useEffect(() => {
    doVerify();
  }, [doVerify]);

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