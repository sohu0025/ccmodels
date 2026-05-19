import { zh } from './zh';
import { en } from './en';
import type { Locale } from '../types/settings';

export const messages: Record<Locale, typeof zh> = { 'zh-CN': zh, 'en-US': en };

export function getMessages(locale: Locale) {
  return messages[locale] ?? messages['zh-CN'];
}

export type I18nMessages = typeof zh;
