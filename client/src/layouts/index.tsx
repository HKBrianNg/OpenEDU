import React from 'react'; // 👈 1. 引入 PropsWithChildren
import type { PropsWithChildren } from 'react';
import { Layout, Menu } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { BookOutlined, HomeOutlined, InfoCircleOutlined } from '@ant-design/icons';

const { Header, Content } = Layout;

// 👇 2. 使用 PropsWithChildren 或在接口中定义 children
const MainLayout: React.FC<PropsWithChildren> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { key: '/', icon: <HomeOutlined />, label: '首页' },
    { key: '/courses', icon: <BookOutlined />, label: '课程' },
    { key: '/about', icon: <InfoCircleOutlined />, label: '关于我们' },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ 
        position: 'fixed', 
        top: 0, 
        width: '100%', 
        zIndex: 1000,
        display: 'flex', 
        alignItems: 'center' 
      }}>
        <div style={{ color: '#fff', fontSize: 20, fontWeight: 'bold', marginRight: 40 }}>
          OpenEDU
        </div>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ flex: 1, minWidth: 0 }}
        />
      </Header>
      
      {/* 👇 3. 使用传入的 children 或 Outlet */}
      <Content style={{ marginTop: 64, padding: 0 }}>
        {children ? children : <Outlet />}
      </Content>
    </Layout>
  );
};

export default MainLayout;