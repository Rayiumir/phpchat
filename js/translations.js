const translations = {
    en: {
        "chat.title": "Chat System",
        "chat.subtitle": "Messages are auto-cleared when reaching 20 messages",
        "theme.toggle": "Toggle Theme",
        "font.size": "Text Size",
        "username.placeholder": "Please enter your name...",
        "username.join": "Join Chat",
        "username.min_length": "Name must be at least 2 characters",
        "username.max_length": "Name cannot exceed 50 characters",
        "chat.welcome": "You are in the chat as <strong id=\"currentUsername\"></strong>",
        "messages.loading": "Loading messages...",
        "message.placeholder": "Type your message...",
        "message.send": "Send",
        "message.empty": "Please enter your message",
        "message.max_length": "Message cannot exceed 500 characters",
        "message.sending": "Sending...",
        "message.sending_prefix": "(sending...)",
        "reply.reply": "Reply",
        "reply.cancel": "Cancel reply",
        "reply.replying": "Replying to",
        "notification.mentioned_you": "mentioned you",
        "notification.mention_title": "You were mentioned",
        "notification.replied_to_you": "replied to you",
        "notification.close": "Close",
        "emoji.title": "Emojis",
        "emoji.recent": "Recent Emojis",
        "emoji.close": "Close",
        "alert.error.connection": "Connection error. Please check your internet connection.",
        "alert.error.server": "Server error (code: {code})",
        "alert.error.timeout": "Timeout! Server not responding.",
        "alert.error.parse": "Error processing server response",
        "alert.error.send": "Error sending message: {message}",
        "alert.warning.empty": "Please enter your message",
        "alert.warning.length": "Message cannot exceed 500 characters",
        "language.switch": "Switch to Persian",
        "language.current": "English",
        "dir": "ltr",
        "lang": "en"
    },
    fa: {
        "chat.title": "سیستم چت",
        "chat.subtitle": "پیام‌ها به صورت خودکار هنگام رسیدن به ۲۰ پیام پاکسازی می‌شوند",
        "theme.toggle": "تغییر تم",
        "font.size": "اندازه متن",
        "username.placeholder": "لطفاً نام خود را وارد کنید ...",
        "username.join": "ورود به چت",
        "username.min_length": "نام باید حداقل ۲ کاراکتر باشد",
        "username.max_length": "نام نمی‌تواند بیش از ۵۰ کاراکتر باشد",
        "chat.welcome": "شما با نام <strong id=\"currentUsername\"></strong> در چت حضور دارید",
        "messages.loading": "در حال بارگذاری پیام‌ها...",
        "message.placeholder": "پیام خود را بنویسید...",
        "message.send": "ارسال",
        "message.empty": "لطفاً پیام خود را وارد کنید",
        "message.max_length": "پیام نمی‌تواند بیش از ۵۰۰ کاراکتر باشد",
        "message.sending": "در حال ارسال...",
        "message.sending_prefix": "(در حال ارسال...)",
        "reply.reply": "پاسخ",
        "reply.cancel": "لغو پاسخ",
        "reply.replying": "در حال پاسخ به",
        "notification.mentioned_you": "شما را ذکر کرد",
        "notification.mention_title": "شما ذکر شدید",
        "notification.replied_to_you": "به شما پاسخ داد",
        "notification.close": "بستن",
        "emoji.title": "ایموجی‌ها",
        "emoji.recent": "ایموجی‌های اخیر",
        "emoji.close": "بستن",
        "alert.error.connection": "خطا در ارتباط با سرور. لطفاً اتصال اینترنت را بررسی کنید.",
        "alert.error.server": "خطا در ارتباط با سرور (کد: {code})",
        "alert.error.timeout": "Timeout! سرور پاسخ نمی‌دهد.",
        "alert.error.parse": "خطا در پردازش پاسخ سرور",
        "alert.error.send": "خطا در ارسال پیام: {message}",
        "alert.warning.empty": "لطفاً پیام خود را وارد کنید",
        "alert.warning.length": "پیام نمی‌تواند بیش از ۵۰۰ کاراکتر باشد",
        "language.switch": "Switch to English",
        "language.current": "فارسی",
        "dir": "rtl",
        "lang": "fa"
    }
};

let currentLanguage = localStorage.getItem('language') || 'fa';

function t(key, params = {}) {
    const lang = translations[currentLanguage] || translations.fa;
    let text = lang[key] || key;
    
    for (const [paramKey, paramValue] of Object.entries(params)) {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), paramValue);
    }
    
    return text;
}

function setLanguage(lang) {
    if (!translations[lang]) return false;
    
    currentLanguage = lang;
    localStorage.setItem('language', lang);
    
    document.documentElement.setAttribute('dir', translations[lang].dir);
    document.documentElement.setAttribute('lang', translations[lang].lang);
    
    updatePageTexts();
    updateLanguageButton();
    
    return true;
}

function getCurrentLanguage() {
    return currentLanguage;
}

function updatePageTexts() {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(element => {
        const key = element.getAttribute('data-i18n');
        const translated = t(key);
        
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
            if (element.hasAttribute('placeholder')) {
                element.placeholder = translated;
            } else {
                element.value = translated;
            }
        } else if (element.tagName === 'BUTTON' && element.hasAttribute('title')) {
            element.title = translated;
        } else {
            element.innerHTML = translated;
        }
    });
    
    const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
    placeholderElements.forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        element.placeholder = t(key);
    });
    
    const titleElements = document.querySelectorAll('[data-i18n-title]');
    titleElements.forEach(element => {
        const key = element.getAttribute('data-i18n-title');
        element.title = t(key);
    });
}

function updateLanguageButton() {
    const langBtn = document.getElementById('languageToggle');
    const langIcon = document.getElementById('languageIcon');
    const langText = document.getElementById('languageText');
    
    if (langBtn && langText) {
        langText.textContent = t('language.current');
    }
    
    if (langBtn) {
        langBtn.title = t('language.switch');
    }
}

function initLanguage() {
    setLanguage(currentLanguage);
    
    const langToggle = document.getElementById('languageToggle');
    if (langToggle) {
        langToggle.addEventListener('click', () => {
            const newLang = currentLanguage === 'fa' ? 'en' : 'fa';
            setLanguage(newLang);
        });
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { translations, t, setLanguage, getCurrentLanguage, initLanguage, updatePageTexts };
}