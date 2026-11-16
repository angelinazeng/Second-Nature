import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react'
import GuideScreen, { ShareStatus } from './components/GuideScreen'
import Icon from './components/Icon'
import ItemDrawing from './components/ItemDrawing'
import SharedGuideView from './components/SharedGuideView'
import StoryCard from './components/StoryCard'
import { catalog, ScanKey } from './data/catalog'
import {
  fetchStories,
  GuideEntry,
  guideLink,
  markHelpful,
  photoToDataUrl,
  postReply,
  postStory,
  publishGuide,
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
const initialSharedGuide = new URLSearchParams(window.location.search).get('guide')

function App() {
  const [tab, setTab] = useState<Tab>(initialSharedGuide ? 'shared' : 'snap')
  const [sharedGuideId, setSharedGuideId] = useState(initialSharedGuide ?? '')
  const [returnTab, setReturnTab] = useState<Tab>('snap')
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [scanItem, setScanItem] = useState<ScanKey>('cardboard')
  const [confidence, setConfidence] = useState(0)
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
  const [questionItemTag, setQuestionItemTag] = useState('Mixed material')
  const [questionCityTag, setQuestionCityTag] = useState('Portland')
  const [helpful, setHelpful] = useState(false)
  const [stories, setStories] = useState<Story[]>([])
  const [feedState, setFeedState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [feedFilter, setFeedFilter] = useState<'all' | 'tip'>('all')
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

  useEffect(() => {
    return () => {
      if (photo) URL.revokeObjectURL(photo)
    }
  }, [photo])

  const loadStories = useCallback(() => {
    setFeedState('loading')
    fetchStories()
      .then((data) => {
        setStories(data)
        setFeedState('ready')
      })
      .catch(() => setFeedState('error'))
  }, [])

  useEffect(() => {
    if (tab === 'community' && communityView === 'feed') loadStories()
  }, [tab, communityView, loadStories])

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
    setPhoto(URL.createObjectURL(file))
    setScanError('')
    setScanState('scanning')
    try {
      const body = new FormData()
      body.append('image', file)
      const response = await fetch('/api/classify', { body, method: 'POST' })
      if (response.status === 503) {
        setScanError("The photo model isn't trained yet. Run backend/ml/train.py (see README), then try again.")
        setScanState('idle')
        return
      }
      if (!response.ok) throw new Error('classify failed')
      const data: { confident: boolean; label: ScanKey; confidence: number } = await response.json()
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

  function openAsk() {
    setTab('community')
    setCommunityView('ask')
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
  const visibleStories = feedFilter === 'tip' ? stories.filter((story) => story.kind === 'tip') : stories
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
              <h2>We’re not totally sure.</h2>
              <p>Our best guess is {catalog[scanItem].name.toLowerCase()} ({Math.round(confidence * 100)}% sure), which isn’t enough to sort it with confidence. A neighbor or waste expert may know best.</p>
              <div className="possible-tags"><span>{catalog[scanItem].name}</span></div>
              <button className="primary-action" onClick={openAsk} type="button">
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
                <button onClick={() => setCommunityView('ask')} type="button">
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
                  <button className={feedFilter === 'tip' ? 'active' : ''} onClick={() => setFeedFilter('tip')} type="button">Tips</button>
                </div>
              </div>
              {feedState === 'loading' && stories.length === 0 && <p className="loading-note">Loading posts…</p>}
              {feedState === 'error' && (
                <p className="scan-error" role="alert">
                  We couldn’t reach the community right now. Make sure the app server is running.{' '}
                  <button className="link-button" onClick={loadStories} type="button">Try again</button>
                </p>
              )}
              {feedState === 'ready' && visibleStories.length === 0 && (
                <p className="loading-note">{feedFilter === 'tip' ? 'No tips yet. Open an item in My Guide and tap “Teach others”.' : 'No posts yet. Be the first to share.'}</p>
              )}
              {visibleStories.map((story) => (
                <StoryCard
                  key={story.id}
                  liked={likedIds.includes(story.id)}
                  onOpenGuide={openSharedGuide}
                  onReply={(text) => reply(story.id, text)}
                  onToggleHelpful={() => toggleHelpful(story.id)}
                  own={ownStoryIds.includes(story.id)}
                  story={story}
                />
              ))}
            </>
          )}

          {communityView === 'ask' && (
            <section className="composer-screen">
              <button className="text-back" onClick={() => setCommunityView('feed')} type="button"><Icon name="back" size={18} /> Community</button>
              <span className="mini-kicker">Ask your neighbors</span>
              <h1>What should we know?</h1>
              <div className="question-photo"><ItemDrawing item="mystery" /><button type="button"><Icon name="camera" size={17} /> Change photo</button></div>
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
                <legend>Item tag</legend>
                <div className="choice-row">
                  {['Mixed material', 'Packaging', 'Not sure'].map((tag) => (
                    <button className={questionItemTag === tag ? 'selected' : ''} key={tag} onClick={() => setQuestionItemTag(tag)} type="button">{tag}</button>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend>City tag</legend>
                <div className="choice-row">
                  {['Portland', 'Beaverton', 'Gresham'].map((tag) => (
                    <button className={questionCityTag === tag ? 'selected' : ''} key={tag} onClick={() => setQuestionCityTag(tag)} type="button">{tag}</button>
                  ))}
                </div>
              </fieldset>
              <button className="primary-action" onClick={() => setCommunityView('question')} type="button">
                Post question <Icon name="send" size={18} />
              </button>
            </section>
          )}

          {communityView === 'question' && (
            <section className="question-thread">
              <button className="text-back" onClick={() => setCommunityView('feed')} type="button"><Icon name="back" size={18} /> Community</button>
              <div className="posted-badge"><Icon name="check" size={15} /> Question posted</div>
              <div className="post-author"><span className="avatar">AR</span><div><strong>You</strong><small>Just now · {questionCityTag}</small></div></div>
              <h1>Where should this package go?</h1>
              <p>{questionDetails || 'It feels like paper on the outside but has a shiny lining inside. There is no recycling symbol.'}</p>
              <div className="possible-tags"><span>{questionItemTag}</span><span>{questionCityTag}</span></div>
              <div className="reply-count">1 expert reply</div>
              <article className="reply-card">
                <div className="post-author"><span className="avatar expert">MK</span><div><strong>Maya K. <i>Expert</i></strong><small>Portland waste educator · 3m</small></div></div>
                <p>The shiny lining makes this a mixed-material pouch. In Portland, it belongs in the trash—not curbside recycling.</p>
                <div className="reply-answer"><Icon name="check" size={17} /><span>Best answer: <strong>Trash bin</strong></span></div>
                <div className="reply-actions">
                  <button className={helpful ? 'active' : ''} onClick={() => setHelpful(!helpful)} type="button"><Icon name="heart" size={17} /> {helpful ? 'Helpful' : 'Mark helpful'}</button>
                  <button
                    className={isSaved('trash') ? 'active' : ''}
                    onClick={() => addEntry('trash', 'community', 'Paper pouches with a shiny lining go in the trash, not recycling (Maya K., waste educator).')}
                    type="button"
                  >
                    <Icon name={isSaved('trash') ? 'check' : 'save'} size={17} /> {isSaved('trash') ? 'Saved to My Guide' : 'Save to My Guide'}
                  </button>
                </div>
              </article>
            </section>
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
