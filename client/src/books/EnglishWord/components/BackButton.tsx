// client/src/books/EnglishWord/components/BackButton.tsx

import { useLocale } from '../../../store/LocaleContext'

interface BackButtonProps {
    onExit?: () => void
}

export default function BackButton({ onExit }: BackButtonProps) {
    const { t } = useLocale()

    if (!onExit) return null

    return (
        <div style={{ margin: '12px 18px 0' }}>
            <button
                onClick={onExit}
                style={{
                    padding: '7px 18px',
                    fontSize: 14,
                    borderRadius: 99,
                    border: '1px solid #d0d0d0',
                    background: '#fff',
                    color: '#333',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                }}
            >
                ← {t('englishword.backToLobby') || '返回大厅'}
            </button>
        </div>
    )
}