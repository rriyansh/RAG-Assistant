const translations = {
  en: ["English", "Settings", "Search settings", "Welcome to ResoAgent!", "How can I help you?", "Chat", "Agent", "Web search", "App Language"],
  fr: ["Français", "Paramètres", "Rechercher dans les paramètres", "Bienvenue dans ResoAgent !", "Comment puis-je vous aider ?", "Discussion", "Agent", "Recherche web", "Langue de l’application"],
  es: ["Español", "Configuración", "Buscar en la configuración", "¡Te damos la bienvenida a ResoAgent!", "¿Cómo puedo ayudarte?", "Chat", "Agente", "Búsqueda web", "Idioma de la aplicación"],
  hi: ["हिन्दी", "सेटिंग्स", "सेटिंग्स खोजें", "ResoAgent में आपका स्वागत है!", "मैं आपकी क्या मदद करूँ?", "चैट", "एजेंट", "वेब खोज", "ऐप की भाषा"],
  ar: ["العربية", "الإعدادات", "ابحث في الإعدادات", "مرحبًا بك في ResoAgent!", "كيف يمكنني مساعدتك؟", "الدردشة", "الوكيل", "بحث الويب", "لغة التطبيق"],
  ur: ["اردو", "ترتیبات", "ترتیبات تلاش کریں", "ResoAgent میں خوش آمدید!", "میں آپ کی کیا مدد کر سکتا ہوں؟", "چیٹ", "ایجنٹ", "ویب تلاش", "ایپ کی زبان"],
  ja: ["日本語", "設定", "設定を検索", "ResoAgentへようこそ！", "どのようにお手伝いできますか？", "チャット", "エージェント", "ウェブ検索", "アプリの言語"],
} as const;

export type Locale = string;
export const languages = // ISO 639-1 languages, displayed in their own language where supported.
  "aa ab ae af ak am an ar as av ay az ba be bg bh bi bm bn bo br bs ca ce ch co cr cs cu cv cy da de dv dz ee el en eo es et eu fa ff fi fj fo fr fy ga gd gl gn gu gv ha he hi ho hr ht hu hy hz ia id ie ig ii ik io is it iu ja jv ka kg ki kj kk kl km kn ko kr ks ku kv kw ky la lb lg li ln lo lt lu lv mg mh mi mk ml mn mr ms mt my na nb nd ne ng nl nn no nr nv ny oc oj om or os pa pi pl ps pt qu rm rn ro ru rw sa sc sd se sg si sk sl sm sn so sq sr ss st su sv sw ta te tg th ti tk tl tn to tr ts tt tw ty ug uk ur uz ve vi vo wa wo xh yi yo za zh zu".split(" ").map(id => {
    const translated = translations[id as keyof typeof translations];
    let label: string = translated?.[0] ?? languageName(id);
    if (!translated && Intl.DisplayNames.supportedLocalesOf([id]).length) {
      label = new Intl.DisplayNames([id], { type: "language" }).of(id) || label;
    }
    return { id, label };
  });

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

export const interfaceLanguages = languages;

export function settingLabel(_locale: Locale | undefined, label: string) {
  return label;
}

export function regionOptions(locale: Locale) {
  const regions = ["US", "GB", "IN", "CA", "AU", "DE", "FR", "ES", "IT", "JP", "KR", "BR", "AE", "SG", "NL", "SE", "CH"];
  const display = new Intl.DisplayNames([locale || "en"], { type: "region" });
  return regions.map(code => ({ code, name: display.of(code) || code }));
}
