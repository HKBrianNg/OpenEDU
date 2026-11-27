// desktop/src/pages/admin/PhoneAdmin/index.tsx
//
// 手机传输统一管理（admin）：手机在连接页可选「相簿照片 / 手机文件 / 相机直播」，
// PC 端只有相机面板一个入口，不再拆两个 Tab 重复放连接指引：
//   🔗 连接     —— 二维码 / 网址 / 多 IP 选择（手机端在这里传照片和文件）
//   🎥 影像与识别 —— 实时影像、拍照录像、OCR 文字识别
//   📁 档案传输 —— 收到的文件列表、保存目录（面板本体在 PhoneFilesPanel）

import { useLocale } from '../../../store/LocaleContext';
import CameraPanel from './components/CameraPanel';
import PhoneFilesPanel from './components/PhoneFilesPanel';

export function PhoneAdmin() {
  const { t } = useLocale();
  return (
    <CameraPanel
      filesTab={{
        label: `📁 ${t('Phone.tabFiles')}`,
        children: <PhoneFilesPanel />,
      }}
    />
  );
}

PhoneAdmin.displayName = 'PhoneAdmin';
