import React, { useState, useEffect, useMemo } from 'react';
import { Card, Row, Col, Tag, Typography, Spin, Button, Space } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCourseStore } from '../store/courseStore';
import { useLocale } from '../store/LocaleContext';
import { getLocalText } from '../CoursesData';

const { Title, Text } = Typography;

// 多语言通用类型
type LocaleObj = { zh: string; en: string };

// 难度级别类型
interface LevelItem {
  key: string;
  label: LocaleObj;
}

const levels: LevelItem[] = [
  { key: 'beginner', label: { zh: '初级', en: 'Beginner' } },
  { key: 'intermediate', label: { zh: '中级', en: 'Intermediate' } },
  { key: 'advanced', label: { zh: '高级', en: 'Advanced' } },
];

const Courses: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, locale } = useLocale();
  const { allCourses, categories, loaded } = useCourseStore();

  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [searchText, setSearchText] = useState<string>('');

  // 读取URL搜索参数
  useEffect(() => {
    const searchFromUrl = searchParams.get('search');
    if (searchFromUrl) setSearchText(searchFromUrl);
  }, [searchParams]);

  // 使用useMemo缓存筛选结果，替代useEffect+state，减少重复渲染
  const filteredCourses = useMemo(() => {
    if (!loaded) return [];
    console.log('分类列表 categories =', categories);
    let result = [...allCourses];

    // 分类筛选
    if (selectedCategory) {
      result = result.filter(course => {
        const catName = getLocalText(course.category, locale);
        return catName === selectedCategory;
      });
    }

    // 难度筛选
    if (selectedLevel) {
      result = result.filter(course => {
        const levelText = getLocalText(course.level, locale);
        return levelText === selectedLevel;
      });
    }

    // 关键词搜索筛选
    if (searchText.trim()) {
      const keyword = searchText.toLowerCase();
      result = result.filter(course => {
        const title = getLocalText(course.title, locale).toLowerCase();
        const desc = getLocalText(course.description, locale).toLowerCase();
        const tagMatch = course.tags.some(tag => tag.toLowerCase().includes(keyword));
        return title.includes(keyword) || desc.includes(keyword) || tagMatch;
      });
    }

    return result;
  }, [allCourses, loaded, selectedCategory, selectedLevel, searchText, locale, categories]);

  // 切换分类筛选
  const handleCategoryClick = (categoryName: string) => {
    setSelectedCategory(prev => prev === categoryName ? '' : categoryName);
    setSearchText('');
  };

  // 切换难度筛选
  const handleLevelClick = (levelKey: string) => {
    const targetLevel = levels.find(item => item.key === levelKey);
    const levelLabel = targetLevel ? getLocalText(targetLevel.label, locale) : levelKey;
    setSelectedLevel(prev => prev === levelLabel ? '' : levelLabel);
    setSearchText('');
  };

  // 加载状态
  if (!loaded) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '12px' }}>
      {/* 难度筛选栏 */}
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
            const labelText = getLocalText(level.label, locale);
            return (
              <Button
                key={level.key}
                type={selectedLevel === labelText ? 'primary' : 'default'}
                onClick={() => handleLevelClick(level.key)}
              >
                {labelText}
              </Button>
            );
          })}
        </Space>
      </div>

      {/* 分类筛选栏 */}
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
            const displayName = getLocalText(cat.name, locale);
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

      {/* 无课程空状态 */}
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
                      alt={getLocalText(course.title, locale)}
                      src={course.coverUrl}
                      referrerPolicy="no-referrer"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        const fallbackImg = "/images/default-course.svg";
                        if (!img.src.endsWith(fallbackImg)) {
                          console.error(`课程封面加载失败 | courseId:${course.id} | 原链接:${course.coverUrl}`);
                          img.src = fallbackImg;
                        }
                      }}
                    />
                  </div>
                }
              >
                <Title level={4} ellipsis>{getLocalText(course.title, locale)}</Title>
                <Text type="secondary" ellipsis style={{ display: 'block', marginBottom: 12 }}>
                  {getLocalText(course.description, locale)}
                </Text>
                <div style={{ marginBottom: 8 }}>
                  <Tag color="blue">{getLocalText(course.category, locale)}</Tag>
                  <Tag color="green">{getLocalText(course.level, locale)}</Tag>
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
