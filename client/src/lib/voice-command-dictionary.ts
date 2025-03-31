/**
 * Comprehensive multi-language voice command dictionary for MeetMate
 * 
 * This dictionary contains translations for common voice commands across
 * all supported languages in the application.
 */

export type VoiceCommandCategory = 
  | 'navigation' 
  | 'meetings'
  | 'tasks'
  | 'accessibility'
  | 'controls'
  | 'calendar';

export interface CommandTranslations {
  [key: string]: {
    [language: string]: string[];
  }
}

/**
 * Language codes map to lookup the 2-letter code from full locale
 */
export const languageCodeMap: Record<string, string> = {
  'en-US': 'en',
  'es-ES': 'es',
  'fr-FR': 'fr',
  'de-DE': 'de',
  'it-IT': 'it',
  'pt-BR': 'pt',
  'zh-CN': 'zh',
  'ja-JP': 'ja',
  'ko-KR': 'ko',
  'ru-RU': 'ru'
};

/**
 * Full names of supported languages with their locale code
 */
export const SUPPORTED_LANGUAGES = {
  'en-US': 'English (US)',
  'es-ES': 'Spanish',
  'fr-FR': 'French',
  'de-DE': 'German',
  'it-IT': 'Italian',
  'pt-BR': 'Portuguese (Brazil)',
  'zh-CN': 'Chinese (Simplified)',
  'ja-JP': 'Japanese',
  'ko-KR': 'Korean',
  'ru-RU': 'Russian'
} as const;

/**
 * Navigation commands in all supported languages
 */
export const navigationCommands: CommandTranslations = {
  'dashboard': {
    'en': ['dashboard', 'home', 'main screen'],
    'es': ['panel', 'inicio', 'pantalla principal'],
    'fr': ['tableau de bord', 'accueil', 'écran principal'],
    'de': ['dashboard', 'startseite', 'hauptbildschirm'],
    'it': ['dashboard', 'home', 'schermata principale'],
    'pt': ['painel', 'início', 'tela principal'],
    'zh': ['仪表板', '主页', '主屏幕'],
    'ja': ['ダッシュボード', 'ホーム', 'メイン画面'],
    'ko': ['대시보드', '홈', '메인 화면'],
    'ru': ['панель', 'домой', 'главный экран']
  },
  'meetings': {
    'en': ['meetings', 'show meetings', 'view meetings'],
    'es': ['reuniones', 'mostrar reuniones', 'ver reuniones'],
    'fr': ['réunions', 'afficher réunions', 'voir réunions'],
    'de': ['meetings', 'besprechungen anzeigen', 'meetings zeigen'],
    'it': ['riunioni', 'mostra riunioni', 'visualizza riunioni'],
    'pt': ['reuniões', 'mostrar reuniões', 'ver reuniões'],
    'zh': ['会议', '显示会议', '查看会议'],
    'ja': ['ミーティング', 'ミーティングを表示', '会議を見る'],
    'ko': ['회의', '회의 표시', '회의 보기'],
    'ru': ['встречи', 'показать встречи', 'просмотр встреч']
  },
  'tasks': {
    'en': ['tasks', 'show tasks', 'view tasks'],
    'es': ['tareas', 'mostrar tareas', 'ver tareas'],
    'fr': ['tâches', 'afficher tâches', 'voir tâches'],
    'de': ['aufgaben', 'aufgaben anzeigen', 'aufgaben zeigen'],
    'it': ['attività', 'mostra attività', 'visualizza attività'],
    'pt': ['tarefas', 'mostrar tarefas', 'ver tarefas'],
    'zh': ['任务', '显示任务', '查看任务'],
    'ja': ['タスク', 'タスクを表示', 'タスクを見る'],
    'ko': ['작업', '작업 표시', '작업 보기'],
    'ru': ['задачи', 'показать задачи', 'просмотр задач']
  },
  'calendar': {
    'en': ['calendar', 'show calendar', 'view calendar'],
    'es': ['calendario', 'mostrar calendario', 'ver calendario'],
    'fr': ['calendrier', 'afficher calendrier', 'voir calendrier'],
    'de': ['kalender', 'kalender anzeigen', 'kalender zeigen'],
    'it': ['calendario', 'mostra calendario', 'visualizza calendario'],
    'pt': ['calendário', 'mostrar calendário', 'ver calendário'],
    'zh': ['日历', '显示日历', '查看日历'],
    'ja': ['カレンダー', 'カレンダーを表示', 'カレンダーを見る'],
    'ko': ['캘린더', '캘린더 표시', '캘린더 보기'],
    'ru': ['календарь', 'показать календарь', 'просмотр календаря']
  },
  'settings': {
    'en': ['settings', 'preferences', 'configuration'],
    'es': ['ajustes', 'preferencias', 'configuración'],
    'fr': ['paramètres', 'préférences', 'configuration'],
    'de': ['einstellungen', 'präferenzen', 'konfiguration'],
    'it': ['impostazioni', 'preferenze', 'configurazione'],
    'pt': ['configurações', 'preferências', 'configuração'],
    'zh': ['设置', '首选项', '配置'],
    'ja': ['設定', '環境設定', '構成'],
    'ko': ['설정', '환경설정', '구성'],
    'ru': ['настройки', 'предпочтения', 'конфигурация']
  }
};

/**
 * Meeting management commands in all supported languages
 */
export const meetingCommands: CommandTranslations = {
  'create': {
    'en': ['create meeting', 'new meeting', 'schedule meeting'],
    'es': ['crear reunión', 'nueva reunión', 'programar reunión'],
    'fr': ['créer réunion', 'nouvelle réunion', 'planifier réunion'],
    'de': ['meeting erstellen', 'neues meeting', 'meeting planen'],
    'it': ['creare riunione', 'nuova riunione', 'programmare riunione'],
    'pt': ['criar reunião', 'nova reunião', 'agendar reunião'],
    'zh': ['创建会议', '新会议', '安排会议'],
    'ja': ['ミーティングを作成', '新しいミーティング', 'ミーティングを予定'],
    'ko': ['회의 만들기', '새 회의', '회의 예약'],
    'ru': ['создать встречу', 'новая встреча', 'запланировать встречу']
  },
  'join': {
    'en': ['join meeting', 'enter meeting', 'attend meeting'],
    'es': ['unirse a reunión', 'entrar en reunión', 'asistir a reunión'],
    'fr': ['rejoindre réunion', 'entrer dans réunion', 'assister à réunion'],
    'de': ['meeting beitreten', 'an meeting teilnehmen', 'meeting besuchen'],
    'it': ['partecipare a riunione', 'entrare in riunione', 'assistere a riunione'],
    'pt': ['entrar na reunião', 'participar da reunião', 'assistir reunião'],
    'zh': ['加入会议', '进入会议', '参加会议'],
    'ja': ['ミーティングに参加', 'ミーティングに入る', 'ミーティングに出席'],
    'ko': ['회의 참가', '회의 입장', '회의 참석'],
    'ru': ['присоединиться к встрече', 'войти во встречу', 'посетить встречу']
  },
  'cancel': {
    'en': ['cancel meeting', 'delete meeting', 'remove meeting'],
    'es': ['cancelar reunión', 'eliminar reunión', 'quitar reunión'],
    'fr': ['annuler réunion', 'supprimer réunion', 'enlever réunion'],
    'de': ['meeting absagen', 'meeting löschen', 'meeting entfernen'],
    'it': ['annullare riunione', 'eliminare riunione', 'rimuovere riunione'],
    'pt': ['cancelar reunião', 'deletar reunião', 'remover reunião'],
    'zh': ['取消会议', '删除会议', '移除会议'],
    'ja': ['ミーティングをキャンセル', 'ミーティングを削除', 'ミーティングを削除'],
    'ko': ['회의 취소', '회의 삭제', '회의 제거'],
    'ru': ['отменить встречу', 'удалить встречу', 'удалить встречу']
  },
  'reschedule': {
    'en': ['reschedule meeting', 'move meeting', 'change meeting time'],
    'es': ['reprogramar reunión', 'mover reunión', 'cambiar hora de reunión'],
    'fr': ['reprogrammer réunion', 'déplacer réunion', 'changer heure de réunion'],
    'de': ['meeting neu planen', 'meeting verschieben', 'meeting-zeit ändern'],
    'it': ['riprogrammare riunione', 'spostare riunione', 'cambiare orario riunione'],
    'pt': ['remarcar reunião', 'mover reunião', 'alterar horário da reunião'],
    'zh': ['重新安排会议', '移动会议', '更改会议时间'],
    'ja': ['ミーティングを再スケジュール', 'ミーティングを移動', 'ミーティング時間を変更'],
    'ko': ['회의 일정 변경', '회의 이동', '회의 시간 변경'],
    'ru': ['перенести встречу', 'переместить встречу', 'изменить время встречи']
  }
};

/**
 * Voice assistant control commands in all supported languages
 */
export const controlCommands: CommandTranslations = {
  'start': {
    'en': ['start recording', 'start listening', 'begin recording'],
    'es': ['iniciar grabación', 'comenzar a escuchar', 'comenzar grabación'],
    'fr': ['commencer enregistrement', 'commencer à écouter', 'débuter enregistrement'],
    'de': ['aufnahme starten', 'zuhören beginnen', 'aufzeichnung beginnen'],
    'it': ['avviare registrazione', 'iniziare ad ascoltare', 'iniziare registrazione'],
    'pt': ['iniciar gravação', 'começar a escutar', 'começar gravação'],
    'zh': ['开始录制', '开始聆听', '开始记录'],
    'ja': ['録音開始', 'リスニング開始', '記録開始'],
    'ko': ['녹음 시작', '듣기 시작', '기록 시작'],
    'ru': ['начать запись', 'начать слушать', 'начать запись']
  },
  'stop': {
    'en': ['stop recording', 'stop listening', 'end recording'],
    'es': ['detener grabación', 'dejar de escuchar', 'finalizar grabación'],
    'fr': ['arrêter enregistrement', 'arrêter d\'écouter', 'terminer enregistrement'],
    'de': ['aufnahme stoppen', 'zuhören beenden', 'aufzeichnung beenden'],
    'it': ['interrompere registrazione', 'smettere di ascoltare', 'terminare registrazione'],
    'pt': ['parar gravação', 'parar de escutar', 'encerrar gravação'],
    'zh': ['停止录制', '停止聆听', '结束记录'],
    'ja': ['録音停止', 'リスニング停止', '記録終了'],
    'ko': ['녹음 중지', '듣기 중지', '기록 종료'],
    'ru': ['остановить запись', 'перестать слушать', 'завершить запись']
  },
  'help': {
    'en': ['help', 'show help', 'assistance'],
    'es': ['ayuda', 'mostrar ayuda', 'asistencia'],
    'fr': ['aide', 'afficher aide', 'assistance'],
    'de': ['hilfe', 'hilfe anzeigen', 'unterstützung'],
    'it': ['aiuto', 'mostrare aiuto', 'assistenza'],
    'pt': ['ajuda', 'mostrar ajuda', 'assistência'],
    'zh': ['帮助', '显示帮助', '援助'],
    'ja': ['ヘルプ', 'ヘルプを表示', 'アシスタンス'],
    'ko': ['도움말', '도움말 표시', '지원'],
    'ru': ['помощь', 'показать помощь', 'поддержка']
  }
};

/**
 * Accessibility commands in all supported languages
 */
export const accessibilityCommands: CommandTranslations = {
  'increase_font': {
    'en': ['increase font size', 'larger text', 'bigger font'],
    'es': ['aumentar tamaño de fuente', 'texto más grande', 'letra más grande'],
    'fr': ['augmenter taille de police', 'texte plus grand', 'police plus grande'],
    'de': ['schriftgröße erhöhen', 'größerer text', 'größere schrift'],
    'it': ['aumentare dimensione carattere', 'testo più grande', 'carattere più grande'],
    'pt': ['aumentar tamanho da fonte', 'texto maior', 'fonte maior'],
    'zh': ['增加字体大小', '更大文本', '更大字体'],
    'ja': ['フォントサイズを大きく', 'テキストを大きく', 'フォントを大きく'],
    'ko': ['글꼴 크기 증가', '더 큰 텍스트', '더 큰 글꼴'],
    'ru': ['увеличить размер шрифта', 'больший текст', 'больший шрифт']
  },
  'decrease_font': {
    'en': ['decrease font size', 'smaller text', 'smaller font'],
    'es': ['disminuir tamaño de fuente', 'texto más pequeño', 'letra más pequeña'],
    'fr': ['diminuer taille de police', 'texte plus petit', 'police plus petite'],
    'de': ['schriftgröße verringern', 'kleinerer text', 'kleinere schrift'],
    'it': ['diminuire dimensione carattere', 'testo più piccolo', 'carattere più piccolo'],
    'pt': ['diminuir tamanho da fonte', 'texto menor', 'fonte menor'],
    'zh': ['减小字体大小', '更小文本', '更小字体'],
    'ja': ['フォントサイズを小さく', 'テキストを小さく', 'フォントを小さく'],
    'ko': ['글꼴 크기 감소', '더 작은 텍스트', '더 작은 글꼴'],
    'ru': ['уменьшить размер шрифта', 'меньший текст', 'меньший шрифт']
  },
  'high_contrast': {
    'en': ['high contrast', 'increase contrast', 'better visibility'],
    'es': ['alto contraste', 'aumentar contraste', 'mejor visibilidad'],
    'fr': ['contraste élevé', 'augmenter contraste', 'meilleure visibilité'],
    'de': ['hoher kontrast', 'kontrast erhöhen', 'bessere sichtbarkeit'],
    'it': ['alto contrasto', 'aumentare contrasto', 'migliore visibilità'],
    'pt': ['alto contraste', 'aumentar contraste', 'melhor visibilidade'],
    'zh': ['高对比度', '增加对比度', '更好可见度'],
    'ja': ['ハイコントラスト', 'コントラストを上げる', '可視性を向上'],
    'ko': ['고대비', '대비 증가', '가시성 향상'],
    'ru': ['высокий контраст', 'увеличить контраст', 'лучшая видимость']
  },
  'screen_reader': {
    'en': ['screen reader', 'read aloud', 'text to speech'],
    'es': ['lector de pantalla', 'leer en voz alta', 'texto a voz'],
    'fr': ['lecteur d\'écran', 'lire à haute voix', 'texte à parole'],
    'de': ['bildschirmleser', 'laut vorlesen', 'text zu sprache'],
    'it': ['lettore schermo', 'leggere ad alta voce', 'testo a voce'],
    'pt': ['leitor de tela', 'ler em voz alta', 'texto para fala'],
    'zh': ['屏幕阅读器', '大声朗读', '文字转语音'],
    'ja': ['スクリーンリーダー', '音読', 'テキスト読み上げ'],
    'ko': ['화면 리더', '소리내어 읽기', '텍스트 음성 변환'],
    'ru': ['экранный диктор', 'читать вслух', 'текст в речь']
  }
};

/**
 * Retrieves command translations for a specific language
 * @param language The language code (e.g., 'en-US')
 * @returns A dictionary of commands in the specified language
 */
export function getCommandsForLanguage(language: string): Record<string, string[]> {
  const langCode = languageCodeMap[language] || 'en';
  const commands: Record<string, string[]> = {};
  
  // Combine all commands into a single dictionary
  const allCommandCategories = [
    navigationCommands,
    meetingCommands,
    controlCommands,
    accessibilityCommands
  ];
  
  for (const category of allCommandCategories) {
    for (const [key, translations] of Object.entries(category)) {
      if (translations[langCode]) {
        commands[key] = translations[langCode];
      }
    }
  }
  
  return commands;
}