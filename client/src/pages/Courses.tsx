import React, { useState, useEffect, useRef } from 'react';
import { Card, Row, Col, Tag, Typography, Spin, Button, Space, Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useCourseStore } from '../store/courseStore';
import { useLocale } from '../store/LocaleContext';

const { Title, Text } = Typography;

// 工具函数：获取多语言字段的值
function getLocalizedValue(value: any, locale: string): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  return value[locale] || value.zh || ''
}

const Courses: React.FC = () => {
  const navigate = useNavigate();
  const { t, locale } = useLocale();
  const { allCourses, categories, loaded } = useCourseStore();
  const [filteredCourses, setFilteredCourses] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchText, setSearchText] = useState<string>('');
  const [inputValue, setInputValue] = useState<string>('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<any>(null);

  useEffect(() => {
    if (loaded) {
      setFilteredCourses(allCourses);
    }
  }, [loaded, allCourses]);

  useEffect(() => {
    if (!loaded) return;
    
    let result = [...allCourses];

    if (selectedCategory) {
      result = result.filter(c => {
        const catName = typeof c.category === 'object' ? c.category[locale] || c.category.zh : c.category;
        return catName === selectedCategory;
      });
    }

    if (searchText) {
      const keyword = searchText.toLowerCase();
      result = result.filter(
        c =>
          c.title.toLowerCase().includes(keyword) ||
          c.description.toLowerCase().includes(keyword) ||
          c.tags.some((t: string) => t.toLowerCase().includes(keyword))
      );
    }

    setFilteredCourses(result);
  }, [allCourses, loaded, selectedCategory, searchText, locale]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      setSearchText(value);
      if (value) {
        setSelectedCategory('');
      }
    }, 300);
  };

  const handleCategoryClick = (categoryName: string) => {
    setSelectedCategory(categoryName);
    setSearchText('');
    setInputValue('');
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  if (!loaded) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>{t('courses.title')}</Title>
        
        <Input
          ref={inputRef}
          placeholder={t('courses.search')}
          allowClear
          prefix={<SearchOutlined />}
          size="large"
          style={{ width: 350 }}
          value={inputValue}
          onChange={handleSearchChange}
        />
      </div>

      <Space wrap style={{ marginBottom: 24 }}>
        <Button
          type={selectedCategory === '' ? 'primary' : 'default'}
          onClick={() => handleCategoryClick('')}
        >
          {t('courses.all')}
        </Button>
        {categories.map(cat => {
          const displayName = typeof cat.name === 'object' ? getLocalizedValue(cat.name, locale) : cat.name;
          return (
            <Button
              key={cat.id}
              type={selectedCategory === displayName ? 'primary' : 'default'}
              onClick={() => handleCategoryClick(displayName)}
            >
              {displayName}
            </Button>
          );
        })}
      </Space>

      {filteredCourses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#999' }}>
          {t('courses.empty')}
        </div>
      ) : (
        <Row gutter={[24, 24]}>
          {filteredCourses.map(course => (
            <Col xs={24} sm={12} lg={8} xl={6} key={course.id}>
              <Card
                hoverable
                onClick={() => navigate(`/courses/${course.id}`)}
                cover={
                  <div style={{ height: 160, overflow: 'hidden', background: '#f5f5f5' }}>
                    <img
                      alt={course.title}
                      src={course.coverUrl || '/images/default-course.svg'}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/default-course.svg';
                      }}
                    />
                  </div>
                }
              >
                <Title level={4} ellipsis>{getLocalizedValue(course.title, locale)}</Title>
                <Text type="secondary" ellipsis style={{ display: 'block', marginBottom: 12 }}>
                  {getLocalizedValue(course.description, locale)}
                </Text>
                <div style={{ marginBottom: 8 }}>
                  <Tag color="blue">
                    {getLocalizedValue(course.category, locale)}
                  </Tag>
                </div>
                <div>
                  {course.tags.map((tag: string) => (
                    <Tag key={tag}>{tag}</Tag>
                  ))}
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
};

export default Courses;