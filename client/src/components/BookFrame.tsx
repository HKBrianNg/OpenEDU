import React, { useState } from 'react';
import { Card, Empty } from 'antd';
import BookManager from '../utils/BookManager';
import type { BookEntry } from '../utils/BookManager';
import { useLocale } from '../store/LocaleContext';

const BookFrame: React.FC = () => {
  const { t } = useLocale();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const books = BookManager.getAll();
  const selectedBook: BookEntry | undefined = selectedId
    ? BookManager.get(selectedId)
    : undefined;

  const resolveText = (value: string | ((t: (key: string) => string) => string)): string => {
    if (typeof value === 'function') {
      return value(t);
    }
    return value;
  };

  if (selectedBook) {
    const BookComponent = selectedBook.component;
    return (
      <div style={{ padding: 12 }}>
        <BookComponent onExit={() => setSelectedId(null)} />
      </div>
    );
  }

  if (books.length === 0) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Empty description="暂无书" />
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 12px' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 16,
        }}
      >
        {books.map((book) => (
          <Card
            key={book.id}
            hoverable
            cover={
              <div
                style={{
                  height: 140,
                  background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 48,
                }}
              >
                {book.icon}
              </div>
            }
            onClick={() => setSelectedId(book.id)}
          >
            <Card.Meta
              title={resolveText(book.title)}
              description={book.description ? resolveText(book.description) : ''}
            />
          </Card>
        ))}
      </div>
    </div>
  );
};

export default BookFrame;