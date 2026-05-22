import { zh } from './zh';
import { en } from './en';
import type { Locale } from '../types/settings';

export function getMessages(locale: Locale) {
  return locale === 'en-US' ? en : zh;
}

export type I18nMessages = typeof zh;
