import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Tag, Typography, Spin, Button, Space } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCourseStore } from '../store/courseStore';
import { useLocale } from '../store/LocaleContext';

const { Title, Text } = Typography;

// 工具函数：获取多语言字段的值
function getLocalizedValue(value: any, locale: string): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  return value[locale] || value.zh || ''
}

// 级别列表及其多语言映射
const levels = [
  { key: 'beginner', label: { zh: '初级', en: 'Beginner' } },
  { key: 'intermediate', label: { zh: '中级', en: 'Intermediate' } },
  { key: 'advanced', label: { zh: '高级', en: 'Advanced' } },
];

const Courses: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, locale } = useLocale();
  const { allCourses, categories, loaded } = useCourseStore();
  const [filteredCourses, setFilteredCourses] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [searchText, setSearchText] = useState<string>('');

  // 从 URL 读取 search 参数
  useEffect(() => {
    const searchFromUrl = searchParams.get('search');
    if (searchFromUrl) {
      setSearchText(searchFromUrl);
    }
  }, [searchParams]);

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

    if (selectedLevel) {
      result = result.filter(c => {
        const levelStr = typeof c.level === 'object' ? c.level[locale] || c.level.zh : c.level;
        return levelStr === selectedLevel;
      });
    }

    if (searchText) {
      const keyword = searchText.toLowerCase();
      result = result.filter(c => {
        const titleStr = getLocalizedValue(c.title, locale).toLowerCase();
        const descStr = getLocalizedValue(c.description, locale).toLowerCase();
        return (
          titleStr.includes(keyword) ||
          descStr.includes(keyword) ||
          c.tags.some((t: string) => t.toLowerCase().includes(keyword))
        );
      });
    }

    setFilteredCourses(result);
  }, [allCourses, loaded, selectedCategory, selectedLevel, searchText, locale]);

  const handleCategoryClick = (categoryName: string) => {
    if (selectedCategory === categoryName) {
      setSelectedCategory('');
    } else {
      setSelectedCategory(categoryName);
    }
    setSearchText('');
  };

  const handleLevelClick = (levelKey: string) => {
    const levelObj = levels.find(l => l.key === levelKey);
    const levelLabel = levelObj ? getLocalizedValue(levelObj.label, locale) : levelKey;
    if (selectedLevel === levelLabel) {
      setSelectedLevel('');
    } else {
      setSelectedLevel(levelLabel);
    }
    setSearchText('');
  };

  if (!loaded) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '12px' }}>
      {/* 第一行：级别筛选 */}
      <div style={{ marginBottom: 12 }}>
        <Space wrap>
          <Button
            type={selectedLevel === '' ? 'primary' : 'default'}
            onClick={() => {
              setSelectedLevel('');
              setSearchText('');
            }}
          >
            {t('courses.allLevels')}
          </Button>
          {levels.map(level => {
            const displayLabel = getLocalizedValue(level.label, locale);
            return (
              <Button
                key={level.key}
                type={selectedLevel === displayLabel ? 'primary' : 'default'}
                onClick={() => handleLevelClick(level.key)}
              >
                {displayLabel}
              </Button>
            );
          })}
        </Space>
      </div>

      {/* 第二行：分类筛选 */}
      <div style={{ marginBottom: 24 }}>
        <Space wrap>
          <Button
            type={selectedCategory === '' ? 'primary' : 'default'}
            onClick={() => {
              setSelectedCategory('');
              setSearchText('');
            }}
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
      </div>

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
                  <Tag color="green">
                    {getLocalizedValue(course.level, locale)}
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