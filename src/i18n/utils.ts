import ko from "@/i18n/ko.ts";
import en from "@/i18n/en.ts";

export function getLang(url: URL | Location) {
  const lang = url.pathname.split("/")[1];
  return lang === "en" ? "en" : "ko";
}

export function useTranslations(lang: string) {
  return function t<T extends keyof typeof ko | keyof typeof en>(key: T) {
    return lang === "en" ? en[key] : ko[key];
  };
}
