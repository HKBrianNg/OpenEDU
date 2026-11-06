import { Card } from "antd";
import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";

interface ModuleCardProps {
  title: string;
  description: string;
  gradient: string;
  icon: ReactNode;
  route: string;
}

export function ModuleCard({ title, description, gradient, icon, route }: ModuleCardProps) {
  const navigate = useNavigate();

  return (
    <Card
      hoverable
      onClick={() => navigate(route)}
      styles={{ body: { padding: 0 } }}
      style={{
        borderRadius: 12,
        overflow: "hidden"
      }}
    >
      <div
        style={{
          height: 96,
          background: gradient,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 12
        }}
      >
        {icon}
      </div>
      <div style={{ padding: 12 }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 16 }}>{title}</h3>
        <p style={{ margin: 0, color: "#666", fontSize: 13, lineHeight: 1.4 }}>
          {description}
        </p>
      </div>
    </Card>
  );
}
