// client/src/books/EnglishWord/components/ProgressButtons.tsx

import { useLocale } from '../../../store/LocaleContext'

interface ProgressButtonsProps {
    isAuthenticated: boolean
    progressLoaded: boolean
    syncing: boolean
    onDownload: () => void
    onUpload: () => void
}

export default function ProgressButtons({
    isAuthenticated,
    progressLoaded,
    syncing,
    onDownload,
    onUpload,
}: ProgressButtonsProps) {
    const { t } = useLocale()

    const buttonStyle = (disabled: boolean) => ({
        padding: '7px 18px',
        fontSize: 14,
        borderRadius: 99,
        border: '1px solid #d0d0d0',
        background: disabled ? '#f5f5f5' : '#fff',
        color: disabled ? '#bbb' : '#333',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
    })

    return (
        <div style={{ display: 'inline-flex', gap: 10 }}>
            <button
                onClick={onDownload}
                disabled={!isAuthenticated || syncing}
                style={buttonStyle(!isAuthenticated || syncing)}
                title={!isAuthenticated ? t('englishword.needLogin') || '请先登录' : ''}
            >
                ↓ {t('englishword.downloadProgress') || '下载进度'}
            </button>
            <button
                onClick={onUpload}
                disabled={!isAuthenticated || !progressLoaded || syncing}
                style={buttonStyle(!isAuthenticated || !progressLoaded || syncing)}
                title={!isAuthenticated ? t('englishword.needLogin') || '请先登录' : ''}
            >
                ↑ {t('englishword.uploadProgress') || '上传进度'}
            </button>
        </div>
    )
}