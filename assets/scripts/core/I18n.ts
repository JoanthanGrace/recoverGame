import { sys } from 'cc';
import { locales } from '../data/locales';

type Params = Record<string, string | number>;

class I18nService {
  private locale = 'zh';

  init() {
    const lang = (sys.language || 'zh').toLowerCase();
    if (lang.startsWith('ar')) {
      this.locale = 'ar';
      return;
    }
    if (lang.startsWith('tr')) {
      this.locale = 'tr';
      return;
    }
    this.locale = 'zh';
  }

  setLocale(locale: 'zh' | 'ar' | 'tr') {
    this.locale = locale;
  }

  t(key: string, params?: Params): string {
    const dict = locales[this.locale] || locales.zh;
    let text = dict[key] || locales.zh[key] || key;
    if (!params) {
      return text;
    }

    Object.keys(params).forEach((name) => {
      text = text.replace(new RegExp(`\\{${name}\\}`, 'g'), String(params[name]));
    });
    return text;
  }
}

export const i18n = new I18nService();
