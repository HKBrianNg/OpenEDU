// client/src/components/GlobalSearch.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLocale } from '../store/LocaleContext';

const GlobalSearch: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLocale();
  const [value, setValue] = useState(searchParams.get('search') || '');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 当 URL 参数变化时同步到输入框（比如用户点了浏览器的后退）
  useEffect(() => {
    const searchFromUrl = searchParams.get('search');
    setValue(searchFromUrl || '');
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setValue(v);
    
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    debounceTimer.current = setTimeout(() => {
      if (v.trim()) {
        navigate(`/courses?search=${encodeURIComponent(v.trim())}`);
      } else {
        navigate('/courses');
      }
    }, 400);
  };

  const handleClear = () => {
    setValue('');
    navigate('/courses');
  };

  return (
    <Input
      placeholder={t('courses.search')}
      prefix={<SearchOutlined />}
      allowClear
      size="middle"
      style={{ width: 210 }}
      value={value}
      onChange={handleChange}
      onClear={handleClear}
    />
  );
};

export default GlobalSearch;