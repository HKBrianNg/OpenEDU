import { Dayjs } from 'dayjs';

export interface EventItem {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  time?: string; // HH:mm
  note?: string;
}

export interface TemplateItem {
  title: string;
  time?: string;
  note?: string;
}

export interface MyCalendarProps {
  onExit?: () => void;
}

export type { Dayjs };