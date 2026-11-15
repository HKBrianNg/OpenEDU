import { zh as menuZh, zhTW as menuZhTW, en as menuEn } from './menu';
import { zh as DBtestZh, zhTW as DBtestZhTW, en as DBtestEn } from './DBtest';
import { zh as LogViewerZh, zhTW as LogViewerZhTW, en as LogViewerEn } from './LogViewer';
import { zh as UserAdminZh, zhTW as UserAdminZhTW, en as UserAdminEn } from './UserAdmin';

export const zh = {
  ...menuZh,
  ...DBtestZh,
  ...LogViewerZh,
  ...UserAdminZh,
};

export const zhTW = {
  ...menuZhTW,
  ...DBtestZhTW,
  ...LogViewerZhTW,
  ...UserAdminZhTW,
};

export const en = {
  ...menuEn,
  ...DBtestEn,
  ...LogViewerEn,
  ...UserAdminEn,
};