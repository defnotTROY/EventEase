/**
 * Internationalization (i18n) utility
 * Handles language translations and formatting
 */

// Translation dictionaries
const translations = {
  en: {
    // Common
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.create': 'Create',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.events': 'Events',
    'nav.participants': 'Participants',
    'nav.analytics': 'Analytics',
    'nav.settings': 'Settings',
    
    // Events
    'event.title': 'Event Title',
    'event.description': 'Description',
    'event.date': 'Date',
    'event.time': 'Time',
    'event.location': 'Location',
    'event.category': 'Category',
    'event.create': 'Create Event',
    'event.edit': 'Edit Event',
    'event.delete': 'Delete Event',
    
    // Settings
    'settings.profile': 'Profile',
    'settings.notifications': 'Notifications',
    'settings.security': 'Security',
    'settings.language': 'Language',
    'settings.timezone': 'Timezone',
    
    // Notifications
    'notification.new': 'New notification',
    'notification.markRead': 'Mark as read',
    'notification.markAllRead': 'Mark all as read',
  },
  es: {
    // Common
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.delete': 'Eliminar',
    'common.edit': 'Editar',
    'common.create': 'Crear',
    'common.loading': 'Cargando...',
    'common.error': 'Error',
    'common.success': 'Éxito',
    
    // Navigation
    'nav.dashboard': 'Panel',
    'nav.events': 'Eventos',
    'nav.participants': 'Participantes',
    'nav.analytics': 'Analíticas',
    'nav.settings': 'Configuración',
    
    // Events
    'event.title': 'Título del Evento',
    'event.description': 'Descripción',
    'event.date': 'Fecha',
    'event.time': 'Hora',
    'event.location': 'Ubicación',
    'event.category': 'Categoría',
    'event.create': 'Crear Evento',
    'event.edit': 'Editar Evento',
    'event.delete': 'Eliminar Evento',
    
    // Settings
    'settings.profile': 'Perfil',
    'settings.notifications': 'Notificaciones',
    'settings.security': 'Seguridad',
    'settings.language': 'Idioma',
    'settings.timezone': 'Zona Horaria',
    
    // Notifications
    'notification.new': 'Nueva notificación',
    'notification.markRead': 'Marcar como leído',
    'notification.markAllRead': 'Marcar todo como leído',
  },
  fr: {
    // Common
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.delete': 'Supprimer',
    'common.edit': 'Modifier',
    'common.create': 'Créer',
    'common.loading': 'Chargement...',
    'common.error': 'Erreur',
    'common.success': 'Succès',
    
    // Navigation
    'nav.dashboard': 'Tableau de bord',
    'nav.events': 'Événements',
    'nav.participants': 'Participants',
    'nav.analytics': 'Analyses',
    'nav.settings': 'Paramètres',
    
    // Events
    'event.title': 'Titre de l\'événement',
    'event.description': 'Description',
    'event.date': 'Date',
    'event.time': 'Heure',
    'event.location': 'Lieu',
    'event.category': 'Catégorie',
    'event.create': 'Créer un événement',
    'event.edit': 'Modifier l\'événement',
    'event.delete': 'Supprimer l\'événement',
    
    // Settings
    'settings.profile': 'Profil',
    'settings.notifications': 'Notifications',
    'settings.security': 'Sécurité',
    'settings.language': 'Langue',
    'settings.timezone': 'Fuseau horaire',
    
    // Notifications
    'notification.new': 'Nouvelle notification',
    'notification.markRead': 'Marquer comme lu',
    'notification.markAllRead': 'Marquer tout comme lu',
  },
  de: {
    // Common
    'common.save': 'Speichern',
    'common.cancel': 'Abbrechen',
    'common.delete': 'Löschen',
    'common.edit': 'Bearbeiten',
    'common.create': 'Erstellen',
    'common.loading': 'Lädt...',
    'common.error': 'Fehler',
    'common.success': 'Erfolg',
    
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.events': 'Veranstaltungen',
    'nav.participants': 'Teilnehmer',
    'nav.analytics': 'Analysen',
    'nav.settings': 'Einstellungen',
    
    // Events
    'event.title': 'Veranstaltungstitel',
    'event.description': 'Beschreibung',
    'event.date': 'Datum',
    'event.time': 'Zeit',
    'event.location': 'Ort',
    'event.category': 'Kategorie',
    'event.create': 'Veranstaltung erstellen',
    'event.edit': 'Veranstaltung bearbeiten',
    'event.delete': 'Veranstaltung löschen',
    
    // Settings
    'settings.profile': 'Profil',
    'settings.notifications': 'Benachrichtigungen',
    'settings.security': 'Sicherheit',
    'settings.language': 'Sprache',
    'settings.timezone': 'Zeitzone',
    
    // Notifications
    'notification.new': 'Neue Benachrichtigung',
    'notification.markRead': 'Als gelesen markieren',
    'notification.markAllRead': 'Alle als gelesen markieren',
  },
  zh: {
    // Common
    'common.save': '保存',
    'common.cancel': '取消',
    'common.delete': '删除',
    'common.edit': '编辑',
    'common.create': '创建',
    'common.loading': '加载中...',
    'common.error': '错误',
    'common.success': '成功',
    
    // Navigation
    'nav.dashboard': '仪表板',
    'nav.events': '活动',
    'nav.participants': '参与者',
    'nav.analytics': '分析',
    'nav.settings': '设置',
    
    // Events
    'event.title': '活动标题',
    'event.description': '描述',
    'event.date': '日期',
    'event.time': '时间',
    'event.location': '地点',
    'event.category': '类别',
    'event.create': '创建活动',
    'event.edit': '编辑活动',
    'event.delete': '删除活动',
    
    // Settings
    'settings.profile': '个人资料',
    'settings.notifications': '通知',
    'settings.security': '安全',
    'settings.language': '语言',
    'settings.timezone': '时区',
    
    // Notifications
    'notification.new': '新通知',
    'notification.markRead': '标记为已读',
    'notification.markAllRead': '全部标记为已读',
  },
  ja: {
    // Common
    'common.save': '保存',
    'common.cancel': 'キャンセル',
    'common.delete': '削除',
    'common.edit': '編集',
    'common.create': '作成',
    'common.loading': '読み込み中...',
    'common.error': 'エラー',
    'common.success': '成功',
    
    // Navigation
    'nav.dashboard': 'ダッシュボード',
    'nav.events': 'イベント',
    'nav.participants': '参加者',
    'nav.analytics': '分析',
    'nav.settings': '設定',
    
    // Events
    'event.title': 'イベントタイトル',
    'event.description': '説明',
    'event.date': '日付',
    'event.time': '時間',
    'event.location': '場所',
    'event.category': 'カテゴリ',
    'event.create': 'イベントを作成',
    'event.edit': 'イベントを編集',
    'event.delete': 'イベントを削除',
    
    // Settings
    'settings.profile': 'プロフィール',
    'settings.notifications': '通知',
    'settings.security': 'セキュリティ',
    'settings.language': '言語',
    'settings.timezone': 'タイムゾーン',
    
    // Notifications
    'notification.new': '新しい通知',
    'notification.markRead': '既読にする',
    'notification.markAllRead': 'すべて既読にする',
  },
  ko: {
    // Common
    'common.save': '저장',
    'common.cancel': '취소',
    'common.delete': '삭제',
    'common.edit': '편집',
    'common.create': '생성',
    'common.loading': '로딩 중...',
    'common.error': '오류',
    'common.success': '성공',
    
    // Navigation
    'nav.dashboard': '대시보드',
    'nav.events': '이벤트',
    'nav.participants': '참가자',
    'nav.analytics': '분석',
    'nav.settings': '설정',
    
    // Events
    'event.title': '이벤트 제목',
    'event.description': '설명',
    'event.date': '날짜',
    'event.time': '시간',
    'event.location': '위치',
    'event.category': '카테고리',
    'event.create': '이벤트 생성',
    'event.edit': '이벤트 편집',
    'event.delete': '이벤트 삭제',
    
    // Settings
    'settings.profile': '프로필',
    'settings.notifications': '알림',
    'settings.security': '보안',
    'settings.language': '언어',
    'settings.timezone': '시간대',
    
    // Notifications
    'notification.new': '새 알림',
    'notification.markRead': '읽음으로 표시',
    'notification.markAllRead': '모두 읽음으로 표시',
  },
  ar: {
    // Common
    'common.save': 'حفظ',
    'common.cancel': 'إلغاء',
    'common.delete': 'حذف',
    'common.edit': 'تعديل',
    'common.create': 'إنشاء',
    'common.loading': 'جاري التحميل...',
    'common.error': 'خطأ',
    'common.success': 'نجاح',
    
    // Navigation
    'nav.dashboard': 'لوحة التحكم',
    'nav.events': 'الأحداث',
    'nav.participants': 'المشاركون',
    'nav.analytics': 'التحليلات',
    'nav.settings': 'الإعدادات',
    
    // Events
    'event.title': 'عنوان الحدث',
    'event.description': 'الوصف',
    'event.date': 'التاريخ',
    'event.time': 'الوقت',
    'event.location': 'الموقع',
    'event.category': 'الفئة',
    'event.create': 'إنشاء حدث',
    'event.edit': 'تعديل الحدث',
    'event.delete': 'حذف الحدث',
    
    // Settings
    'settings.profile': 'الملف الشخصي',
    'settings.notifications': 'الإشعارات',
    'settings.security': 'الأمان',
    'settings.language': 'اللغة',
    'settings.timezone': 'المنطقة الزمنية',
    
    // Notifications
    'notification.new': 'إشعار جديد',
    'notification.markRead': 'تمييز كمقروء',
    'notification.markAllRead': 'تمييز الكل كمقروء',
  }
};

/**
 * Get user's language from user metadata or default to English
 * @param {Object} user - User object from Supabase
 * @returns {string} Language code (e.g., 'en', 'es', 'fr')
 */
export const getUserLanguage = (user) => {
  if (!user) return 'en';
  const lang = user.user_metadata?.language || 'English';
  
  // Map language names to codes
  const langMap = {
    'English': 'en',
    'Spanish': 'es',
    'French': 'fr',
    'German': 'de',
    'Chinese': 'zh',
    'Japanese': 'ja',
    'Korean': 'ko',
    'Arabic': 'ar'
  };
  
  return langMap[lang] || 'en';
};

/**
 * Get translation for a key
 * @param {string} key - Translation key (e.g., 'common.save')
 * @param {Object} user - User object
 * @param {Object} params - Parameters to replace in translation
 * @returns {string} Translated string
 */
export const t = (key, user = null, params = {}) => {
  const lang = getUserLanguage(user);
  const translation = translations[lang]?.[key] || translations['en'][key] || key;
  
  // Replace parameters in translation
  let result = translation;
  Object.keys(params).forEach(param => {
    result = result.replace(`{${param}}`, params[param]);
  });
  
  return result;
};

/**
 * Format number according to user's language
 * @param {number} number - Number to format
 * @param {Object} user - User object
 * @param {Object} options - Intl.NumberFormat options
 * @returns {string} Formatted number string
 */
export const formatNumber = (number, user, options = {}) => {
  const lang = getUserLanguage(user);
  const locale = lang === 'zh' ? 'zh-CN' : 
                 lang === 'ja' ? 'ja-JP' : 
                 lang === 'ko' ? 'ko-KR' : 
                 lang === 'ar' ? 'ar-SA' :
                 lang === 'es' ? 'es-ES' :
                 lang === 'fr' ? 'fr-FR' :
                 lang === 'de' ? 'de-DE' : 'en-US';
  
  return new Intl.NumberFormat(locale, options).format(number);
};

/**
 * Format date according to user's language
 * @param {Date|string} date - Date to format
 * @param {Object} user - User object
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export const formatDate = (date, user, options = {}) => {
  const lang = getUserLanguage(user);
  const locale = lang === 'zh' ? 'zh-CN' : 
                 lang === 'ja' ? 'ja-JP' : 
                 lang === 'ko' ? 'ko-KR' : 
                 lang === 'ar' ? 'ar-SA' :
                 lang === 'es' ? 'es-ES' :
                 lang === 'fr' ? 'fr-FR' :
                 lang === 'de' ? 'de-DE' : 'en-US';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options
  };
  
  return new Intl.DateTimeFormat(locale, defaultOptions).format(dateObj);
};

