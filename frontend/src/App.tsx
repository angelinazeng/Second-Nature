import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react'
import GuideScreen, { ShareStatus } from './components/GuideScreen'
import Icon from './components/Icon'
import ItemDrawing from './components/ItemDrawing'
import QuestionCard from './components/QuestionCard'
import QuestionThread from './components/QuestionThread'
import SharedGuideView from './components/SharedGuideView'
import StoryCard from './components/StoryCard'
import { catalog, ScanKey } from './data/catalog'
import {
  fetchQuestions,
  fetchStories,
  GuideEntry,
  guideLink,
  markHelpful,
  photoToDataUrl,
  postQuestion,
  postReply,
  postStory,
  publishGuide,
  Question,
  SharedGuide,
  Story,
} from './lib/api'
import { usePersistentState } from './lib/usePersistentState'

type Tab = 'snap' | 'community' | 'guide' | 'profile' | 'shared'
type ScanState = 'idle' | 'scanning' | 'resolved' | 'unsure'
type CommunityView = 'feed' | 'ask' | 'question' | 'story'
type StoryKind = Story['kind']

const USER_NAME = 'Alex Rivera'
const allKeys = Object.keys(catalog) as ScanKey[]
const nearbyCities = ['Portland', 'Beaverton', 'Gresham']
const initialSharedGuide = new URLSearchParams(window.location.search).get('guide')

function App() {
  const [tab, setTab] = useState<Tab>(initialSharedGuide ? 'shared' : 'snap')
  const [sharedGuideId, setSharedGuideId] = useState(initialSharedGuide ?? '')
  const [returnTab, setReturnTab] = useState<Tab>('snap')
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [scanItem, setScanItem] = useState<ScanKey>('cardboard')
  const [confidence, setConfidence] = useState(0)
  // False when the server couldn't classify the photo at all (no model, unreadable image).
  const [hasGuess, setHasGuess] = useState(true)
  const [scanError, setScanError] = useState('')
  const [photo, setPhoto] = useState('')
  const [city, setCity] = usePersistentState('sn.city', 'Portland, OR')
  const [household, setHousehold] = usePersistentState('sn.household', 'The Rivera household')
  const [profileSaved, setProfileSaved] = useState(false)
  const [entries, setEntries] = usePersistentState<GuideEntry[]>('sn.guide.entries', [])
  const [personalNote, setPersonalNote] = usePersistentState('sn.guide.note', '')
  const [shareId, setShareId] = usePersistentState('sn.guide.shareId', '')
  const [shareStatus, setShareStatus] = useState<ShareStatus>('idle')
  const [communityView, setCommunityView] = useState<CommunityView>('feed')
  const [questionDetails, setQuestionDetails] = useState('')
  const [questionGuess, setQuestionGuess] = useState<ScanKey | null>(null)
  const [questionFromScan, setQuestionFromScan] = useState(false)
  const [questionPhoto, setQuestionPhoto] = useState('')
  const [questionCityTag, setQuestionCityTag] = useState(city.split(',')[0])
  const [asking, setAsking] = useState(false)
  const [askError, setAskError] = useState('')
  const [questions, setQuestions] = useState<Question[]>([])
  const [ownQuestionIds, setOwnQuestionIds] = usePersistentState<number[]>('sn.ownQuestions', [])
  const [likedReplyIds, setLikedReplyIds] = usePersistentState<number[]>('sn.likedReplies', [])
  const [openQuestionId, setOpenQuestionId] = useState<number | null>(null)
  const [justPosted, setJustPosted] = useState(false)
  const [stories, setStories] = useState<Story[]>([])
  const [feedState, setFeedState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [feedFilter, setFeedFilter] = useState<'all' | 'question' | 'tip'>('all')
  const [likedIds, setLikedIds] = usePersistentState<number[]>('sn.liked', [])
  const [ownStoryIds, setOwnStoryIds] = usePersistentState<number[]>('sn.ownStories', [])
  const [storyKind, setStoryKind] = useState<StoryKind>('story')
  const [tipItem, setTipItem] = useState<ScanKey | null>(null)
  const [storyCaption, setStoryCaption] = useState('')
  const [storyPhoto, setStoryPhoto] = useState('')
  const [guideAttached, setGuideAttached] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [publishError, setPublishError] = useState('')
  const scanInput = useRef<HTMLInputElement>(null)
  const storyInput = useRef<HTMLInputElement>(null)
  const questionInput = useRef<HTMLInputElement>(null)
  const lastScanFile = useRef<File | null>(null)

  useEffect(() => {
    return () => {
      if (photo) URL.revokeObjectURL(photo)
    }
  }, [photo])

  const loadFeed = useCallback(() => {
    setFeedState('loading')
    Promise.all([fetchStories(), fetchQuestions()])
      .then(([storyData, questionData]) => {
        setStories(storyData)
        setQuestions(questionData)
        setFeedState('ready')
      })
      .catch(() => setFeedState('error'))
  }, [])

  useEffect(() => {
    if (tab === 'community' && communityView === 'feed') loadFeed()
  }, [tab, communityView, loadFeed])

  const result = catalog[scanItem]

  const isSaved = (key: ScanKey) => entries.some((entry) => entry.key === key)

  function goTo(next: Tab) {
    setTab(next)
    if (next === 'community') setCommunityView('feed')
    if (window.location.search) window.history.replaceState(null, '', window.location.pathname)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function openSharedGuide(id: string) {
    setReturnTab(tab)
    setSharedGuideId(id)
    setTab('shared')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function addEntry(key: ScanKey, source: GuideEntry['source'], tip = '') {
    setEntries((current) => current.some((entry) => entry.key === key)
      ? current.map((entry) => entry.key === key && tip && !entry.tip ? { ...entry, tip } : entry)
      : [...current, { key, tip, savedAt: Date.now(), source }])
  }

  function adoptGuide(guide: SharedGuide) {
    for (const item of guide.items) addEntry(item.key, 'shared', item.tip)
  }

  async function uploadScan(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (photo) URL.revokeObjectURL(photo)
    lastScanFile.current = file
    setPhoto(URL.createObjectURL(file))
    setScanError('')
    setScanState('scanning')
    try {
      const body = new FormData()
      body.append('image', file)
      const response = await fetch('/api/classify', { body, method: 'POST' })
      if (!response.ok) {
        // The server answered but couldn't identify the item, so hand it to the community (Task 2).
        setHasGuess(false)
        setConfidence(0)
        setScanState('unsure')
        return
      }
      const data: { confident: boolean; label: ScanKey; confidence: number } = await response.json()
      setHasGuess(true)
      setScanItem(data.label)
      setConfidence(data.confidence)
      setScanState(data.confident ? 'resolved' : 'unsure')
    } catch {
      setScanError("We couldn't check that photo. Make sure the app server is running, then try again.")
      setScanState('idle')
    }
  }

  function saveCurrentItem() {
    addEntry(scanItem, 'scan')
  }

  /** Opens the question form. From an unsure scan, the scan photo and best guess come along. */
  async function openAsk(fromScan: boolean) {
    setQuestionDetails('')
    setQuestionGuess(fromScan && hasGuess ? scanItem : null)
    setQuestionFromScan(fromScan)
    setQuestionPhoto('')
    setQuestionCityTag(city.split(',')[0])
    setAskError('')
    setTab('community')
    setCommunityView('ask')
    window.scrollTo({ top: 0, behavior: 'smooth' })
    if (fromScan && lastScanFile.current) {
      setQuestionPhoto(await photoToDataUrl(lastScanFile.current).catch(() => ''))
    }
  }

  async function chooseQuestionPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      setQuestionPhoto(await photoToDataUrl(file))
    } catch {
      setAskError("That photo couldn't be read. Try a JPEG or PNG.")
    }
  }

  function openQuestion(id: number, posted = false) {
    setOpenQuestionId(id)
    setJustPosted(posted)
    setTab('community')
    setCommunityView('question')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function submitQuestion() {
    if (!questionDetails.trim()) return setAskError('Describe the item so neighbors can help, like what it’s made of or any labels.')
    setAsking(true)
    setAskError('')
    try {
      const question = await postQuestion({
        author: USER_NAME,
        city: questionCityTag,
        details: questionDetails.trim(),
        guess: questionGuess ?? undefined,
        photo: questionPhoto || undefined,
      })
      setOwnQuestionIds((current) => [...current, question.id])
      setQuestions((current) => [question, ...current])
      openQuestion(question.id, true)
    } catch {
      setAskError("Couldn't post your question. Make sure the app server is running, then try again.")
    } finally {
      setAsking(false)
    }
  }

  /** Publishes (or updates) the guide on the server so the link always shows the latest version. */
  async function syncGuide() {
    const guide = await publishGuide({ id: shareId || undefined, household, city, note: personalNote, entries })
    setShareId(guide.id)
    return guide
  }

  async function shareGuide() {
    setShareStatus('sharing')
    try {
      const guide = await syncGuide()
      await navigator.clipboard?.writeText(guideLink(guide.id)).catch(() => undefined)
      setShareStatus('copied')
      window.setTimeout(() => setShareStatus('idle'), 2400)
    } catch {
      setShareStatus('error')
      window.setTimeout(() => setShareStatus('idle'), 4000)
    }
  }

  function openComposer(kind: StoryKind, key: ScanKey | null = null, caption = '') {
    setStoryKind(kind)
    setTipItem(key)
    setStoryCaption(caption)
    setStoryPhoto('')
    setGuideAttached(false)
    setPublishError('')
    setTab('community')
    setCommunityView('story')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function uploadStoryPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      setStoryPhoto(await photoToDataUrl(file))
    } catch {
      setPublishError("That photo couldn't be read. Try a JPEG or PNG.")
    }
  }

  async function publishStory() {
    if (!storyCaption.trim()) return setPublishError(storyKind === 'tip' ? 'Write the tip you want to pass on.' : 'Add a caption so neighbors know what worked.')
    if (storyKind === 'tip' && !tipItem) return setPublishError('Pick which item this tip is about.')
    setPublishing(true)
    setPublishError('')
    try {
      const guideId = guideAttached ? (await syncGuide()).id : undefined
      const story = await postStory({
        kind: storyKind,
        author: USER_NAME,
        city,
        caption: storyCaption.trim(),
        item_key: storyKind === 'tip' ? tipItem ?? undefined : undefined,
        guide_id: guideId,
        photo: storyPhoto || undefined,
      })
      setOwnStoryIds((current) => [...current, story.id])
      setStories((current) => [story, ...current])
      setCommunityView('feed')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      setPublishError("Couldn't publish. Make sure the app server is running, then try again.")
    } finally {
      setPublishing(false)
    }
  }

  const replaceStory = (story: Story) => setStories((current) => current.map((s) => (s.id === story.id ? story : s)))

  async function toggleHelpful(id: number) {
    const liked = likedIds.includes(id)
    try {
      replaceStory(await markHelpful(id, liked ? -1 : 1))
      setLikedIds((current) => liked ? current.filter((x) => x !== id) : [...current, id])
    } catch {
      setFeedState('error')
    }
  }

  async function reply(id: number, text: string) {
    replaceStory(await postReply(id, USER_NAME, text))
  }

  const headerTitle = { snap: 'Snap & Sort', guide: 'My Guide', profile: 'Profile', community: 'Community', shared: 'Shared Guide' }[tab]
  const feed: ({ type: 'story'; item: Story } | { type: 'question'; item: Question })[] = [
    ...(feedFilter === 'tip' ? [] : questions.map((item) => ({ type: 'question' as const, item }))),
    ...(feedFilter === 'question' ? [] : stories.filter((story) => feedFilter !== 'tip' || story.kind === 'tip').map((item) => ({ type: 'story' as const, item }))),
  ].sort((a, b) => b.item.created_at - a.item.created_at)
  const emptyFeedNote = {
    all: 'No posts yet. Be the first to share.',
    question: 'No questions yet. When a scan isn’t sure, tap “Ask the community”.',
    tip: 'No tips yet. Open an item in My Guide and tap “Teach others”.',
  }[feedFilter]
  const guideItems = entries.map((entry) => entry.key)

  return (
    <main className="phone-app">
      <header className="app-header">
        <button
          aria-label="Go back"
          className={`icon-button ${tab === 'snap' ? 'brand-button' : ''}`}
          onClick={() => goTo(tab === 'shared' ? returnTab : 'snap')}
          type="button"
        >
          {tab === 'snap' ? <Icon name="leaf" size={21} /> : <Icon name="back" size={22} />}
        </button>
        <strong>{headerTitle}</strong>
        <button aria-label="Open profile" className="avatar-button" onClick={() => goTo('profile')} type="button">AR</button>
      </header>

      {tab === 'snap' && (
        <div className="app-screen snap-screen">
          <section className="welcome-block">
            <span className="mini-kicker">Hello, Alex</span>
            <h1>Where does it go?</h1>
            <p>Snap an item for a clear answer based on {city} rules.</p>
          </section>

          <section className="capture-card">
            <div className={`camera-window ${scanState === 'scanning' ? 'is-scanning' : ''}`}>
              {photo ? <img alt="Item to identify" src={photo} /> : <ItemDrawing item={scanState === 'unsure' ? 'mystery' : scanItem} />}
              <i className="frame-corner frame-a" />
              <i className="frame-corner frame-b" />
              <i className="frame-corner frame-c" />
              <i className="frame-corner frame-d" />
              {scanState === 'scanning' && <span className="scanner-beam" />}
              {scanState === 'idle' && !photo && <span className="camera-hint">Center the item in the frame</span>}
              {scanState === 'scanning' && <span className="camera-hint">Checking local rules…</span>}
            </div>
            {scanError && <p className="scan-error" role="alert">{scanError}</p>}
            <input accept="image/*" capture="environment" onChange={uploadScan} ref={scanInput} type="file" />
            <button className="primary-action snap-action" onClick={() => scanInput.current?.click()} type="button">
              <Icon name="camera" size={21} />
              {scanState === 'idle' && !photo ? 'Snap or choose a photo' : 'Photograph another item'}
            </button>
          </section>

          {scanState === 'resolved' && (
            <section className="answer-card" aria-live="polite">
              <div className="answer-status"><Icon name="check" size={16} /> Confident match · {Math.round(confidence * 100)}%</div>
              <p className="identified-item">{result.name}</p>
              <div className={`bin-result ${result.color}`}>
                <span><Icon name="recycle" size={27} /></span>
                <div><small>Put it in the</small><strong>{result.bin}</strong></div>
              </div>
              <div className="why-block">
                <div><Icon name="spark" size={18} /><strong>Why?</strong></div>
                <p>{result.why}</p>
              </div>
              <button
                className={isSaved(scanItem) ? 'secondary-action saved' : 'secondary-action'}
                onClick={saveCurrentItem}
                type="button"
              >
                <Icon name={isSaved(scanItem) ? 'check' : 'save'} size={18} />
                {isSaved(scanItem) ? 'Saved to My Guide' : 'Save to My Guide'}
              </button>
            </section>
          )}

          {scanState === 'unsure' && (
            <section className="answer-card unsure-card" aria-live="polite">
              <span className="unsure-mark">?</span>
              {hasGuess ? (
                <>
                  <h2>We’re not totally sure.</h2>
                  <p>Our best guess is {catalog[scanItem].name.toLowerCase()} ({Math.round(confidence * 100)}% sure), which isn’t enough to sort it with confidence. A neighbor or waste expert may know best.</p>
                  <div className="possible-tags"><span>{catalog[scanItem].name}</span></div>
                </>
              ) : (
                <>
                  <h2>We couldn’t identify this item.</h2>
                  <p>Local rules can vary, so a neighbor or waste expert may know best. Your photo will be attached to your question.</p>
                </>
              )}
              <button className="primary-action" onClick={() => openAsk(true)} type="button">
                <Icon name="community" size={19} /> Ask the community
              </button>
            </section>
          )}
        </div>
      )}

      {tab === 'community' && (
        <div className="app-screen community-screen">
          {communityView === 'feed' && (
            <>
              <section className="screen-heading">
                <div><span className="mini-kicker">Neighbors helping neighbors</span><h1>Community</h1></div>
                <button aria-label="Start a story" className="square-action" onClick={() => openComposer('story')} type="button"><Icon name="plus" /></button>
              </section>
              <div className="community-actions">
                <button onClick={() => openAsk(false)} type="button">
                  <span><Icon name="community" /></span>
                  <div><strong>Ask a sorting question</strong><small>Get help with a tricky item</small></div>
                  <Icon name="chevron" size={17} />
                </button>
                <button onClick={() => openComposer('story')} type="button">
                  <span><Icon name="spark" /></span>
                  <div><strong>Share a story or tip</strong><small>Pass a useful habit along</small></div>
                  <Icon name="chevron" size={17} />
                </button>
              </div>

              <div className="feed-label">
                <span>From your neighborhood</span>
                <div className="feed-filter" role="group" aria-label="Filter posts">
                  <button className={feedFilter === 'all' ? 'active' : ''} onClick={() => setFeedFilter('all')} type="button">All</button>
                  <button className={feedFilter === 'question' ? 'active' : ''} onClick={() => setFeedFilter('question')} type="button">Questions</button>
                  <button className={feedFilter === 'tip' ? 'active' : ''} onClick={() => setFeedFilter('tip')} type="button">Tips</button>
                </div>
              </div>
              {feedState === 'loading' && feed.length === 0 && <p className="loading-note">Loading posts…</p>}
              {feedState === 'error' && (
                <p className="scan-error" role="alert">
                  We couldn’t reach the community right now. Make sure the app server is running.{' '}
                  <button className="link-button" onClick={loadFeed} type="button">Try again</button>
                </p>
              )}
              {feedState === 'ready' && feed.length === 0 && <p className="loading-note">{emptyFeedNote}</p>}
              {feed.map((entry) => entry.type === 'question' ? (
                <QuestionCard
                  key={`q${entry.item.id}`}
                  onOpen={() => openQuestion(entry.item.id)}
                  own={ownQuestionIds.includes(entry.item.id)}
                  question={entry.item}
                />
              ) : (
                <StoryCard
                  key={`s${entry.item.id}`}
                  liked={likedIds.includes(entry.item.id)}
                  onOpenGuide={openSharedGuide}
                  onReply={(text) => reply(entry.item.id, text)}
                  onToggleHelpful={() => toggleHelpful(entry.item.id)}
                  own={ownStoryIds.includes(entry.item.id)}
                  story={entry.item}
                />
              ))}
            </>
          )}

          {communityView === 'ask' && (
            <section className="composer-screen">
              <button className="text-back" onClick={() => setCommunityView('feed')} type="button"><Icon name="back" size={18} /> Community</button>
              <span className="mini-kicker">Ask your neighbors</span>
              <h1>What should we know?</h1>
              <input accept="image/*" onChange={chooseQuestionPhoto} ref={questionInput} type="file" />
              <div className={`question-photo ${questionPhoto ? 'has-photo' : ''}`}>
                {questionPhoto ? <img alt="Item you're asking about" src={questionPhoto} /> : <ItemDrawing item="mystery" />}
                <button onClick={() => questionInput.current?.click()} type="button">
                  <Icon name="camera" size={17} /> {questionPhoto ? 'Change photo' : 'Add a photo'}
                </button>
              </div>
              {questionFromScan && questionPhoto && <small className="field-hint photo-hint">Your scan photo is attached so neighbors can see the item.</small>}
              <label>
                Details
                <textarea
                  onChange={(event) => setQuestionDetails(event.target.value)}
                  placeholder="What is it made of? Are there labels or symbols?"
                  rows={4}
                  value={questionDetails}
                />
              </label>
              <fieldset>
                <legend>What do you think it is?</legend>
                <div className="choice-row">
                  {allKeys.map((key) => (
                    <button className={questionGuess === key ? 'selected' : ''} key={key} onClick={() => setQuestionGuess(key)} type="button">{catalog[key].name}</button>
                  ))}
                  <button className={questionGuess === null ? 'selected' : ''} onClick={() => setQuestionGuess(null)} type="button">Not sure</button>
                </div>
                {questionFromScan && hasGuess && (
                  <small className="field-hint">Our scan’s best guess was {catalog[scanItem].name.toLowerCase()} ({Math.round(confidence * 100)}% sure).</small>
                )}
              </fieldset>
              <fieldset>
                <legend>City tag</legend>
                <div className="choice-row">
                  {[...new Set([city.split(',')[0], ...nearbyCities])].map((tag) => (
                    <button className={questionCityTag === tag ? 'selected' : ''} key={tag} onClick={() => setQuestionCityTag(tag)} type="button">{tag}</button>
                  ))}
                </div>
              </fieldset>
              {askError && <p className="scan-error" role="alert">{askError}</p>}
              <button className="primary-action" disabled={asking} onClick={submitQuestion} type="button">
                {asking ? 'Posting…' : 'Post question'} <Icon name="send" size={18} />
              </button>
            </section>
          )}

          {communityView === 'question' && openQuestionId !== null && (
            <QuestionThread
              justPosted={justPosted}
              likedReplyIds={likedReplyIds}
              onBack={() => setCommunityView('feed')}
              onLikedChange={setLikedReplyIds}
              onSaveToGuide={(key, tip) => addEntry(key, 'community', tip)}
              onViewGuide={() => goTo('guide')}
              own={ownQuestionIds.includes(openQuestionId)}
              questionId={openQuestionId}
              userName={USER_NAME}
            />
          )}

          {communityView === 'story' && (
            <section className="composer-screen">
              <button className="text-back" onClick={() => setCommunityView('feed')} type="button"><Icon name="back" size={18} /> Community</button>
              <span className="mini-kicker">Teach your neighbors</span>
              <h1>{storyKind === 'tip' ? 'Share a tip' : 'Start a story'}</h1>
              <fieldset>
                <legend>What are you sharing?</legend>
                <div className="choice-row">
                  <button className={storyKind === 'story' ? 'selected' : ''} onClick={() => setStoryKind('story')} type="button">A story</button>
                  <button className={storyKind === 'tip' ? 'selected' : ''} onClick={() => setStoryKind('tip')} type="button">An item tip</button>
                </div>
              </fieldset>
              {storyKind === 'tip' && (
                <fieldset>
                  <legend>Which item?</legend>
                  <div className="choice-row">
                    {(guideItems.length ? [...guideItems, ...allKeys.filter((key) => !guideItems.includes(key))] : allKeys).map((key) => (
                      <button className={tipItem === key ? 'selected' : ''} key={key} onClick={() => setTipItem(key)} type="button">{catalog[key].name}</button>
                    ))}
                  </div>
                  {tipItem && <small className="field-hint">Shows as: {catalog[tipItem].name} → {catalog[tipItem].bin}</small>}
                </fieldset>
              )}
              <input accept="image/*" onChange={uploadStoryPhoto} ref={storyInput} type="file" />
              <button className={`story-photo-picker ${storyPhoto ? 'has-photo' : ''}`} onClick={() => storyInput.current?.click()} type="button">
                {storyPhoto ? <img alt="Story upload preview" src={storyPhoto} /> : <><Icon name="camera" size={28} /><span>Add a photo (optional)</span></>}
              </button>
              <label>
                {storyKind === 'tip' ? 'Your tip' : 'Caption'}
                <textarea
                  onChange={(event) => setStoryCaption(event.target.value)}
                  placeholder={storyKind === 'tip' ? 'What should others know about sorting this?' : 'What did your household learn?'}
                  rows={4}
                  value={storyCaption}
                />
              </label>
              <button
                className={`attach-guide ${guideAttached ? 'attached' : ''}`}
                disabled={entries.length === 0}
                onClick={() => setGuideAttached(!guideAttached)}
                type="button"
              >
                <Icon name={guideAttached ? 'check' : 'guide'} />
                <div>
                  <strong>{guideAttached ? 'Guide attached' : 'Attach My Guide'}</strong>
                  <small>{entries.length ? `${entries.length} saved items · ${household}` : 'Save items to My Guide first'}</small>
                </div>
                {!guideAttached && entries.length > 0 && <Icon name="plus" size={18} />}
              </button>
              {publishError && <p className="scan-error" role="alert">{publishError}</p>}
              <button className="primary-action" disabled={publishing} onClick={publishStory} type="button">
                {publishing ? 'Publishing…' : storyKind === 'tip' ? 'Publish tip' : 'Publish story'} <Icon name="send" size={18} />
              </button>
            </section>
          )}
        </div>
      )}

      {tab === 'guide' && (
        <GuideScreen
          city={city}
          entries={entries}
          household={household}
          note={personalNote}
          onEntriesChange={setEntries}
          onNoteChange={setPersonalNote}
          onScan={() => goTo('snap')}
          onShare={shareGuide}
          onTeach={(key, tip) => openComposer('tip', key, tip)}
          shareStatus={shareStatus}
        />
      )}

      {tab === 'shared' && sharedGuideId && (
        <SharedGuideView guideId={sharedGuideId} onAdopt={adoptGuide} onBack={() => goTo(returnTab)} />
      )}

      {tab === 'profile' && (
        <div className="app-screen profile-screen">
          <section className="profile-intro">
            <span className="large-avatar">AR</span>
            <h1>{USER_NAME}</h1>
            <p>Making the everyday stuff easier to sort.</p>
          </section>
          {profileSaved && <div className="toast"><Icon name="check" size={16} /> Profile updated</div>}
          <section className="settings-card">
            <h2>Sorting preferences</h2>
            <label>
              <span><Icon name="location" size={18} /> City</span>
              <input onChange={(event) => setCity(event.target.value)} value={city} />
              <small>Your results use this city’s local rules.</small>
            </label>
            <label>
              <span><Icon name="community" size={18} /> Household name</span>
              <input onChange={(event) => setHousehold(event.target.value)} value={household} />
              <small>This appears on your shared guide.</small>
            </label>
            <button className="primary-action" onClick={() => setProfileSaved(true)} type="button">Save profile</button>
          </section>
          <section className="impact-panel">
            <span><Icon name="leaf" size={22} /></span>
            <div><small>Your household impact</small><strong>{entries.length} {entries.length === 1 ? 'item' : 'items'} in your household guide</strong></div>
          </section>
        </div>
      )}

      <nav className="bottom-nav" aria-label="App navigation">
        <button className={tab === 'snap' ? 'active' : ''} onClick={() => goTo('snap')} type="button"><Icon name="camera" size={21} /><span>Snap</span></button>
        <button className={tab === 'community' ? 'active' : ''} onClick={() => goTo('community')} type="button"><Icon name="community" size={21} /><span>Community</span></button>
        <button className={tab === 'guide' || tab === 'shared' ? 'active' : ''} onClick={() => goTo('guide')} type="button"><Icon name="guide" size={21} /><span>My Guide</span></button>
        <button className={tab === 'profile' ? 'active' : ''} onClick={() => goTo('profile')} type="button"><Icon name="profile" size={21} /><span>Profile</span></button>
      </nav>
    </main>
  )
}

export default App
