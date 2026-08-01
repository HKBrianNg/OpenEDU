import React, { useState, useEffect, useRef } from 'react';
import { Card, Row, Col, Tag, Rate, Typography, Spin, Button, Space, Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useCourseStore } from '../store/courseStore';

const { Title, Text } = Typography;

const Courses: React.FC = () => {
  const navigate = useNavigate();
  const { allCourses, categories, loaded } = useCourseStore();
  const [filteredCourses, setFilteredCourses] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchText, setSearchText] = useState<string>('');
  const [inputValue, setInputValue] = useState<string>('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<any>(null);

  // 数据加载完成后初始化
  useEffect(() => {
    if (loaded) {
      setFilteredCourses(allCourses);
    }
  }, [loaded, allCourses]);

  // 前端筛选
  useEffect(() => {
    if (!loaded) return;
    
    let result = [...allCourses];

    if (selectedCategory) {
      result = result.filter(c => c.category === selectedCategory);
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
  }, [allCourses, loaded, selectedCategory, searchText]);

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
        <Title level={2} style={{ margin: 0 }}>全部课程</Title>
        
        <Input
          ref={inputRef}
          placeholder="搜索课程名称、描述或标签..."
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
          全部
        </Button>
        {categories.map(cat => (
          <Button
            key={cat.id}
            type={selectedCategory === cat.name ? 'primary' : 'default'}
            onClick={() => handleCategoryClick(cat.name)}
          >
            {cat.name}
          </Button>
        ))}
      </Space>

      {filteredCourses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#999' }}>
          没有找到符合条件的课程
        </div>
      ) : (
        <Row gutter={[24, 24]}>
          {filteredCourses.map(course => (
            <Col xs={24} sm={12} lg={8} xl={6} key={course.id}>
              <Card
                hoverable
                onClick={() => navigate(`/courses/${course.id}`)}
                cover={
                  <div style={{ height: 180, overflow: 'hidden', background: '#f5f5f5' }}>
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
                <Title level={4} ellipsis>{course.title}</Title>
                <Text type="secondary" ellipsis style={{ display: 'block', marginBottom: 12 }}>
                  {course.description}
                </Text>
                <div style={{ marginBottom: 8 }}>
                  <Rate disabled value={course.rating} allowHalf />
                  <Text type="secondary" style={{ marginLeft: 8 }}>
                    ({course.studentsCount} 人学习)
                  </Text>
                </div>
                <div style={{ marginBottom: 8 }}>
                  {course.tags.map((tag: string) => (
                    <Tag key={tag}>{tag}</Tag>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <Text strong style={{ fontSize: 20, color: '#f5222d' }}>
                      ¥{course.price}
                    </Text>
                    {course.originalPrice && (
                      <Text delete style={{ marginLeft: 8, color: '#999' }}>
                        ¥{course.originalPrice}
                      </Text>
                    )}
                  </div>
                  <Text type="secondary">{course.instructor}</Text>
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