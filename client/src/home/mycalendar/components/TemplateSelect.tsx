import { Select } from 'antd';
import type { TemplateItem } from '../types';

interface Props {
  templates: TemplateItem[];
  onSelect: (template: TemplateItem) => void;
  placeholder: string;
}

const TemplateSelect: React.FC<Props> = ({ templates, onSelect, placeholder }) => {
  return (
    <Select
      placeholder={placeholder}
      allowClear
      showSearch
      optionFilterProp="label"
      onChange={(val) => {
        const tpl = templates.find((t) => t.title === val);
        if (tpl) onSelect(tpl);
      }}
      options={templates.map((tpl) => ({
        label: `${tpl.title}${tpl.time ? `（${tpl.time}）` : ''}`,
        value: tpl.title,
      }))}
    />
  );
};
export default TemplateSelect;