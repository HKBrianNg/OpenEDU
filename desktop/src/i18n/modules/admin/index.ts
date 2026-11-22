// desktop/src/i18n/modules/admin/index.ts

import { zh as menuZh, zhTW as menuZhTW, en as menuEn } from './menu';
import { zh as DBtestZh, zhTW as DBtestZhTW, en as DBtestEn } from './DBtest';
import { zh as LogViewerZh, zhTW as LogViewerZhTW, en as LogViewerEn } from './LogViewer';
import { zh as UserAdminZh, zhTW as UserAdminZhTW, en as UserAdminEn } from './UserAdmin';
import { zh as SongsAdminZh, zhTW as SongsAdminZhTW, en as SongsAdminEn } from './SongsAdmin';
import { zh as VideoAdminZh, zhTW as VideoAdminZhTW, en as VideoAdminEn } from './VideoAdmin';
import { zh as ImageAdminZh, zhTW as ImageAdminZhTW, en as ImageAdminEn } from './ImageAdmin';

export const zh = {
  ...menuZh,
  ...DBtestZh,
  ...LogViewerZh,
  ...UserAdminZh,
  ...SongsAdminZh,
  ...VideoAdminZh,
  ...ImageAdminZh,
};

export const zhTW = {
  ...menuZhTW,
  ...DBtestZhTW,
  ...LogViewerZhTW,
  ...UserAdminZhTW,
  ...SongsAdminZhTW,
  ...VideoAdminZhTW,
  ...ImageAdminZhTW,
};

export const en = {
  ...menuEn,
  ...DBtestEn,
  ...LogViewerEn,
  ...UserAdminEn,
  ...SongsAdminEn,
  ...VideoAdminEn,
  ...ImageAdminEn,
};