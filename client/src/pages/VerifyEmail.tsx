// client/src/pages/VerifyEmail.tsx
import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useLocale } from '../store/LocaleContext';

const VerifyEmail = () => {
  const { t } = useLocale();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verify = async () => {
      try {
        const res = await fetch(`/api/verify-email?token=${token}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        const data = await res.json();
        
        if (data.code === 'VERIFY_SUCCESS') {
          setStatus('success');
        } else if (data.code === 'ALREADY_VERIFIED') {
          setStatus('success');
        } else if (data.code === 'VERIFY_EXPIRED') {
          setStatus('failed');
          setMessage(t('verify.expired'));
        } else {
          setStatus('failed');
          setMessage(data.message || t('verify.failed'));
        }
      } catch (error) {
        setStatus('failed');
        setMessage(t('verify.failed'));
      }
    };
    
    if (token) {
      verify();
    } else {
      setStatus('failed');
      setMessage(t('verify.invalidLink'));
    }
  }, [token, t]);

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
            <p className="text-gray-600 mb-6">{message}</p>
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