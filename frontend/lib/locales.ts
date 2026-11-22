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
export const interfaceLanguages = Object.entries(translations).map(([id, values]) => ({id, label:values[0]}));
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

export function regionOptions(locale: string) {
  const names = new Intl.DisplayNames([locale], {type:"region"});
  const preferred = new Intl.Locale(locale).maximize().region;
  return "AW AF AO AI AX AL AD AE AR AM AS AQ TF AG AU AT AZ BI BE BJ BQ BF BD BG BH BS BA BL BY BZ BM BO BR BB BN BT BV BW CF CA CC CH CL CN CI CM CD CG CK CO KM CV CR CU CW CX KY CY CZ DE DJ DM DK DO DZ EC EG ER EH ES EE ET FI FJ FK FR FO FM GA GB GE GG GH GI GN GP GM GW GQ GR GD GL GT GF GU GY HK HM HN HR HT HU ID IM IN IO IE IR IQ IS IL IT JM JE JO JP KZ KE KG KH KI KN KR KW LA LB LR LY LC LI LK LS LT LU LV MO MF MA MC MD MG MV MX MH MK ML MT MM ME MN MP MZ MR MS MQ MU MW MY YT NA NC NE NF NG NI NU NL NO NP NR NZ OM PK PA PN PE PH PW PG PL PR KP PT PY PS PF QA RE RO RU RW SA SD SN SG GS SH SJ SB SL SV SM SO PM RS SS ST SR SK SI SE SZ SX SC SY TC TD TG TH TJ TK TM TL TO TT TN TR TV TW TZ UG UA UM UY US UZ VA VC VE VG VI VN VU WF WS YE ZA ZM ZW".split(" ").map(code => ({code,name:names.of(code) || code}))
    .sort((a,b) => a.code === preferred ? -1 : b.code === preferred ? 1 : a.name.localeCompare(b.name,locale));
}

const menuLabels: Record<string,string[]> = {
  "en": [
    "Subscription",
    "App",
    "AI Assistant",
    "Premium",
    "Appearance",
    "Haptics",
    "Notifications",
    "Widget",
    "Configure Action Button",
    "Customize Assistant",
    "Connectors & Tools",
    "Behavior & Autonomy",
    "Privacy & Safety",
    "Data & Memory",
    "API Keys",
    "Model",
    "Country or region"
  ],
  "fr": [
    "Abonnement",
    "Application",
    "Assistant IA",
    "Premium",
    "Apparence",
    "Retour haptique",
    "Notifications",
    "Widget",
    "Configurer le bouton d’action",
    "Personnaliser l’assistant",
    "Connecteurs et outils",
    "Comportement et autonomie",
    "Confidentialité et sécurité",
    "Données et mémoire",
    "Clés API",
    "Modèle",
    "Pays ou région"
  ],
  "es": [
    "Suscripción",
    "Aplicación",
    "Asistente de IA",
    "Premium",
    "Apariencia",
    "Respuesta háptica",
    "Notificaciones",
    "Widget",
    "Configurar botón de acción",
    "Personalizar asistente",
    "Conectores y herramientas",
    "Comportamiento y autonomía",
    "Privacidad y seguridad",
    "Datos y memoria",
    "Claves API",
    "Modelo",
    "País o región"
  ],
  "hi": [
    "सदस्यता",
    "ऐप",
    "एआई सहायक",
    "प्रीमियम",
    "दिखावट",
    "स्पर्श प्रतिक्रिया",
    "सूचनाएँ",
    "विजेट",
    "ऐक्शन बटन सेट करें",
    "सहायक अनुकूलित करें",
    "कनेक्टर और टूल",
    "व्यवहार और स्वायत्तता",
    "गोपनीयता और सुरक्षा",
    "डेटा और मेमोरी",
    "एपीआई कुंजियाँ",
    "मॉडल",
    "देश या क्षेत्र"
  ],
  "ar": [
    "الاشتراك",
    "التطبيق",
    "مساعد الذكاء الاصطناعي",
    "مميز",
    "المظهر",
    "اللمس",
    "الإشعارات",
    "الأداة",
    "تكوين زر الإجراء",
    "تخصيص المساعد",
    "الموصلات والأدوات",
    "السلوك والاستقلالية",
    "الخصوصية والأمان",
    "البيانات والذاكرة",
    "مفاتيح API",
    "النموذج",
    "البلد أو المنطقة"
  ],
  "ur": [
    "رکنیت",
    "ایپ",
    "اے آئی معاون",
    "پریمیم",
    "ظاہری شکل",
    "لمسی ردعمل",
    "اطلاعات",
    "ویجیٹ",
    "ایکشن بٹن کی ترتیب",
    "معاون کی تخصیص",
    "کنیکٹر اور ٹولز",
    "رویّہ اور خود مختاری",
    "رازداری اور حفاظت",
    "ڈیٹا اور یادداشت",
    "اے پی آئی کلیدیں",
    "ماڈل",
    "ملک یا خطہ"
  ],
  "ja": [
    "サブスクリプション",
    "アプリ",
    "AIアシスタント",
    "プレミアム",
    "外観",
    "触覚フィードバック",
    "通知",
    "ウィジェット",
    "アクションボタンの設定",
    "アシスタントのカスタマイズ",
    "コネクターとツール",
    "動作と自律性",
    "プライバシーと安全性",
    "データとメモリ",
    "APIキー",
    "モデル",
    "国または地域"
  ]
};
export function settingLabel(locale: string | undefined, english: string) {
  const index = menuLabels.en!.indexOf(english);
  return menuLabels[(locale || "en").split("-")[0] || "en"]?.[index] ?? english;
}
