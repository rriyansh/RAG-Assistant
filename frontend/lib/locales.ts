const translations = {
  en: ["English", "Settings", "Search settings", "Welcome to ResoAgent!", "How can I help you?", "Chat", "Agent", "Web search", "App Language"],
  hi: ["हिन्दी", "सेटिंग्स", "सेटिंग्स खोजें", "ResoAgent में आपका स्वागत है!", "मैं आपकी क्या मदद करूँ?", "चैट", "एजेंट", "वेब खोज", "ऐप की भाषा"],
  ar: ["العربية", "الإعدادات", "ابحث في الإعدادات", "مرحبًا بك في ResoAgent!", "كيف يمكنني مساعدتك؟", "الدردشة", "الوكيل", "بحث الويب", "لغة التطبيق"],
  ur: ["اردو", "ترتیبات", "ترتیبات تلاش کریں", "ResoAgent میں خوش آمدید!", "میں آپ کی کیا مدد کر سکتا ہوں؟", "چیٹ", "ایجنٹ", "ویب تلاش", "ایپ کی زبان"],
  ja: ["日本語", "設定", "設定を検索", "ResoAgentへようこそ！", "どのようにお手伝いできますか？", "チャット", "エージェント", "ウェブ検索", "アプリの言語"],
} as const;

export type Locale = string;
export const languages = Object.entries(translations).map(([id, values]) => ({ id, label: values[0] }));

export function normalizeLocale(value: string) {
  try { return Intl.getCanonicalLocales(value.trim())[0] || ""; }
  catch { return ""; }
}

export function languageName(locale: Locale) {
  try {
    return new Intl.DisplayNames(["en"], { type: "language", fallback: "code" }).of(locale) || locale;
  } catch { return locale; }
}

export function localeDirection(locale: Locale) {
  try {
    const script = new Intl.Locale(locale).maximize().script;
    return ["Arab", "Hebr", "Thaa", "Nkoo", "Adlm", "Syrc", "Rohg", "Samr", "Mand"].includes(script || "") ? "rtl" : "ltr";
  } catch { return "ltr"; }
}

export function ui(locale: Locale = "en") {
  const base = locale.split("-")[0] as keyof typeof translations;
  const [language, settings, searchSettings, welcome, help, chat, agent, webSearch, appLanguage] = translations[base] || translations.en;
  return {language, settings, searchSettings, welcome, help, chat, agent, webSearch, appLanguage};
}
