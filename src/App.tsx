import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import {
  ArrowRight, ArrowUpRight, Backpack, Bookmark, BookOpen, Check,
  CheckCircle2, ChevronRight, CircleHelp, Clock3, Gamepad2, Headphones,
  Keyboard, Lightbulb, Menu, MessageCircle, Mic, PencilLine, Play,
  RotateCcw, ShieldCheck, Sparkles, Sprout, Square, Sun, Trash2,
  UsersRound, Utensils, Volume2, X,
} from 'lucide-react';
import { topics, sampleFeedback } from '../shared/catalog';
import type { AnswerSource, Feedback, PracticeRecord } from '../shared/types';
import { MAX_SECONDS, VoiceRecorder, microphoneError, speak, stopAllPlayback } from './lib/audio';
import { emptyStore, readStore, STORAGE_KEY, todayCounts, writeStore, type Store } from './lib/storage';
import { newLocalId } from './lib/id';

type Page = 'practice' | 'history' | 'notebook';
type Phase = 'ready' | 'recording' | 'review' | 'feedback';
type PreviousAttempt = { audio: Blob; transcript: string };
type DeleteScope = 'records' | 'expressions' | 'all';
const topicIcons = [Gamepad2, Backpack, UsersRound, Utensils, Sun];
const wavePattern = [0.2, 0.35, 0.5, 0.28, 0.75, 0.42, 0.9, 0.65, 0.4, 1, 0.6, 0.85, 0.48, 0.7, 0.95, 0.3, 0.65, 0.45, 0.8, 0.55, 0.35, 0.7, 0.4, 0.2];

function Brand() {
  return <><span className="brand-mark"><MessageCircle size={23} strokeWidth={2.4} /><span /></span><span className="brand-name">말로<span>mallo</span></span></>;
}

function Buddy({ small = false }: { small?: boolean }) {
  return <svg className={small ? 'buddy small-buddy' : 'buddy'} viewBox="0 0 290 210" fill="none" aria-hidden="true">
    <ellipse cx="158" cy="189" rx="82" ry="10" fill="#e8e5dd" />
    <path d="M84 120C60 112 53 129 61 144C67 156 81 154 88 147" fill="#ec784f" stroke="#513e34" strokeWidth="2.5" />
    <path d="M230 121C251 111 259 128 251 141C246 151 236 153 229 147" fill="#ec784f" stroke="#513e34" strokeWidth="2.5" />
    <path d="M125 171L118 188C124 194 135 192 140 187L144 174M185 174L190 188C196 194 209 192 211 187L203 169" fill="#f8ba69" stroke="#513e34" strokeWidth="2.5" strokeLinejoin="round" />
    <path d="M77 103C77 64 106 42 153 42C200 42 233 61 237 104C241 148 216 177 157 178C105 179 77 152 77 103Z" fill="#f3946c" stroke="#513e34" strokeWidth="2.5" />
    <path d="M84 89C98 58 118 53 150 52" stroke="#ffba95" strokeWidth="6" strokeLinecap="round" />
    <ellipse cx="118" cy="112" rx="4.2" ry="6.5" fill="#513e34" /><ellipse cx="184" cy="112" rx="4.2" ry="6.5" fill="#513e34" />
    <path d="M139 123C145 134 159 134 166 123" stroke="#513e34" strokeWidth="3" strokeLinecap="round" />
    <ellipse cx="104" cy="125" rx="9" ry="5" fill="#f07b68" /><ellipse cx="197" cy="125" rx="9" ry="5" fill="#f07b68" />
    <path d="M84 106V93C84 53 110 31 154 31C200 31 229 55 229 94V105" stroke="#648779" strokeWidth="12" strokeLinecap="round" />
    <rect x="71" y="91" width="21" height="39" rx="9" fill="#456e5c" transform="rotate(-5 71 91)" />
    <rect x="220" y="91" width="21" height="39" rx="9" fill="#456e5c" transform="rotate(5 220 91)" />
    <path d="M45 63L48 52L53 62L64 65L53 70L49 80L45 70L34 67Z" fill="#e8b94e" />
    <path d="M253 47L255 40L259 47L266 49L259 52L256 59L253 52L246 50Z" fill="#7a9d86" />
    <path d="M249 160L252 154L255 160L261 162L255 165L252 171L249 165L243 162Z" fill="#e8b94e" />
  </svg>;
}

function Dialog({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    ref.current?.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = old; };
  }, []);
  return <dialog className={`dialog ${wide ? 'dialog-wide' : ''}`} ref={ref} aria-labelledby={id} onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <div className="dialog-heading"><h2 id={id}>{title}</h2><button className="icon-button" aria-label="닫기" onClick={onClose}><X size={21} /></button></div>
    {children}
  </dialog>;
}

function ListenButton({ text, path, label = '듣기', className = '' }: { text: string; path?: string; label?: string; className?: string }) {
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState('');
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  async function listen() {
    setPlaying(true); setError('');
    try { await speak(text, path); }
    catch (error) { if (alive.current) setError(error instanceof Error ? error.message : '다시 시도해 주세요.'); }
    finally { if (alive.current) setPlaying(false); }
  }
  return <span className={`listen-wrapper ${className}`}>
    <button className={`listen-button ${playing ? 'is-speaking' : ''}`} onClick={() => void listen()} disabled={playing} aria-label={label}>
      <Volume2 size={17} /><span>{playing ? '재생 중' : label}</span>
    </button>
    {error && <span className="inline-error" role="alert">{error}</span>}
  </span>;
}

function dateLabel(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function useAudioUrl(blob: Blob | null) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!blob) { setUrl(''); return; }
    const next = URL.createObjectURL(blob); setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return url;
}

function RecordingPlayer({ url, label }: { url: string; label: string }) {
  return <audio controls src={url} preload="metadata" aria-label={label} onPlay={(event) => stopAllPlayback(event.currentTarget)} />;
}

function AudioComparison({ first, second, firstText, secondText }: { first: string; second: string; firstText: string; secondText: string }) {
  return <section className="audio-comparison" aria-label="첫 번째와 두 번째 녹음 비교"><h4><Headphones size={17} />처음과 지금, 번갈아 들어볼까요?</h4><div className="comparison-grid"><div><span>처음 말하기</span><RecordingPlayer url={first} label="첫 번째 녹음" />{firstText && <p lang="en">{firstText}</p>}</div><div><span>다시 말하기</span><RecordingPlayer url={second} label="두 번째 녹음" />{secondText && <p lang="en">{secondText}</p>}</div></div><p>두 녹음은 이 연습 중에만 보관하고, 완료하거나 연습을 바꾸면 지워요.</p></section>;
}

export default function App() {
  const [page, setPage] = useState<Page>('practice');
  const [mobileNav, setMobileNav] = useState(false);
  const [topicIndex, setTopicIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('ready');
  const [source, setSource] = useState<AnswerSource>('recording');
  const [translation, setTranslation] = useState(false);
  const [hintsOpen, setHintsOpen] = useState(false);
  const [pendingMic, setPendingMic] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const audioUrl = useAudioUrl(audioBlob);
  const [previousAttempt, setPreviousAttempt] = useState<PreviousAttempt | null>(null);
  const previousAudioUrl = useAudioUrl(previousAttempt?.audio ?? null);
  const [transcript, setTranscript] = useState('');
  const [previousAnswer, setPreviousAnswer] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [savedId, setSavedId] = useState('');
  const [checks, setChecks] = useState<boolean[]>([false, false, false]);
  const [help, setHelp] = useState(false);
  const [clearDialog, setClearDialog] = useState<DeleteScope | null>(null);
  const [pendingTransition, setPendingTransition] = useState<{ action: () => void; label: string } | null>(null);
  const [detail, setDetail] = useState<PracticeRecord | null>(null);
  const [store, setStore] = useState<Store>(emptyStore);
  const [storageError, setStorageError] = useState('');
  const storageWritable = useRef(true);
  const recorder = useRef<VoiceRecorder | null>(null);
  const stopping = useRef(false);
  const phaseHeading = useRef<HTMLHeadingElement>(null);
  const topic = topics[topicIndex];
  const question = topic.questions[questionIndex];
  const recording = phase === 'recording';
  const busy = recording || pendingMic;
  const counts = todayCounts(store.records);
  const dailyCount = counts.recording;
  const canComplete = Boolean(audioBlob || transcript.trim() || previousAttempt || previousAnswer.trim());
  const unfinished = !savedId && source !== 'sample' && (canComplete || busy);
  const expression = feedback?.expression || { sentence: question.sample.natural, translation: question.sample.translation };
  const expressionSaved = store.expressions.some((item) => item.sentence === expression.sentence);

  useEffect(() => {
    const loaded = readStore();
    setStore(loaded.data);
    if (loaded.error) { setStorageError(loaded.error); storageWritable.current = false; }
    return () => { recorder.current?.cancel(); recorder.current = null; stopAllPlayback(); };
  }, []);
  useEffect(() => {
    if (!unfinished) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [unfinished]);
  useEffect(() => {
    if (!recording) return;
    const start = performance.now();
    const timer = setInterval(() => setElapsed(Math.min(MAX_SECONDS, (performance.now() - start) / 1000)), 100);
    const hide = () => { if (document.hidden) void finishRecording(); };
    document.addEventListener('visibilitychange', hide);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', hide); };
  }, [recording]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 4200);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => { if (phase !== 'recording' && phase !== 'ready') phaseHeading.current?.focus({ preventScroll: true }); }, [phase]);

  function persist(next: Store) {
    setStore(next);
    if (storageWritable.current) { const error = writeStore(next); setStorageError(error || ''); }
  }
  function navigate(next: Page) {
    stopAllPlayback(); setPage(next); setMobileNav(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function reset(nextTopic = topicIndex, nextQuestion = questionIndex, previous = '') {
    recorder.current?.cancel(); recorder.current = null; stopAllPlayback();
    setPhase('ready'); setTopicIndex(nextTopic); setQuestionIndex(nextQuestion);
    setTranslation(false); setHintsOpen(false); setAudioBlob(null); setTranscript('');
    setFeedback(null); setError(''); setElapsed(0); setLevel(0); setSavedId('');
    setSource('recording'); setPreviousAnswer(previous); setChecks([false, false, false]);
    setPreviousAttempt(null);
  }
  function protect(action: () => void, label: string) {
    if (unfinished) setPendingTransition({ action, label });
    else action();
  }
  function chooseTopic(index: number) {
    if (index === topicIndex || busy) return;
    protect(() => reset(index, 0), '주제 바꾸기');
  }
  function retry() {
    const first = audioBlob ? (previousAttempt || { audio: audioBlob, transcript }) : previousAttempt;
    const lastAnswer = savedId ? '' : transcript;
    reset(topicIndex, questionIndex, lastAnswer);
    if (!savedId) { setPreviousAttempt(first); setSource(source); }
  }
  async function beginRecording() {
    if (busy) return;
    stopAllPlayback(); setError(''); setPendingMic(true);
    const current = new VoiceRecorder(); recorder.current = current;
    try {
      await current.start(setLevel, () => { void finishRecording(); });
      if (recorder.current !== current) { current.cancel(); return; }
      setSource('recording'); setElapsed(0); setPhase('recording');
    } catch (error) { setError(microphoneError(error)); recorder.current = null; }
    finally { setPendingMic(false); }
  }
  async function finishRecording() {
    if (!recorder.current || stopping.current) return;
    const current = recorder.current;
    stopping.current = true;
    try {
      const blob = await current.stop();
      if (recorder.current !== current) return;
      if (blob.size <= 44) throw new Error('녹음된 소리가 없어요. 다시 한 번 말해 주세요.');
      setAudioBlob(blob); setTranscript(''); setPhase('review'); setLevel(0);
    } catch (error) { if (recorder.current === current) { setError(microphoneError(error)); setPhase('ready'); } }
    finally { if (recorder.current === current) recorder.current = null; stopping.current = false; }
  }
  function trySample() {
    protect(() => {
      reset(); setSource('sample'); setTranscript(question.sample.answer); setPhase('review');
    }, '샘플로 바꾸기');
  }
  function useText() {
    protect(() => { reset(); setSource('text'); setPhase('review'); }, '직접 입력으로 바꾸기');
  }
  function reflect() {
    if (!transcript.trim() && !audioBlob) { setError('한 문장만 적어볼까요? 짧게 써도 괜찮아요.'); return; }
    setError(''); setFeedback(source === 'sample' ? sampleFeedback(question) : null); setPhase('feedback');
  }
  function saveExpression() {
    if (expressionSaved) {
      persist({ ...store, expressions: store.expressions.filter((item) => item.sentence !== expression.sentence) });
      setNotice('표현 노트에서 뺐어요.'); return;
    }
    if (store.expressions.length >= 200) { setNotice('표현 노트가 가득 찼어요. 안 쓰는 표현을 지워 주세요.'); return; }
    persist({ ...store, expressions: [{ id: newLocalId(), sentence: expression.sentence, translation: expression.translation, savedAt: new Date().toISOString(), isSample: true }, ...store.expressions] });
    setNotice('표현 노트에 담았어요.');
  }
  function complete() {
    if (savedId) return;
    const entry: PracticeRecord = {
      id: newLocalId(), completedAt: new Date().toISOString(), topicId: topic.id,
      question: question.english, transcript: transcript.trim() || previousAttempt?.transcript || previousAnswer, source, feedback,
    };
    persist({ ...store, records: [entry, ...store.records].slice(0, 200) });
    setSavedId(entry.id);
    setNotice(source === 'sample' ? '샘플 체험 완료! 이제 내 목소리로도 도전해 봐요.' : '오늘의 한 문장, 잘 마쳤어요!');
    setAudioBlob(null);
    setPreviousAttempt(null); stopAllPlayback();
  }
  function clearAll() {
    const next = {
      records: clearDialog === 'expressions' ? store.records : [],
      expressions: clearDialog === 'records' ? store.expressions : [],
    };
    try {
      if (clearDialog === 'all') localStorage.removeItem(STORAGE_KEY);
      const error = writeStore(next);
      storageWritable.current = !error;
      setStorageError(error || '');
      setNotice(error ? '현재 화면의 기록을 비웠어요. 기기 저장소는 사용할 수 없어요.' : clearDialog === 'records' ? '연습 기록을 지웠어요. 표현 노트는 그대로예요.' : clearDialog === 'expressions' ? '표현 노트를 비웠어요. 연습 기록은 그대로예요.' : '이 기기의 기록과 표현을 지웠어요.');
    } catch {
      storageWritable.current = false;
      setStorageError('기기 저장소에 접근하지 못했어요. 브라우저의 사이트 설정에서 저장 데이터를 관리해 주세요.');
    }
    setStore(next); setClearDialog(null);
  }

  return <div className="app-shell">
    {mobileNav && <button className="mobile-backdrop" aria-label="메뉴 닫기" onClick={() => setMobileNav(false)} />}
    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`} aria-label="주 메뉴">
      <button className="brand" onClick={() => navigate('practice')} disabled={busy} aria-label="말로 홈"><Brand /></button>
      <div className="sidebar-caption">MY LITTLE ENGLISH SPACE</div>
      <nav className="main-nav">
        {([
          ['practice', Mic, '오늘의 연습'], ['history', Clock3, '연습 기록'], ['notebook', Bookmark, '표현 노트'],
        ] as const).map(([id, Icon, label]) => <button key={id} className={page === id ? 'nav-active' : ''} aria-current={page === id ? 'page' : undefined} disabled={busy} onClick={() => navigate(id)}>
          <Icon size={20} /><span>{label}</span>{page === id && <span className="nav-dot" />}
        </button>)}
      </nav>
      <div className="sidebar-note"><Sprout size={25} /><p>작은 한 문장이<br /><strong>큰 자신감이 될 거예요.</strong></p><span>Little steps, big voice.</span></div>
      <div className="sidebar-bottom"><div className="profile-icon">m.</div><div><strong>나만의 말하기 여정</strong><span>오늘도 나의 속도로</span></div><span className="profile-dot" /></div>
    </aside>

    <div className="main-shell">
      <header className="topbar">
        <div className="topbar-left"><button className="icon-button mobile-menu" aria-label="메뉴 열기" aria-expanded={mobileNav} onClick={() => setMobileNav(!mobileNav)}><Menu size={23} /></button><span className="tiny-dot" /><span>한 문장부터, 나답게.</span></div>
        <div className="topbar-right"><button className="mode-pill" onClick={() => setHelp(true)}><span />자유 연습 체험</button><span className="topbar-divider" /><button className="help-button" onClick={() => setHelp(true)}><CircleHelp size={18} /><span>이용 안내</span></button></div>
      </header>

      <main id="main" className="main-content">
        {storageError && <div className="storage-warning" role="alert"><ShieldCheck size={18} /><span>{storageError}</span><button className="text-button" onClick={() => setClearDialog('all')}>기록 초기화</button></div>}
        {page === 'practice' && <>
          <section className="welcome">
            <div className="welcome-copy"><span className="eyebrow"><span />A LITTLE PRACTICE, EVERY DAY</span><h1>틀려도 괜찮아,<br />일단 <span className="welcome-accent">말해볼까?</span><span className="heading-spark" aria-hidden="true">✳︎</span></h1><p>한 문장도 좋아요.<span className="welcome-subline"> 내 이야기를 영어로 들려주세요.</span></p></div>
            <div className="welcome-art"><span className="hello-bubble">Hello, you! <span>✦</span></span><Buddy /><span className="art-caption">Your voice matters.</span></div>
            <div className="daily-goal"><div className="goal-top"><span>오늘의 작은 목표</span><Sprout size={19} /></div><div className="goal-number"><strong>{Math.min(dailyCount, 3)}</strong><span>/ 3</span><span className="goal-unit">번 말하기</span></div><div className="goal-progress" role="progressbar" aria-label="오늘의 말하기 목표" aria-valuenow={Math.min(dailyCount, 3)} aria-valuemin={0} aria-valuemax={3}>{[1, 2, 3].map((i) => <span key={i} className={dailyCount >= i ? 'filled' : ''} />)}</div><p className="goal-detail">음성 {counts.recording}회 · 입력 {counts.text}회</p><p>{dailyCount >= 3 ? '오늘의 목표를 이뤘어요. 멋져요!' : '말한 연습만 목표에 담아요.'}</p></div>
          </section>

          <section className="topic-section" aria-labelledby="topics-heading"><div className="section-title"><h2 id="topics-heading">오늘은 어떤 이야기를 할까요?</h2><span>내가 좋아하는 주제를 골라요</span></div><div className="topic-list">{topics.map((item, index) => { const Icon = topicIcons[index]; return <button key={item.id} className={`topic-button ${topicIndex === index ? 'selected' : ''}`} aria-pressed={topicIndex === index} disabled={busy} onClick={() => chooseTopic(index)}><Icon size={18} /><span>{item.name}</span>{topicIndex === index && <Check size={15} />}</button>; })}</div></section>

          <div className="practice-layout">
            <div className="practice-column">
              <section className="conversation-card" aria-labelledby="conversation-heading">
                <div className="conversation-top"><span className="conversation-label"><span />LET’S TALK · {topic.english}</span><span className="question-count">질문 <strong>{questionIndex + 1}</strong> <span>/ {topic.questions.length}</span></span></div>
                <div className="stepper" aria-label="연습 순서">{['질문 듣기', '내 이야기', '다시 말하기'].map((step, index) => {
                  const active = phase === 'ready' ? 0 : phase === 'feedback' ? 2 : 1;
                  return <div key={step} className={`step ${active === index ? 'step-active' : ''} ${active > index ? 'step-done' : ''}`}><span className="step-number">{active > index ? <Check size={12} /> : `0${index + 1}`}</span><span>{step}</span>{index < 2 && <ChevronRight size={12} />}</div>;
                })}</div>

                <div className="question-block"><div className="question-kicker"><span className="question-badge">Q.</span><span>{topic.description}</span></div><h2 id="conversation-heading" lang="en">{question.english}</h2><div className="question-tools"><ListenButton text={question.english} path={`/audio/${question.id}-question.mp3`} label="질문 듣기" /><button className="translation-button" aria-expanded={translation} onClick={() => setTranslation(!translation)}>{translation ? '해석 접기' : '해석 보기'}<ChevronRight size={13} className={translation ? 'rotate-90' : ''} /></button></div>{translation && <p className="translation">{question.korean}</p>}</div>

                {(phase === 'ready' || recording) && <div className="record-area">
                  {previousAnswer && <div className="previous-answer"><RotateCcw size={14} /><span>다시 도전 중 · 지난 답변: {previousAnswer}</span></div>}
                  <div className={`voice-visual ${recording ? 'voice-live' : ''}`} aria-hidden="true">{wavePattern.map((factor, index) => <span key={index} style={{ height: recording ? `${4 + factor * level * 49}px` : `${4 + factor * 12}px` }} />)}</div>
                  <p className="record-invitation">{recording ? '잘하고 있어요. 편하게 이야기해요.' : pendingMic ? '마이크를 준비하고 있어요…' : '이제, 너의 이야기를 들려줘.'}</p>
                  <button className={`record-button ${recording ? 'record-button-live' : ''}`} onClick={() => recording ? void finishRecording() : void beginRecording()} disabled={pendingMic}>
                    {recording ? <Square size={18} fill="currentColor" /> : <Mic size={21} />}<span>{recording ? '녹음 끝내기' : pendingMic ? '마이크 준비 중' : '눌러서 말하기'}</span>
                  </button>
                  <span className="record-time">{recording ? `${Math.floor(elapsed / 60)}:${String(Math.floor(elapsed % 60)).padStart(2, '0')} / 0:30` : '최대 30초 · 한 문장으로도 충분해요'}</span>
                  {recording && <button className="text-button cancel-record" onClick={() => { recorder.current?.cancel(); recorder.current = null; setPhase('ready'); setLevel(0); }}>녹음 취소</button>}
                  {!recording && !pendingMic && <div className="alternative-actions"><button onClick={useText}><Keyboard size={15} />직접 입력하기</button><span /><button onClick={trySample}>샘플로 먼저 해보기<ArrowUpRight size={14} /></button></div>}
                  {error && <div className="record-error" role="alert">{error}</div>}
                </div>}

                {phase === 'review' && <div className="review-area">
                  <div className="review-title"><h3 ref={phaseHeading} tabIndex={-1}>{source === 'sample' ? '이렇게 말해봤다고 상상해 봐요.' : '내 이야기를 확인해 볼까요?'}</h3><span className={`small-badge ${source === 'sample' ? 'badge-peach' : 'badge-green'}`}>{source === 'sample' ? '샘플 답변' : '내 답변'}</span></div>
                  {audioUrl && !previousAudioUrl && <div className="audio-review"><span><Headphones size={17} />내 녹음 다시 듣기</span><RecordingPlayer url={audioUrl} label="내 녹음" /></div>}
                  {audioUrl && previousAudioUrl && <AudioComparison first={previousAudioUrl} second={audioUrl} firstText={previousAttempt?.transcript || ''} secondText={transcript} />}
                  <label className="input-label" htmlFor="answer">{source === 'sample' ? '샘플 문장' : audioBlob ? '내가 말한 문장 (선택)' : '영어로 한 문장 적어보세요'}</label>
                  <textarea id="answer" lang="en" value={transcript} maxLength={600} readOnly={source === 'sample'} onChange={(event) => setTranscript(event.target.value)} placeholder="I like to…" rows={3} aria-describedby="answer-help" autoFocus={source === 'text'} />
                  <div className="input-meta"><p id="answer-help">{source === 'sample' ? '이 샘플 문장에 대한 교정 예시를 확인할 수 있어요.' : '자동 받아쓰기는 아직 연결 전이에요. 입력한 문장은 이 기기에만 남아요.'}</p><span>{transcript.length}/600</span></div>
                  {error && <p className="inline-error" role="alert">{error}</p>}
                  <div className="review-actions"><button className="button-secondary" onClick={() => protect(() => reset(), '다시 시작')}><RotateCcw size={16} />다시 시작</button><button className="button-primary" onClick={reflect}>{source === 'sample' ? '샘플 피드백 보기' : '예시와 비교하기'}<ArrowRight size={17} /></button></div>
                </div>}

                {phase === 'feedback' && <div className="feedback-area">
                  <div className="review-title"><h3 ref={phaseHeading} tabIndex={-1}>{feedback ? '한 문장, 조금 더 자연스럽게.' : '내 답변을 돌아보는 시간.'}</h3><span className={`small-badge ${feedback ? 'badge-peach' : 'badge-green'}`}>{feedback ? '샘플 피드백' : '스스로 돌아보기'}</span></div>
                  <div className="feedback-disclosure"><CircleHelp size={16} /><span>{feedback ? '샘플 문장에 미리 작성된 피드백이에요. 실제 녹음 분석 결과가 아니에요.' : '내 답변을 자동으로 분석하지 않았어요. 아래 예시와 비교하며 직접 확인해 봐요.'}</span></div>
                  {audioUrl && previousAudioUrl && <AudioComparison first={previousAudioUrl} second={audioUrl} firstText={previousAttempt?.transcript || ''} secondText={transcript} />}
                  {feedback ? <>
                    <div className="praise-box"><span className="praise-icon"><Sprout size={20} /></span><div><h4>이런 점이 좋아요</h4><p>{feedback.praise}</p></div></div>
                    <div className="grammar-box"><h4><PencilLine size={17} />딱 하나만 다듬어 볼까?</h4><div className="sentence-before" lang="en">{question.sample.answer}</div><div className="sentence-after" lang="en"><Check size={17} />{feedback.grammar.corrected}</div><p>{feedback.grammar.explanation}</p></div>
                  </> : <>
                    <div className="my-answer"><span>내가 남긴 한 문장</span><p lang="en">{transcript || '목소리로 이야기를 들려줬어요.'}</p>{audioUrl && !previousAudioUrl && <RecordingPlayer url={audioUrl} label="내 답변 다시 듣기" />}</div>
                    <div className="self-check"><h4><CheckCircle2 size={17} />점수 대신, 나에게 체크</h4>{['질문에 맞는 내 이야기를 했어요.', '짧아도 한 문장을 끝까지 말했어요.', '예시를 보고 다시 말할 준비가 됐어요.'].map((label, index) => <label key={label}><input type="checkbox" checked={checks[index]} onChange={() => setChecks(checks.map((value, i) => i === index ? !value : value))} /><span>{label}</span></label>)}</div>
                  </>}
                  <div className="pronunciation-note"><Headphones size={19} /><div><h4>발음은 실제 목소리를 듣고 확인해요</h4><p>{feedback ? '샘플에서는 발음을 평가하지 않아요. 내 목소리로 녹음하고 다시 들으며 연습해 봐요.' : '현재는 자동 발음 분석을 제공하지 않아요. 녹음을 들으며 단어가 또렷이 들리는지 확인해 보세요.'}</p></div></div>
                  <div className="expression-card"><div className="expression-heading"><span><Sparkles size={16} />{feedback ? '이렇게 말해도 좋아요' : '비교하며 연습하는 예시 답변'}</span><button className={expressionSaved ? 'is-saved' : ''} aria-label={expressionSaved ? '표현 저장 취소' : '표현 노트에 저장'} aria-pressed={expressionSaved} onClick={saveExpression}><Bookmark size={18} fill={expressionSaved ? 'currentColor' : 'none'} /></button></div><p className="expression-sentence" lang="en">{expression.sentence}</p><p className="expression-translation">{expression.translation}</p><ListenButton text={expression.sentence} path={`/audio/${question.id}-answer.mp3`} label="예시 문장 듣기" /></div>
                  <div className="feedback-actions"><button className="button-secondary" onClick={retry}><Mic size={17} />한 번 더 말하기</button>{savedId ? <button className="button-primary" onClick={() => reset(topicIndex, (questionIndex + 1) % topic.questions.length)}>다음 질문으로<ArrowRight size={17} /></button> : <button className="button-primary" onClick={complete}><Check size={17} />연습 완료하기</button>}</div>
                  {savedId && <p className="completion-note"><CheckCircle2 size={15} />{source === 'sample' ? '샘플 체험은 오늘의 말하기 횟수에 포함하지 않아요.' : '완료한 연습을 기록했어요. 원본 녹음은 보관하지 않아요.'}</p>}
                </div>}
                <div className="conversation-footer"><ShieldCheck size={14} /><span>목소리는 현재 탭에만 · 외부 AI 전송 없음</span><span className="footer-flower">✳</span></div>
              </section>

              <div className="journey-strip"><div><span className="journey-icon icon-peach"><Headphones size={19} /></span><span><strong>듣고</strong><small>질문에 귀 기울이기</small></span></div><span className="journey-dash" /><div><span className="journey-icon icon-green"><Mic size={19} /></span><span><strong>말하고</strong><small>내 이야기를 한 문장으로</small></span></div><span className="journey-dash" /><div><span className="journey-icon icon-yellow"><Sprout size={19} /></span><span><strong>자라나요</strong><small>한 번 더, 조금 더 편하게</small></span></div></div>
            </div>

            <aside className="practice-aside" aria-label="말하기 도움말"><section className="hint-card"><div className="hint-title"><span className="hint-icon"><Lightbulb size={19} /></span><h3>말문이 막힐 땐</h3><span className="tiny-star">✧</span></div><p>이렇게 시작해도 좋아요.</p><div className="starter" lang="en">“{question.starter}”</div><button className="hint-toggle" onClick={() => setHintsOpen(!hintsOpen)} aria-expanded={hintsOpen}>{hintsOpen ? '힌트 접기' : '도움이 되는 표현 보기'}<ChevronRight className={hintsOpen ? 'rotate-90' : ''} size={15} /></button>{hintsOpen && <ul className="hint-words">{question.words.map((word) => <li key={word} lang="en">{word}</li>)}</ul>}</section>
              <section className="encouragement-card"><span className="encouragement-flower">✳</span><span className="eyebrow">A NOTE FOR YOU</span><h3>정답보다<br /><span>네 이야기</span>가 궁금해.</h3><p>완벽한 문장이 아니어도 괜찮아.<br />말할 때마다 조금씩 자라고 있어.</p><div className="encouragement-bottom"><span>Keep going, little by little.</span><Sprout size={24} /></div></section>
              <button className="sample-link" onClick={trySample} disabled={busy}><span className="sample-play"><Play size={12} fill="currentColor" /></span><span><strong>처음이라면, 가볍게</strong><small>샘플 연습 먼저 둘러보기</small></span><ArrowUpRight size={17} /></button>
            </aside>
          </div>
          <p className="page-footnote">오늘의 한 문장도, 분명한 한 걸음.<span>made for your little brave moments</span></p>
        </>}

        {page === 'history' && <section className="library-page"><span className="eyebrow">MY SMALL STEPS</span><div className="library-heading"><div><h1>차곡차곡, 연습 기록</h1><p>말해본 순간을 모으면 나만의 성장이 보여요.</p></div>{store.records.length > 0 && <button className="button-secondary button-small" onClick={() => setClearDialog('records')}><Trash2 size={15} />기록 관리</button>}</div><div className="library-info"><ShieldCheck size={17} /><span>이 브라우저에만 최대 200개를 보관해요. 원본 녹음은 저장하지 않아요.</span></div>{store.records.length === 0 ? <EmptyState icon={<Clock3 size={29} />} title="첫 번째 이야기를 기다리고 있어요" description="짧게 말해도 좋아요. 연습을 완료하면 여기에 남아요." action="첫 연습 시작하기" onAction={() => navigate('practice')} /> : <div className="history-list">{store.records.map((entry) => <button className="history-card" key={entry.id} onClick={() => setDetail(entry)}><span className={`history-icon ${entry.source === 'sample' ? 'icon-peach' : 'icon-green'}`}>{entry.source === 'sample' ? <BookOpen size={21} /> : <Mic size={21} />}</span><span className="history-card-text"><span className="history-meta">{topics.find((topic) => topic.id === entry.topicId)?.name}<span>·</span>{dateLabel(entry.completedAt)}</span><strong lang="en">{entry.question}</strong><span className="history-transcript" lang="en">{entry.transcript || '목소리로 연습했어요.'}</span></span><span className={`small-badge ${entry.source === 'sample' ? 'badge-peach' : 'badge-green'}`}>{entry.source === 'sample' ? '샘플' : entry.source === 'recording' ? '음성 연습' : '입력 연습'}</span><ChevronRight size={19} /></button>)}</div>}</section>}

        {page === 'notebook' && <section className="library-page"><span className="eyebrow">WORDS TO MAKE YOUR OWN</span><div className="library-heading"><div><h1>다시 꺼내보는 표현 노트</h1><p>마음에 드는 문장을 담고, 내 문장으로 만들어 봐요.</p></div><div className="library-tools"><span className="note-count">{store.expressions.length}개의 표현</span>{store.expressions.length > 0 && <button className="button-secondary button-small" onClick={() => setClearDialog('expressions')}><Trash2 size={15} />노트 비우기</button>}</div></div><div className="library-info"><Bookmark size={17} /><span>연습 화면의 북마크를 누르면 예시 문장을 이 기기에 담을 수 있어요.</span></div>{store.expressions.length === 0 ? <EmptyState icon={<Bookmark size={29} />} title="마음에 드는 첫 문장을 담아볼까요?" description="연습에서 만난 표현의 북마크를 누르면 여기에 모여요." action="표현 만나러 가기" onAction={() => navigate('practice')} /> : <div className="notebook-grid">{store.expressions.map((item) => {
          const matched = topics.flatMap((topic) => topic.questions).find((question) => question.sample.natural === item.sentence);
          return <article className="notebook-card" key={item.id}><div className="note-card-top"><span className="small-badge badge-green">연습용 예시 표현</span><button className="icon-button" aria-label={`${item.sentence} 삭제`} onClick={() => { persist({ ...store, expressions: store.expressions.filter((expression) => expression.id !== item.id) }); setNotice('표현을 노트에서 뺐어요.'); }}><Trash2 size={16} /></button></div><h2 lang="en">{item.sentence}</h2><p>{item.translation}</p><div className="note-card-bottom"><ListenButton text={item.sentence} path={matched ? `/audio/${matched.id}-answer.mp3` : undefined} label="문장 듣기" /><span>{new Date(item.savedAt).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}</span></div></article>;
        })}</div>}</section>}
      </main>
    </div>

    {notice && <div className="toast" role="status"><CheckCircle2 size={18} />{notice}</div>}
    {help && <Dialog title="말로에서, 한 문장씩" onClose={() => setHelp(false)}><div className="help-intro"><Buddy small /><p>틀려도 괜찮아요.<br />내 이야기를 영어로 꺼내보는 곳이에요.</p></div><ol className="help-steps"><li><strong>듣고 말해요</strong><p>주제를 고르고 최대 30초 동안 녹음해요. 직접 입력해도 좋아요.</p></li><li><strong>확인하고 비교해요</strong><p>내 녹음을 듣고 예시 답변과 비교해요. 샘플에서는 미리 작성된 문법 교정 예시도 볼 수 있어요.</p></li><li><strong>한 번 더 연습해요</strong><p>예시를 듣고 다시 말해요. 연습을 완료하거나 마음에 드는 표현을 저장해 보세요.</p></li></ol><div className="help-privacy"><ShieldCheck size={19} /><div><strong>지금은 스스로 연습하는 체험 버전이에요.</strong><p>자동 받아쓰기·발음·문법 분석은 연결 전이에요. 녹음은 외부로 전송하지 않고, 현재 탭에만 둬요. 다시 말하기를 하면 처음 녹음과 비교할 수 있어요. 완료하거나 연습을 바꾸거나 탭을 닫으면 두 녹음 모두 지워져요. 기록과 표현은 이 브라우저에만 저장돼요.</p><p>문장 듣기는 기기 내 영어 음성 또는 앱에 포함된 합성 음성을 사용해요.</p></div></div><button className="button-primary full-width" onClick={() => setHelp(false)}>좋아요, 말해볼게요<ArrowRight size={17} /></button></Dialog>}
    {pendingTransition && <Dialog title="아직 완료하지 않은 연습이 있어요" onClose={() => setPendingTransition(null)}><p className="dialog-copy">{pendingTransition.label} 전에 답변을 완료 기록으로 남길 수 있어요. 녹음은 기록에 저장하지 않으며, 이동하면 현재 비교 녹음은 지워져요.</p><div className="dialog-actions transition-actions"><button className="button-secondary" onClick={() => setPendingTransition(null)}>계속 연습하기</button><button className="button-primary" disabled={!canComplete} onClick={() => { complete(); pendingTransition.action(); setPendingTransition(null); }}>완료하고 이동</button><button className="text-button" onClick={() => { pendingTransition.action(); setPendingTransition(null); }}>저장하지 않고 이동</button></div></Dialog>}
    {clearDialog && <Dialog title={clearDialog === 'records' ? '연습 기록만 지울까요?' : clearDialog === 'expressions' ? '표현 노트만 비울까요?' : '기기에 저장한 기록을 모두 지울까요?'} onClose={() => setClearDialog(null)}><p className="dialog-copy">{clearDialog === 'records' ? '완료한 연습 기록만 지우며, 표현 노트는 그대로 남겨요.' : clearDialog === 'expressions' ? '담아둔 표현만 지우며, 완료한 연습 기록은 그대로 남겨요.' : '완료한 연습 기록과 표현 노트를 모두 지워요.'} 지운 기록은 복구할 수 없어요.</p><div className="dialog-actions"><button className="button-secondary" onClick={() => setClearDialog(null)}>유지하기</button><button className="button-danger" onClick={clearAll}>{clearDialog === 'records' ? '연습 기록 지우기' : clearDialog === 'expressions' ? '표현 노트 비우기' : '모두 지우기'}</button></div></Dialog>}
    {detail && <Dialog title={detail.source === 'sample' ? '샘플 연습 기록' : '나의 연습 기록'} onClose={() => setDetail(null)}><span className="detail-date">{dateLabel(detail.completedAt)}</span><h3 className="detail-question" lang="en">{detail.question}</h3><div className="my-answer"><span>남긴 답변</span><p lang="en">{detail.transcript || '목소리로 연습했어요. 원본 녹음은 보관하지 않아요.'}</p></div>{detail.feedback && <div className="detail-feedback"><span className="small-badge badge-peach">샘플 교정 예시</span><p lang="en">{detail.feedback.grammar.corrected}</p><span>{detail.feedback.grammar.explanation}</span></div>}<p className="detail-privacy">원본 녹음은 저장하지 않아요. 이 기록은 자동 AI 평가 결과가 아니에요.</p></Dialog>}
  </div>;
}

function EmptyState({ icon, title, description, action, onAction }: { icon: ReactNode; title: string; description: string; action: string; onAction: () => void }) {
  return <div className="empty-state"><span className="empty-icon">{icon}</span><h2>{title}</h2><p>{description}</p><button className="button-primary" onClick={onAction}>{action}<ArrowRight size={17} /></button></div>;
}
