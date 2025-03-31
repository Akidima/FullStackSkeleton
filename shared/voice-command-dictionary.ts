/**
 * Comprehensive multi-language voice command dictionary for MeetMate
 * 
 * This dictionary contains translations for common voice commands across
 * all supported languages in the application.
 */

/**
 * Supported voice command categories
 */
export type VoiceCommandCategory = 
  | 'navigation' 
  | 'meetings'
  | 'tasks'
  | 'accessibility'
  | 'controls'
  | 'calendar';

/**
 * Type definition for command translations across languages
 */
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
  'go_to_dashboard': {
    'en-US': ['go to dashboard', 'show dashboard', 'open dashboard', 'dashboard page'],
    'es-ES': ['ir al tablero', 'mostrar tablero', 'abrir tablero', 'página de tablero'],
    'fr-FR': ['aller au tableau de bord', 'afficher le tableau de bord', 'ouvrir le tableau de bord', 'page du tableau de bord'],
    'de-DE': ['zum Dashboard gehen', 'Dashboard anzeigen', 'Dashboard öffnen', 'Dashboard-Seite'],
    'it-IT': ['vai alla dashboard', 'mostra dashboard', 'apri dashboard', 'pagina dashboard'],
    'pt-BR': ['ir para o painel', 'mostrar painel', 'abrir painel', 'página do painel'],
    'zh-CN': ['去仪表板', '显示仪表板', '打开仪表板', '仪表板页面'],
    'ja-JP': ['ダッシュボードに移動', 'ダッシュボードを表示', 'ダッシュボードを開く', 'ダッシュボードページ'],
    'ko-KR': ['대시보드로 이동', '대시보드 표시', '대시보드 열기', '대시보드 페이지'],
    'ru-RU': ['перейти на панель управления', 'показать панель управления', 'открыть панель управления', 'страница панели управления']
  },
  'go_to_meetings': {
    'en-US': ['go to meetings', 'show meetings', 'open meetings', 'meetings page'],
    'es-ES': ['ir a reuniones', 'mostrar reuniones', 'abrir reuniones', 'página de reuniones'],
    'fr-FR': ['aller aux réunions', 'afficher les réunions', 'ouvrir les réunions', 'page des réunions'],
    'de-DE': ['zu Besprechungen gehen', 'Besprechungen anzeigen', 'Besprechungen öffnen', 'Besprechungsseite'],
    'it-IT': ['vai alle riunioni', 'mostra riunioni', 'apri riunioni', 'pagina riunioni'],
    'pt-BR': ['ir para reuniões', 'mostrar reuniões', 'abrir reuniões', 'página de reuniões'],
    'zh-CN': ['去会议', '显示会议', '打开会议', '会议页面'],
    'ja-JP': ['会議に移動', '会議を表示', '会議を開く', '会議ページ'],
    'ko-KR': ['회의로 이동', '회의 표시', '회의 열기', '회의 페이지'],
    'ru-RU': ['перейти к встречам', 'показать встречи', 'открыть встречи', 'страница встреч']
  },
  'go_to_calendar': {
    'en-US': ['go to calendar', 'show calendar', 'open calendar', 'calendar page'],
    'es-ES': ['ir al calendario', 'mostrar calendario', 'abrir calendario', 'página de calendario'],
    'fr-FR': ['aller au calendrier', 'afficher le calendrier', 'ouvrir le calendrier', 'page du calendrier'],
    'de-DE': ['zum Kalender gehen', 'Kalender anzeigen', 'Kalender öffnen', 'Kalenderseite'],
    'it-IT': ['vai al calendario', 'mostra calendario', 'apri calendario', 'pagina calendario'],
    'pt-BR': ['ir para o calendário', 'mostrar calendário', 'abrir calendário', 'página do calendário'],
    'zh-CN': ['去日历', '显示日历', '打开日历', '日历页面'],
    'ja-JP': ['カレンダーに移動', 'カレンダーを表示', 'カレンダーを開く', 'カレンダーページ'],
    'ko-KR': ['캘린더로 이동', '캘린더 표시', '캘린더 열기', '캘린더 페이지'],
    'ru-RU': ['перейти к календарю', 'показать календарь', 'открыть календарь', 'страница календаря']
  },
  'go_to_settings': {
    'en-US': ['go to settings', 'show settings', 'open settings', 'settings page'],
    'es-ES': ['ir a la configuración', 'mostrar configuración', 'abrir configuración', 'página de configuración'],
    'fr-FR': ['aller aux paramètres', 'afficher les paramètres', 'ouvrir les paramètres', 'page des paramètres'],
    'de-DE': ['zu Einstellungen gehen', 'Einstellungen anzeigen', 'Einstellungen öffnen', 'Einstellungsseite'],
    'it-IT': ['vai alle impostazioni', 'mostra impostazioni', 'apri impostazioni', 'pagina impostazioni'],
    'pt-BR': ['ir para configurações', 'mostrar configurações', 'abrir configurações', 'página de configurações'],
    'zh-CN': ['去设置', '显示设置', '打开设置', '设置页面'],
    'ja-JP': ['設定に移動', '設定を表示', '設定を開く', '設定ページ'],
    'ko-KR': ['설정으로 이동', '설정 표시', '설정 열기', '설정 페이지'],
    'ru-RU': ['перейти к настройкам', 'показать настройки', 'открыть настройки', 'страница настроек']
  },
  'go_to_profile': {
    'en-US': ['go to profile', 'show profile', 'open profile', 'profile page'],
    'es-ES': ['ir al perfil', 'mostrar perfil', 'abrir perfil', 'página de perfil'],
    'fr-FR': ['aller au profil', 'afficher le profil', 'ouvrir le profil', 'page du profil'],
    'de-DE': ['zum Profil gehen', 'Profil anzeigen', 'Profil öffnen', 'Profilseite'],
    'it-IT': ['vai al profilo', 'mostra profilo', 'apri profilo', 'pagina profilo'],
    'pt-BR': ['ir para o perfil', 'mostrar perfil', 'abrir perfil', 'página do perfil'],
    'zh-CN': ['去个人资料', '显示个人资料', '打开个人资料', '个人资料页面'],
    'ja-JP': ['プロフィールに移動', 'プロフィールを表示', 'プロフィールを開く', 'プロフィールページ'],
    'ko-KR': ['프로필로 이동', '프로필 표시', '프로필 열기', '프로필 페이지'],
    'ru-RU': ['перейти в профиль', 'показать профиль', 'открыть профиль', 'страница профиля']
  },
  'go_back': {
    'en-US': ['go back', 'previous page', 'return', 'back'],
    'es-ES': ['volver', 'página anterior', 'regresar', 'atrás'],
    'fr-FR': ['retourner', 'page précédente', 'revenir', 'retour'],
    'de-DE': ['zurück gehen', 'vorherige Seite', 'zurückkehren', 'zurück'],
    'it-IT': ['torna indietro', 'pagina precedente', 'ritorna', 'indietro'],
    'pt-BR': ['voltar', 'página anterior', 'retornar', 'voltar atrás'],
    'zh-CN': ['返回', '上一页', '回去', '后退'],
    'ja-JP': ['戻る', '前のページ', '戻る', 'バック'],
    'ko-KR': ['뒤로 가기', '이전 페이지', '돌아가기', '뒤로'],
    'ru-RU': ['вернуться', 'предыдущая страница', 'назад', 'обратно']
  },
  'refresh': {
    'en-US': ['refresh page', 'reload', 'update page', 'refresh'],
    'es-ES': ['actualizar página', 'recargar', 'actualizar', 'refrescar'],
    'fr-FR': ['rafraîchir la page', 'recharger', 'mettre à jour la page', 'rafraîchir'],
    'de-DE': ['Seite aktualisieren', 'neu laden', 'Seite neu laden', 'aktualisieren'],
    'it-IT': ['aggiorna pagina', 'ricarica', 'aggiorna', 'ricaricare'],
    'pt-BR': ['atualizar página', 'recarregar', 'atualizar', 'recarregar página'],
    'zh-CN': ['刷新页面', '重新加载', '更新页面', '刷新'],
    'ja-JP': ['ページを更新', '再読み込み', 'ページを再読み込み', '更新'],
    'ko-KR': ['페이지 새로 고침', '다시 로드', '페이지 업데이트', '새로 고침'],
    'ru-RU': ['обновить страницу', 'перезагрузить', 'обновить', 'перезагрузка']
  }
};

/**
 * Meeting management commands in all supported languages
 */
export const meetingCommands: CommandTranslations = {
  'create_meeting': {
    'en-US': ['create meeting', 'new meeting', 'schedule meeting', 'add meeting'],
    'es-ES': ['crear reunión', 'nueva reunión', 'programar reunión', 'añadir reunión'],
    'fr-FR': ['créer une réunion', 'nouvelle réunion', 'planifier une réunion', 'ajouter une réunion'],
    'de-DE': ['Besprechung erstellen', 'neue Besprechung', 'Besprechung planen', 'Besprechung hinzufügen'],
    'it-IT': ['crea riunione', 'nuova riunione', 'programma riunione', 'aggiungi riunione'],
    'pt-BR': ['criar reunião', 'nova reunião', 'agendar reunião', 'adicionar reunião'],
    'zh-CN': ['创建会议', '新会议', '安排会议', '添加会议'],
    'ja-JP': ['会議を作成', '新しい会議', '会議をスケジュール', '会議を追加'],
    'ko-KR': ['회의 만들기', '새 회의', '회의 예약', '회의 추가'],
    'ru-RU': ['создать встречу', 'новая встреча', 'запланировать встречу', 'добавить встречу']
  },
  'view_meeting': {
    'en-US': ['view meeting', 'show meeting', 'meeting details', 'open meeting'],
    'es-ES': ['ver reunión', 'mostrar reunión', 'detalles de la reunión', 'abrir reunión'],
    'fr-FR': ['voir la réunion', 'afficher la réunion', 'détails de la réunion', 'ouvrir la réunion'],
    'de-DE': ['Besprechung anzeigen', 'Besprechung zeigen', 'Besprechungsdetails', 'Besprechung öffnen'],
    'it-IT': ['visualizza riunione', 'mostra riunione', 'dettagli riunione', 'apri riunione'],
    'pt-BR': ['ver reunião', 'mostrar reunião', 'detalhes da reunião', 'abrir reunião'],
    'zh-CN': ['查看会议', '显示会议', '会议详情', '打开会议'],
    'ja-JP': ['会議を表示', '会議を見る', '会議の詳細', '会議を開く'],
    'ko-KR': ['회의 보기', '회의 표시', '회의 세부 정보', '회의 열기'],
    'ru-RU': ['просмотр встречи', 'показать встречу', 'детали встречи', 'открыть встречу']
  },
  'edit_meeting': {
    'en-US': ['edit meeting', 'update meeting', 'modify meeting', 'change meeting'],
    'es-ES': ['editar reunión', 'actualizar reunión', 'modificar reunión', 'cambiar reunión'],
    'fr-FR': ['modifier la réunion', 'mettre à jour la réunion', 'changer la réunion', 'éditer la réunion'],
    'de-DE': ['Besprechung bearbeiten', 'Besprechung aktualisieren', 'Besprechung ändern', 'Besprechung modifizieren'],
    'it-IT': ['modifica riunione', 'aggiorna riunione', 'cambia riunione', 'modifica dettagli riunione'],
    'pt-BR': ['editar reunião', 'atualizar reunião', 'modificar reunião', 'alterar reunião'],
    'zh-CN': ['编辑会议', '更新会议', '修改会议', '更改会议'],
    'ja-JP': ['会議を編集', '会議を更新', '会議を修正', '会議を変更'],
    'ko-KR': ['회의 편집', '회의 업데이트', '회의 수정', '회의 변경'],
    'ru-RU': ['редактировать встречу', 'обновить встречу', 'изменить встречу', 'модифицировать встречу']
  },
  'delete_meeting': {
    'en-US': ['delete meeting', 'remove meeting', 'cancel meeting', 'trash meeting'],
    'es-ES': ['eliminar reunión', 'borrar reunión', 'cancelar reunión', 'quitar reunión'],
    'fr-FR': ['supprimer la réunion', 'effacer la réunion', 'annuler la réunion', 'enlever la réunion'],
    'de-DE': ['Besprechung löschen', 'Besprechung entfernen', 'Besprechung abbrechen', 'Besprechung streichen'],
    'it-IT': ['elimina riunione', 'rimuovi riunione', 'cancella riunione', 'cestina riunione'],
    'pt-BR': ['excluir reunião', 'remover reunião', 'cancelar reunião', 'apagar reunião'],
    'zh-CN': ['删除会议', '移除会议', '取消会议', '丢弃会议'],
    'ja-JP': ['会議を削除', '会議を消去', '会議をキャンセル', '会議を取り消し'],
    'ko-KR': ['회의 삭제', '회의 제거', '회의 취소', '회의 버리기'],
    'ru-RU': ['удалить встречу', 'стереть встречу', 'отменить встречу', 'убрать встречу']
  },
  'complete_meeting': {
    'en-US': ['complete meeting', 'finish meeting', 'end meeting', 'mark meeting as done'],
    'es-ES': ['completar reunión', 'finalizar reunión', 'terminar reunión', 'marcar reunión como hecha'],
    'fr-FR': ['terminer la réunion', 'achever la réunion', 'finir la réunion', 'marquer la réunion comme terminée'],
    'de-DE': ['Besprechung abschließen', 'Besprechung beenden', 'Besprechung fertigstellen', 'Besprechung als erledigt markieren'],
    'it-IT': ['completa riunione', 'finisci riunione', 'termina riunione', 'segna riunione come completata'],
    'pt-BR': ['concluir reunião', 'finalizar reunião', 'encerrar reunião', 'marcar reunião como concluída'],
    'zh-CN': ['完成会议', '结束会议', '终止会议', '标记会议为已完成'],
    'ja-JP': ['会議を完了', '会議を終了', '会議を終わらせる', '会議を完了としてマーク'],
    'ko-KR': ['회의 완료', '회의 끝내기', '회의 종료', '회의를 완료됨으로 표시'],
    'ru-RU': ['завершить встречу', 'закончить встречу', 'окончить встречу', 'отметить встречу как завершенную']
  },
  'summarize_meeting': {
    'en-US': ['summarize meeting', 'meeting summary', 'generate meeting summary', 'summarize notes'],
    'es-ES': ['resumir reunión', 'resumen de reunión', 'generar resumen de reunión', 'resumir notas'],
    'fr-FR': ['résumer la réunion', 'synthèse de la réunion', 'générer le résumé de la réunion', 'résumer les notes'],
    'de-DE': ['Besprechung zusammenfassen', 'Besprechungszusammenfassung', 'Besprechungszusammenfassung erstellen', 'Notizen zusammenfassen'],
    'it-IT': ['riassumi riunione', 'riepilogo riunione', 'genera riepilogo riunione', 'riassumi note'],
    'pt-BR': ['resumir reunião', 'resumo da reunião', 'gerar resumo da reunião', 'resumir notas'],
    'zh-CN': ['总结会议', '会议摘要', '生成会议摘要', '总结笔记'],
    'ja-JP': ['会議を要約', '会議の要約', '会議の要約を生成', 'ノートを要約'],
    'ko-KR': ['회의 요약', '회의 요약본', '회의 요약 생성', '노트 요약'],
    'ru-RU': ['резюмировать встречу', 'краткое изложение встречи', 'создать резюме встречи', 'резюмировать заметки']
  },
  'find_meeting': {
    'en-US': ['find meeting', 'search meeting', 'locate meeting', 'meeting search'],
    'es-ES': ['buscar reunión', 'encontrar reunión', 'localizar reunión', 'búsqueda de reunión'],
    'fr-FR': ['trouver une réunion', 'chercher une réunion', 'localiser une réunion', 'recherche de réunion'],
    'de-DE': ['Besprechung finden', 'Besprechung suchen', 'Besprechung lokalisieren', 'Besprechungssuche'],
    'it-IT': ['trova riunione', 'cerca riunione', 'individua riunione', 'ricerca riunione'],
    'pt-BR': ['encontrar reunião', 'buscar reunião', 'localizar reunião', 'pesquisa de reunião'],
    'zh-CN': ['查找会议', '搜索会议', '定位会议', '会议搜索'],
    'ja-JP': ['会議を見つける', '会議を検索', '会議を特定', '会議の検索'],
    'ko-KR': ['회의 찾기', '회의 검색', '회의 위치 찾기', '회의 검색'],
    'ru-RU': ['найти встречу', 'поиск встречи', 'обнаружить встречу', 'поиск по встречам']
  }
};

/**
 * Voice assistant control commands in all supported languages
 */
export const controlCommands: CommandTranslations = {
  'start_listening': {
    'en-US': ['start listening', 'begin recording', 'activate voice', 'start voice control'],
    'es-ES': ['comienza a escuchar', 'iniciar grabación', 'activar voz', 'iniciar control por voz'],
    'fr-FR': ['commencer à écouter', 'démarrer l\'enregistrement', 'activer la voix', 'démarrer le contrôle vocal'],
    'de-DE': ['beginne zu hören', 'Aufnahme starten', 'Stimme aktivieren', 'Sprachsteuerung starten'],
    'it-IT': ['inizia ascolto', 'inizia registrazione', 'attiva voce', 'inizia controllo vocale'],
    'pt-BR': ['começar a ouvir', 'iniciar gravação', 'ativar voz', 'iniciar controle por voz'],
    'zh-CN': ['开始聆听', '开始录制', '激活语音', '开始语音控制'],
    'ja-JP': ['聞き始める', '録音開始', '音声を有効化', '音声コントロール開始'],
    'ko-KR': ['듣기 시작', '녹음 시작', '음성 활성화', '음성 제어 시작'],
    'ru-RU': ['начать прослушивание', 'начать запись', 'активировать голос', 'запустить голосовое управление']
  },
  'stop_listening': {
    'en-US': ['stop listening', 'stop recording', 'deactivate voice', 'stop voice control'],
    'es-ES': ['deja de escuchar', 'detener grabación', 'desactivar voz', 'detener control por voz'],
    'fr-FR': ['arrêter d\'écouter', 'arrêter l\'enregistrement', 'désactiver la voix', 'arrêter le contrôle vocal'],
    'de-DE': ['höre auf zu hören', 'Aufnahme beenden', 'Stimme deaktivieren', 'Sprachsteuerung beenden'],
    'it-IT': ['smetti di ascoltare', 'interrompi registrazione', 'disattiva voce', 'ferma controllo vocale'],
    'pt-BR': ['parar de ouvir', 'parar gravação', 'desativar voz', 'parar controle por voz'],
    'zh-CN': ['停止聆听', '停止录制', '禁用语音', '停止语音控制'],
    'ja-JP': ['聞くのを止める', '録音停止', '音声を無効化', '音声コントロール停止'],
    'ko-KR': ['듣기 중지', '녹음 중지', '음성 비활성화', '음성 제어 중지'],
    'ru-RU': ['прекратить прослушивание', 'остановить запись', 'деактивировать голос', 'остановить голосовое управление']
  },
  'change_language': {
    'en-US': ['change language', 'switch language', 'set language', 'change voice language'],
    'es-ES': ['cambiar idioma', 'cambiar de idioma', 'establecer idioma', 'cambiar idioma de voz'],
    'fr-FR': ['changer de langue', 'modifier la langue', 'définir la langue', 'changer la langue vocale'],
    'de-DE': ['Sprache ändern', 'Sprache wechseln', 'Sprache einstellen', 'Sprachsprache ändern'],
    'it-IT': ['cambia lingua', 'modifica lingua', 'imposta lingua', 'cambia lingua vocale'],
    'pt-BR': ['mudar idioma', 'trocar idioma', 'definir idioma', 'mudar idioma de voz'],
    'zh-CN': ['更改语言', '切换语言', '设置语言', '更改语音语言'],
    'ja-JP': ['言語を変更', '言語を切り替え', '言語を設定', '音声言語を変更'],
    'ko-KR': ['언어 변경', '언어 전환', '언어 설정', '음성 언어 변경'],
    'ru-RU': ['изменить язык', 'переключить язык', 'установить язык', 'изменить язык голоса']
  },
  'help': {
    'en-US': ['help', 'voice commands', 'command help', 'available commands'],
    'es-ES': ['ayuda', 'comandos de voz', 'ayuda de comandos', 'comandos disponibles'],
    'fr-FR': ['aide', 'commandes vocales', 'aide des commandes', 'commandes disponibles'],
    'de-DE': ['Hilfe', 'Sprachbefehle', 'Befehlshilfe', 'verfügbare Befehle'],
    'it-IT': ['aiuto', 'comandi vocali', 'guida comandi', 'comandi disponibili'],
    'pt-BR': ['ajuda', 'comandos de voz', 'ajuda de comandos', 'comandos disponíveis'],
    'zh-CN': ['帮助', '语音命令', '命令帮助', '可用命令'],
    'ja-JP': ['ヘルプ', '音声コマンド', 'コマンドヘルプ', '利用可能なコマンド'],
    'ko-KR': ['도움말', '음성 명령', '명령 도움말', '사용 가능한 명령'],
    'ru-RU': ['помощь', 'голосовые команды', 'справка по командам', 'доступные команды']
  }
};

/**
 * Accessibility commands in all supported languages
 */
export const accessibilityCommands: CommandTranslations = {
  'increase_font': {
    'en-US': ['increase font', 'larger text', 'bigger font', 'zoom in'],
    'es-ES': ['aumentar fuente', 'texto más grande', 'fuente más grande', 'ampliar'],
    'fr-FR': ['augmenter la police', 'texte plus grand', 'police plus grande', 'zoomer'],
    'de-DE': ['Schrift vergrößern', 'größerer Text', 'größere Schrift', 'hineinzoomen'],
    'it-IT': ['aumenta carattere', 'testo più grande', 'carattere più grande', 'ingrandisci'],
    'pt-BR': ['aumentar fonte', 'texto maior', 'fonte maior', 'ampliar'],
    'zh-CN': ['增大字体', '更大的文本', '更大的字体', '放大'],
    'ja-JP': ['フォントを大きく', 'テキストを大きく', '文字を大きく', 'ズームイン'],
    'ko-KR': ['글꼴 키우기', '더 큰 텍스트', '더 큰 글꼴', '확대'],
    'ru-RU': ['увеличить шрифт', 'больший текст', 'больший шрифт', 'увеличить']
  },
  'decrease_font': {
    'en-US': ['decrease font', 'smaller text', 'smaller font', 'zoom out'],
    'es-ES': ['reducir fuente', 'texto más pequeño', 'fuente más pequeña', 'alejar'],
    'fr-FR': ['diminuer la police', 'texte plus petit', 'police plus petite', 'dézoomer'],
    'de-DE': ['Schrift verkleinern', 'kleinerer Text', 'kleinere Schrift', 'herauszoomen'],
    'it-IT': ['diminuisci carattere', 'testo più piccolo', 'carattere più piccolo', 'rimpicciolisci'],
    'pt-BR': ['diminuir fonte', 'texto menor', 'fonte menor', 'reduzir'],
    'zh-CN': ['减小字体', '更小的文本', '更小的字体', '缩小'],
    'ja-JP': ['フォントを小さく', 'テキストを小さく', '文字を小さく', 'ズームアウト'],
    'ko-KR': ['글꼴 줄이기', '더 작은 텍스트', '더 작은 글꼴', '축소'],
    'ru-RU': ['уменьшить шрифт', 'меньший текст', 'меньший шрифт', 'уменьшить']
  },
  'high_contrast': {
    'en-US': ['high contrast', 'increase contrast', 'better contrast', 'toggle contrast'],
    'es-ES': ['alto contraste', 'aumentar contraste', 'mejor contraste', 'alternar contraste'],
    'fr-FR': ['contraste élevé', 'augmenter le contraste', 'meilleur contraste', 'basculer le contraste'],
    'de-DE': ['hoher Kontrast', 'Kontrast erhöhen', 'besserer Kontrast', 'Kontrast umschalten'],
    'it-IT': ['alto contrasto', 'aumenta contrasto', 'migliore contrasto', 'attiva/disattiva contrasto'],
    'pt-BR': ['alto contraste', 'aumentar contraste', 'melhor contraste', 'alternar contraste'],
    'zh-CN': ['高对比度', '增加对比度', '更好的对比度', '切换对比度'],
    'ja-JP': ['ハイコントラスト', 'コントラストを上げる', 'より良いコントラスト', 'コントラスト切り替え'],
    'ko-KR': ['고대비', '대비 증가', '더 나은 대비', '대비 전환'],
    'ru-RU': ['высокий контраст', 'увеличить контраст', 'лучший контраст', 'переключить контраст']
  },
  'read_aloud': {
    'en-US': ['read aloud', 'read this page', 'start screen reader', 'text to speech'],
    'es-ES': ['leer en voz alta', 'leer esta página', 'iniciar lector de pantalla', 'texto a voz'],
    'fr-FR': ['lire à haute voix', 'lire cette page', 'démarrer le lecteur d\'écran', 'synthèse vocale'],
    'de-DE': ['laut vorlesen', 'diese Seite vorlesen', 'Screenreader starten', 'Text zu Sprache'],
    'it-IT': ['leggi ad alta voce', 'leggi questa pagina', 'avvia screen reader', 'sintesi vocale'],
    'pt-BR': ['ler em voz alta', 'ler esta página', 'iniciar leitor de tela', 'texto para fala'],
    'zh-CN': ['朗读', '朗读此页面', '启动屏幕阅读器', '文字转语音'],
    'ja-JP': ['音読', 'このページを読み上げる', 'スクリーンリーダーを開始', '音声読み上げ'],
    'ko-KR': ['소리내어 읽기', '이 페이지 읽기', '화면 낭독기 시작', '텍스트 음성 변환'],
    'ru-RU': ['читать вслух', 'прочитать эту страницу', 'запустить экранный диктор', 'преобразование текста в речь']
  },
  'dark_mode': {
    'en-US': ['dark mode', 'switch to dark', 'enable dark mode', 'night mode'],
    'es-ES': ['modo oscuro', 'cambiar a oscuro', 'habilitar modo oscuro', 'modo nocturno'],
    'fr-FR': ['mode sombre', 'passer au sombre', 'activer le mode sombre', 'mode nuit'],
    'de-DE': ['dunkelmodus', 'zu dunkel wechseln', 'dunkelmodus aktivieren', 'nachtmodus'],
    'it-IT': ['modalità scura', 'passa a scuro', 'attiva modalità scura', 'modalità notte'],
    'pt-BR': ['modo escuro', 'mudar para escuro', 'ativar modo escuro', 'modo noturno'],
    'zh-CN': ['深色模式', '切换到深色', '启用深色模式', '夜间模式'],
    'ja-JP': ['ダークモード', 'ダークに切り替え', 'ダークモードを有効に', 'ナイトモード'],
    'ko-KR': ['다크 모드', '어두운 모드로 전환', '다크 모드 활성화', '야간 모드'],
    'ru-RU': ['темный режим', 'переключиться на темный', 'включить темный режим', 'ночной режим']
  },
  'light_mode': {
    'en-US': ['light mode', 'switch to light', 'enable light mode', 'day mode'],
    'es-ES': ['modo claro', 'cambiar a claro', 'habilitar modo claro', 'modo diurno'],
    'fr-FR': ['mode clair', 'passer au clair', 'activer le mode clair', 'mode jour'],
    'de-DE': ['hellmodus', 'zu hell wechseln', 'hellmodus aktivieren', 'tagmodus'],
    'it-IT': ['modalità chiara', 'passa a chiaro', 'attiva modalità chiara', 'modalità giorno'],
    'pt-BR': ['modo claro', 'mudar para claro', 'ativar modo claro', 'modo diurno'],
    'zh-CN': ['浅色模式', '切换到浅色', '启用浅色模式', '日间模式'],
    'ja-JP': ['ライトモード', 'ライトに切り替え', 'ライトモードを有効に', 'デイモード'],
    'ko-KR': ['라이트 모드', '밝은 모드로 전환', '라이트 모드 활성화', '주간 모드'],
    'ru-RU': ['светлый режим', 'переключиться на светлый', 'включить светлый режим', 'дневной режим']
  }
};

/**
 * Calendar-specific commands in all supported languages
 */
export const calendarCommands: CommandTranslations = {
  'sync_calendar': {
    'en-US': ['sync calendar', 'update calendar', 'refresh calendar', 'synchronize calendar'],
    'es-ES': ['sincronizar calendario', 'actualizar calendario', 'refrescar calendario', 'sincronización de calendario'],
    'fr-FR': ['synchroniser le calendrier', 'mettre à jour le calendrier', 'rafraîchir le calendrier', 'synchronisation du calendrier'],
    'de-DE': ['Kalender synchronisieren', 'Kalender aktualisieren', 'Kalender auffrischen', 'Kalender abgleichen'],
    'it-IT': ['sincronizza calendario', 'aggiorna calendario', 'ricarica calendario', 'sincronizzazione calendario'],
    'pt-BR': ['sincronizar calendário', 'atualizar calendário', 'recarregar calendário', 'sincronização de calendário'],
    'zh-CN': ['同步日历', '更新日历', '刷新日历', '同步日历'],
    'ja-JP': ['カレンダーを同期', 'カレンダーを更新', 'カレンダーを再読み込み', 'カレンダー同期'],
    'ko-KR': ['캘린더 동기화', '캘린더 업데이트', '캘린더 새로 고침', '캘린더 동기화'],
    'ru-RU': ['синхронизировать календарь', 'обновить календарь', 'обновить календарь', 'синхронизация календаря']
  },
  'next_meeting': {
    'en-US': ['next meeting', 'upcoming meeting', 'show next meeting', 'what\'s my next meeting'],
    'es-ES': ['próxima reunión', 'siguiente reunión', 'mostrar próxima reunión', 'cuál es mi próxima reunión'],
    'fr-FR': ['prochaine réunion', 'réunion à venir', 'afficher la prochaine réunion', 'quelle est ma prochaine réunion'],
    'de-DE': ['nächste Besprechung', 'kommende Besprechung', 'zeige nächste Besprechung', 'was ist meine nächste Besprechung'],
    'it-IT': ['prossima riunione', 'riunione imminente', 'mostra prossima riunione', 'qual è la mia prossima riunione'],
    'pt-BR': ['próxima reunião', 'reunião seguinte', 'mostrar próxima reunião', 'qual é minha próxima reunião'],
    'zh-CN': ['下次会议', '即将到来的会议', '显示下次会议', '我的下一个会议是什么'],
    'ja-JP': ['次の会議', '今後の会議', '次の会議を表示', '次の会議は何ですか'],
    'ko-KR': ['다음 회의', '다가오는 회의', '다음 회의 표시', '내 다음 회의는 무엇인가요'],
    'ru-RU': ['следующая встреча', 'предстоящая встреча', 'показать следующую встречу', 'какая моя следующая встреча']
  },
  'today_meetings': {
    'en-US': ['today\'s meetings', 'meetings today', 'show today\'s meetings', 'what meetings do I have today'],
    'es-ES': ['reuniones de hoy', 'reuniones para hoy', 'mostrar reuniones de hoy', 'qué reuniones tengo hoy'],
    'fr-FR': ['réunions d\'aujourd\'hui', 'réunions du jour', 'afficher les réunions d\'aujourd\'hui', 'quelles réunions ai-je aujourd\'hui'],
    'de-DE': ['heutige Besprechungen', 'Besprechungen heute', 'zeige heutige Besprechungen', 'welche Besprechungen habe ich heute'],
    'it-IT': ['riunioni di oggi', 'riunioni per oggi', 'mostra riunioni odierne', 'quali riunioni ho oggi'],
    'pt-BR': ['reuniões de hoje', 'reuniões para hoje', 'mostrar reuniões de hoje', 'quais reuniões tenho hoje'],
    'zh-CN': ['今天的会议', '今日会议', '显示今天的会议', '我今天有什么会议'],
    'ja-JP': ['今日の会議', '本日の会議', '今日の会議を表示', '今日はどの会議がありますか'],
    'ko-KR': ['오늘 회의', '오늘의 회의', '오늘 회의 표시', '오늘 어떤 회의가 있나요'],
    'ru-RU': ['встречи сегодня', 'сегодняшние встречи', 'показать сегодняшние встречи', 'какие у меня сегодня встречи']
  },
  'weekly_view': {
    'en-US': ['weekly view', 'show week view', 'view weekly calendar', 'this week\'s schedule'],
    'es-ES': ['vista semanal', 'mostrar vista de semana', 'ver calendario semanal', 'horario de esta semana'],
    'fr-FR': ['vue hebdomadaire', 'afficher la vue semaine', 'voir le calendrier hebdomadaire', 'planning de cette semaine'],
    'de-DE': ['Wochenansicht', 'zeige Wochenansicht', 'Wochenkalender anzeigen', 'Zeitplan dieser Woche'],
    'it-IT': ['vista settimanale', 'mostra vista settimana', 'visualizza calendario settimanale', 'programma di questa settimana'],
    'pt-BR': ['visão semanal', 'mostrar visão da semana', 'ver calendário semanal', 'agenda desta semana'],
    'zh-CN': ['每周视图', '显示周视图', '查看每周日历', '本周日程'],
    'ja-JP': ['週間ビュー', '週表示', '週間カレンダーを表示', '今週のスケジュール'],
    'ko-KR': ['주간 보기', '주 보기 표시', '주간 캘린더 보기', '이번 주 일정'],
    'ru-RU': ['еженедельный вид', 'показать вид недели', 'просмотр еженедельного календаря', 'расписание на этой неделе']
  },
  'monthly_view': {
    'en-US': ['monthly view', 'show month view', 'view monthly calendar', 'this month\'s schedule'],
    'es-ES': ['vista mensual', 'mostrar vista de mes', 'ver calendario mensual', 'horario de este mes'],
    'fr-FR': ['vue mensuelle', 'afficher la vue mois', 'voir le calendrier mensuel', 'planning de ce mois'],
    'de-DE': ['Monatsansicht', 'zeige Monatsansicht', 'Monatskalender anzeigen', 'Zeitplan dieses Monats'],
    'it-IT': ['vista mensile', 'mostra vista mese', 'visualizza calendario mensile', 'programma di questo mese'],
    'pt-BR': ['visão mensal', 'mostrar visão do mês', 'ver calendário mensal', 'agenda deste mês'],
    'zh-CN': ['每月视图', '显示月视图', '查看每月日历', '本月日程'],
    'ja-JP': ['月間ビュー', '月表示', '月間カレンダーを表示', '今月のスケジュール'],
    'ko-KR': ['월간 보기', '월 보기 표시', '월간 캘린더 보기', '이번 달 일정'],
    'ru-RU': ['ежемесячный вид', 'показать вид месяца', 'просмотр ежемесячного календаря', 'расписание на этот месяц']
  }
};

/**
 * Retrieves command translations for a specific language
 * @param language The language code (e.g., 'en-US')
 * @returns A dictionary of commands in the specified language
 */
export function getCommandsForLanguage(language: string): Record<string, string[]> {
  const commands: Record<string, string[]> = {};
  const baseLanguage = language.split('-')[0]; // Extract 'en' from 'en-US'
  
  // Function to process a category of commands
  const processCommandCategory = (category: CommandTranslations) => {
    Object.entries(category).forEach(([command, translations]) => {
      if (translations[language]) {
        commands[command] = translations[language];
      } else {
        // Fallback to English if specific language not found
        commands[command] = translations['en-US'] || [];
      }
    });
  };
  
  // Process all command categories
  processCommandCategory(navigationCommands);
  processCommandCategory(meetingCommands);
  processCommandCategory(controlCommands);
  processCommandCategory(accessibilityCommands);
  processCommandCategory(calendarCommands);
  
  return commands;
}