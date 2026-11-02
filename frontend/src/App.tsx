import { ChangeEvent, useEffect, useRef, useState } from 'react'
import GuideAttachment from './components/GuideAttachment'
import Icon from './components/Icon'
import ItemDrawing from './components/ItemDrawing'
import { catalog, ScanKey } from './data/catalog'

type Tab = 'snap' | 'community' | 'guide' | 'profile'
type ScanState = 'idle' | 'scanning' | 'resolved' | 'unsure'
type CommunityView = 'feed' | 'ask' | 'question' | 'story'

function App() {
  const [tab, setTab] = useState<Tab>('snap')
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [scanItem, setScanItem] = useState<ScanKey>('pizza')
  const [photo, setPhoto] = useState('')
  const [city, setCity] = useState('Portland, OR')
  const [household, setHousehold] = useState('The Rivera household')
  const [profileSaved, setProfileSaved] = useState(false)
  const [savedItems, setSavedItems] = useState<ScanKey[]>([])
  const [personalNote, setPersonalNote] = useState('')
  const [grouped, setGrouped] = useState(false)
  const [showGaps, setShowGaps] = useState(false)
  const [shared, setShared] = useState(false)
  const [communityView, setCommunityView] = useState<CommunityView>('feed')
  const [questionDetails, setQuestionDetails] = useState('')
  const [questionItemTag, setQuestionItemTag] = useState('Mixed material')
  const [questionCityTag, setQuestionCityTag] = useState('Portland')
  const [helpful, setHelpful] = useState(false)
  const [replySaved, setReplySaved] = useState(false)
  const [storyCaption, setStoryCaption] = useState('')
  const [storyPhoto, setStoryPhoto] = useState('')
  const [guideAttached, setGuideAttached] = useState(false)
  const [storyPublished, setStoryPublished] = useState(false)
  const [comment, setComment] = useState('')
  const [comments, setComments] = useState<string[]>([])
  const scanInput = useRef<HTMLInputElement>(null)
  const storyInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => {
      if (photo) URL.revokeObjectURL(photo)
    }
  }, [photo])

  useEffect(() => {
    return () => {
      if (storyPhoto) URL.revokeObjectURL(storyPhoto)
    }
  }, [storyPhoto])

  const result = catalog[scanItem]

  function goTo(next: Tab) {
    setTab(next)
    if (next === 'community') setCommunityView('feed')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function startScan(item: ScanKey | 'mystery') {
    setPhoto('')
    setScanState('scanning')
    window.setTimeout(() => {
      if (item === 'mystery') setScanState('unsure')
      else {
        setScanItem(item)
        setScanState('resolved')
      }
    }, 900)
  }

  function uploadScan(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (photo) URL.revokeObjectURL(photo)
    setPhoto(URL.createObjectURL(file))
    setScanState('scanning')
    window.setTimeout(() => setScanState('resolved'), 900)
  }

  function saveCurrentItem() {
    setSavedItems((current) => current.includes(scanItem) ? current : [...current, scanItem])
  }

  function openAsk() {
    setTab('community')
    setCommunityView('ask')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function shareGuide() {
    navigator.clipboard?.writeText('https://snapsort.local/guide/rivera')
    setShared(true)
    window.setTimeout(() => setShared(false), 2200)
  }

  function uploadStoryPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (storyPhoto) URL.revokeObjectURL(storyPhoto)
    setStoryPhoto(URL.createObjectURL(file))
  }

  function publishComment() {
    if (!comment.trim()) return
    setComments((current) => [...current, comment.trim()])
    setComment('')
  }

  const headerTitle = tab === 'snap' ? 'Snap & Sort' : tab === 'guide' ? 'My Guide' : tab === 'profile' ? 'Profile' : 'Community'

  return (
    <main className="phone-app">
      <header className="app-header">
        <button
          aria-label="Go back"
          className={`icon-button ${tab === 'snap' ? 'brand-button' : ''}`}
          onClick={() => goTo('snap')}
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
              {scanState === 'idle' && <span className="camera-hint">Center the item in the frame</span>}
              {scanState === 'scanning' && <span className="camera-hint">Checking local rules…</span>}
            </div>
            <input accept="image/*" capture="environment" onChange={uploadScan} ref={scanInput} type="file" />
            <button className="primary-action snap-action" onClick={() => scanInput.current?.click()} type="button">
              <Icon name="camera" size={21} />
              {scanState === 'idle' ? 'Snap or choose a photo' : 'Photograph another item'}
            </button>
            <div className="demo-items">
              <span>Try a sample</span>
              <button onClick={() => startScan('pizza')} type="button">Pizza box</button>
              <button onClick={() => startScan('bag')} type="button">Plastic bag</button>
              <button onClick={() => startScan('cup')} type="button">Coffee cup</button>
              <button onClick={() => startScan('mystery')} type="button">Tricky item</button>
            </div>
          </section>

          {scanState === 'resolved' && (
            <section className="answer-card" aria-live="polite">
              <div className="answer-status"><Icon name="check" size={16} /> Confident match</div>
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
                className={savedItems.includes(scanItem) ? 'secondary-action saved' : 'secondary-action'}
                onClick={saveCurrentItem}
                type="button"
              >
                <Icon name={savedItems.includes(scanItem) ? 'check' : 'save'} size={18} />
                {savedItems.includes(scanItem) ? 'Saved to My Guide' : 'Save to My Guide'}
              </button>
            </section>
          )}

          {scanState === 'unsure' && (
            <section className="answer-card unsure-card" aria-live="polite">
              <span className="unsure-mark">?</span>
              <h2>We’re not totally sure.</h2>
              <p>This looks like a mixed-material package. Local rules can vary, so a neighbor or waste expert may know best.</p>
              <div className="possible-tags"><span>Mixed material</span><span>Packaging</span></div>
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
                <button aria-label="Start a story" className="square-action" onClick={() => setCommunityView('story')} type="button"><Icon name="plus" /></button>
              </section>
              <div className="community-actions">
                <button onClick={() => setCommunityView('ask')} type="button">
                  <span><Icon name="community" /></span>
                  <div><strong>Ask a sorting question</strong><small>Get help with a tricky item</small></div>
                  <Icon name="chevron" size={17} />
                </button>
                <button onClick={() => setCommunityView('story')} type="button">
                  <span><Icon name="spark" /></span>
                  <div><strong>Share a story</strong><small>Pass a useful habit along</small></div>
                  <Icon name="chevron" size={17} />
                </button>
              </div>

              <div className="feed-label"><span>From your neighborhood</span><button type="button">Latest</button></div>
              {storyPublished && (
                <article className="story-card own-story">
                  <div className="post-author"><span className="avatar">AR</span><div><strong>You</strong><small>Just now · {city}</small></div></div>
                  {storyPhoto && <img alt="Shared sustainable practice" className="story-photo" src={storyPhoto} />}
                  <p>{storyCaption || 'A small change our household is keeping.'}</p>
                  {guideAttached && <GuideAttachment city={city} count={savedItems.length} household={household} />}
                  <div className="story-stats"><span><Icon name="heart" size={16} /> 1 helpful</span><span>{comments.length} {comments.length === 1 ? 'reply' : 'replies'}</span></div>
                  {comments.map((text, index) => (
                    <div className="comment" key={`${text}-${index}`}><span>AR</span><p><strong>You</strong>{text}</p></div>
                  ))}
                  <div className="comment-box">
                    <input onChange={(event) => setComment(event.target.value)} placeholder="Reply to a comment…" value={comment} />
                    <button aria-label="Post reply" onClick={publishComment} type="button"><Icon name="send" size={17} /></button>
                  </div>
                </article>
              )}
              <article className="story-card">
                <div className="post-author"><span className="avatar expert">MK</span><div><strong>Maya K.</strong><small>Waste educator · 2h</small></div></div>
                <p>I made a five-minute “sorting shelf” by our back door. Now everyone knows where batteries and soft plastics wait for drop-off.</p>
                <div className="paper-illustration"><Icon name="recycle" size={38} /><span>One shelf.<br />No guesswork.</span></div>
                <div className="story-stats"><span><Icon name="heart" size={16} /> 34 helpful</span><span>8 replies</span></div>
              </article>
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
                    className={replySaved ? 'active' : ''}
                    onClick={() => {
                      setReplySaved(true)
                      setSavedItems((current) => current.includes('cup') ? current : [...current, 'cup'])
                    }}
                    type="button"
                  >
                    <Icon name={replySaved ? 'check' : 'save'} size={17} /> {replySaved ? 'Saved to item' : 'Save to item'}
                  </button>
                </div>
              </article>
            </section>
          )}

          {communityView === 'story' && (
            <section className="composer-screen">
              <button className="text-back" onClick={() => setCommunityView('feed')} type="button"><Icon name="back" size={18} /> Community</button>
              <span className="mini-kicker">Share what worked</span>
              <h1>Start a story</h1>
              <input accept="image/*" onChange={uploadStoryPhoto} ref={storyInput} type="file" />
              <button className={`story-photo-picker ${storyPhoto ? 'has-photo' : ''}`} onClick={() => storyInput.current?.click()} type="button">
                {storyPhoto ? <img alt="Story upload preview" src={storyPhoto} /> : <><Icon name="camera" size={28} /><span>Add a photo</span></>}
              </button>
              <label>
                Caption
                <textarea onChange={(event) => setStoryCaption(event.target.value)} placeholder="What did your household learn?" rows={4} value={storyCaption} />
              </label>
              <button className={`attach-guide ${guideAttached ? 'attached' : ''}`} onClick={() => setGuideAttached(!guideAttached)} type="button">
                <Icon name={guideAttached ? 'check' : 'guide'} />
                <div><strong>{guideAttached ? 'Guide attached' : 'Attach My Guide'}</strong><small>{savedItems.length} saved items · {household}</small></div>
                {!guideAttached && <Icon name="plus" size={18} />}
              </button>
              <button
                className="primary-action"
                onClick={() => {
                  setStoryPublished(true)
                  setCommunityView('feed')
                }}
                type="button"
              >
                Publish story <Icon name="send" size={18} />
              </button>
            </section>
          )}
        </div>
      )}

      {tab === 'guide' && (
        <div className="app-screen guide-screen">
          <section className="screen-heading">
            <div><span className="mini-kicker">{household}</span><h1>My Guide</h1></div>
            <button aria-label="Share guide" className="square-action" onClick={shareGuide} type="button"><Icon name={shared ? 'check' : 'share'} /></button>
          </section>
          {shared && <div className="toast"><Icon name="check" size={16} /> Family guide link copied</div>}
          <div className="guide-summary">
            <div><strong>{savedItems.length}</strong><span>items saved</span></div>
            <div><strong>{new Set(savedItems.map((item) => catalog[item].bin)).size}</strong><span>bin types</span></div>
            <div><strong>{city.split(',')[0]}</strong><span>local rules</span></div>
          </div>
          <div className="guide-toolbar">
            <button className={grouped ? 'active' : ''} onClick={() => setGrouped(!grouped)} type="button"><Icon name="guide" size={16} /> {grouped ? 'Grouped by bin' : 'Group by bin'}</button>
            <button onClick={() => setShowGaps(!showGaps)} type="button"><Icon name="spark" size={16} /> Review gaps</button>
          </div>
          {showGaps && (
            <div className="gap-card">
              <Icon name="spark" />
              <div><strong>Your everyday basics are covered.</strong><p>Add batteries or paint next to cover hazardous drop-offs.</p></div>
              <button onClick={() => goTo('snap')} type="button">Scan one</button>
            </div>
          )}
          {savedItems.length === 0 ? (
            <div className="empty-guide">
              <span><Icon name="guide" size={36} /></span>
              <h2>Build your household guide</h2>
              <p>Save answers after you scan. They’ll stay organized here for everyone at home.</p>
              <button className="primary-action" onClick={() => goTo('snap')} type="button"><Icon name="camera" size={18} /> Scan your first item</button>
            </div>
          ) : (
            <div className="saved-list">
              {grouped && <div className="list-heading">Sorted by local bin type</div>}
              {savedItems
                .slice()
                .sort((a, b) => grouped ? catalog[a].bin.localeCompare(catalog[b].bin) : 0)
                .map((item) => (
                  <article className="saved-item" key={item}>
                    <span className={`item-thumb ${catalog[item].color}`}><ItemDrawing item={item} /></span>
                    <div><strong>{catalog[item].name}</strong><small>{catalog[item].bin}</small></div>
                    <Icon name="chevron" size={17} />
                  </article>
                ))}
            </div>
          )}
          <label className="personal-note">
            <span>Our household “why”</span>
            <textarea
              onChange={(event) => setPersonalNote(event.target.value)}
              placeholder="Why does sorting well matter to your family?"
              rows={3}
              value={personalNote}
            />
            <small>{personalNote ? 'Saved to your family guide' : 'Add a note everyone at home can see.'}</small>
          </label>
          <button className="share-guide-button" onClick={shareGuide} type="button"><Icon name="share" size={18} /> {shared ? 'Link copied' : 'Share guide with family'}</button>
        </div>
      )}

      {tab === 'profile' && (
        <div className="app-screen profile-screen">
          <section className="profile-intro">
            <span className="large-avatar">AR</span>
            <h1>Alex Rivera</h1>
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
            <div><small>Your household impact</small><strong>{savedItems.length + 12} items sorted with confidence</strong></div>
          </section>
        </div>
      )}

      <nav className="bottom-nav" aria-label="App navigation">
        <button className={tab === 'snap' ? 'active' : ''} onClick={() => goTo('snap')} type="button"><Icon name="camera" size={21} /><span>Snap</span></button>
        <button className={tab === 'community' ? 'active' : ''} onClick={() => goTo('community')} type="button"><Icon name="community" size={21} /><span>Community</span></button>
        <button className={tab === 'guide' ? 'active' : ''} onClick={() => goTo('guide')} type="button"><Icon name="guide" size={21} /><span>My Guide</span></button>
        <button className={tab === 'profile' ? 'active' : ''} onClick={() => goTo('profile')} type="button"><Icon name="profile" size={21} /><span>Profile</span></button>
      </nav>
    </main>
  )
}

export default App
