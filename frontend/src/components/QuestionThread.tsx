import { useEffect, useState } from 'react'
import { catalog, ScanKey } from '../data/catalog'
import {
  fetchQuestion,
  initials,
  markReplyHelpful,
  postQuestionReply,
  Question,
  QuestionReply,
  saveAnswer,
  timeAgo,
} from '../lib/api'
import Icon from './Icon'

type Props = {
  questionId: number
  own: boolean
  justPosted: boolean
  userName: string
  likedReplyIds: number[]
  onLikedChange: (ids: number[]) => void
  onSaveToGuide: (key: ScanKey, tip: string) => void
  onBack: () => void
  onViewGuide: () => void
}

type Sort = 'helpful' | 'newest'

/** Groups replies that suggest the same bin so the asker can compare answers at a glance. */
function compareByBin(replies: QuestionReply[]) {
  const groups = new Map<string, { bin: string; color: string; replies: number; helpful: number }>()
  for (const reply of replies) {
    if (!reply.answer_key) continue
    const { bin, color } = catalog[reply.answer_key]
    const group = groups.get(bin) ?? { bin, color, replies: 0, helpful: 0 }
    group.replies += 1
    group.helpful += reply.helpful
    groups.set(bin, group)
  }
  return [...groups.values()].sort((a, b) => b.helpful - a.helpful || b.replies - a.replies)
}

function QuestionThread({ questionId, own, justPosted, userName, likedReplyIds, onLikedChange, onSaveToGuide, onBack, onViewGuide }: Props) {
  const [question, setQuestion] = useState<Question | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [actionError, setActionError] = useState('')
  const [sort, setSort] = useState<Sort>('helpful')
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [savedNotice, setSavedNotice] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoadError(false)
    fetchQuestion(questionId)
      .then((data) => !cancelled && setQuestion(data))
      .catch(() => !cancelled && setLoadError(true))
    return () => {
      cancelled = true
    }
  }, [questionId])

  // Neighbor replies arrive a few seconds apart; poll until they're all in.
  const pending = question?.pending ?? 0
  useEffect(() => {
    if (!pending) return
    const timer = window.setInterval(() => {
      fetchQuestion(questionId).then(setQuestion).catch(() => undefined)
    }, 2000)
    return () => window.clearInterval(timer)
  }, [questionId, pending])

  if (loadError) {
    return (
      <section className="question-thread">
        <button className="text-back" onClick={onBack} type="button"><Icon name="back" size={18} /> Community</button>
        <p className="scan-error" role="alert">We couldn’t load this question. Make sure the app server is running, then try again.</p>
      </section>
    )
  }
  if (!question) return <section className="question-thread"><p className="loading-note">Loading question…</p></section>

  const replies = question.replies.slice().sort((a, b) =>
    sort === 'helpful' ? b.helpful - a.helpful || a.created_at - b.created_at : b.created_at - a.created_at)
  const comparison = compareByBin(question.replies)
  const totalHelpful = comparison.reduce((sum, group) => sum + group.helpful, 0)
  const saved = question.replies.find((r) => r.id === question.saved_reply_id)
  const guess = question.guess ? catalog[question.guess] : null

  async function toggleHelpful(target: QuestionReply) {
    const liked = likedReplyIds.includes(target.id)
    setActionError('')
    try {
      setQuestion(await markReplyHelpful(questionId, target.id, liked ? -1 : 1))
      onLikedChange(liked ? likedReplyIds.filter((id) => id !== target.id) : [...likedReplyIds, target.id])
    } catch {
      setActionError('Couldn’t update that. Check the app server and try again.')
    }
  }

  async function save(target: QuestionReply) {
    if (!target.answer_key) return
    setActionError('')
    try {
      if (own) setQuestion(await saveAnswer(questionId, target.id))
      const by = target.role ? `${target.author}, ${target.role.toLowerCase()}` : target.author
      onSaveToGuide(target.answer_key, `${target.text} (${by})`)
      setSavedNotice(true)
      window.setTimeout(() => setSavedNotice(false), 2600)
    } catch {
      setActionError('Couldn’t save that answer. Check the app server and try again.')
    }
  }

  async function send() {
    if (!reply.trim() || sending) return
    setSending(true)
    setActionError('')
    try {
      setQuestion(await postQuestionReply(questionId, userName, reply.trim()))
      setReply('')
    } catch {
      setActionError('Reply didn’t send. Try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="question-thread">
      <button className="text-back" onClick={onBack} type="button"><Icon name="back" size={18} /> Community</button>
      {justPosted && <div className="posted-badge"><Icon name="check" size={15} /> Question posted</div>}
      <div className="post-author">
        <span className="avatar">{initials(question.author)}</span>
        <div><strong>{own ? 'You' : question.author}</strong><small>{timeAgo(question.created_at)} · {question.city.split(',')[0]}</small></div>
      </div>
      <h1>Where should this go?</h1>
      {question.photo && <img alt="Item in question" className="story-photo" src={question.photo} />}
      <p>{question.details}</p>
      <div className="possible-tags">
        <span>{guess ? `Might be: ${guess.name}` : 'Not sure what it is'}</span>
        <span>{question.city.split(',')[0]}</span>
      </div>

      {savedNotice && (
        <div className="toast" role="status">
          <Icon name="check" size={16} /> Saved to My Guide
          <button className="link-button" onClick={onViewGuide} type="button">View</button>
        </div>
      )}
      {saved?.answer_key && (
        <div className="resolved-banner">
          <Icon name="check" size={17} />
          <span>Resolved. You saved {saved.author}’s answer: <strong>{catalog[saved.answer_key].bin}</strong></span>
        </div>
      )}

      {comparison.length > 0 && (
        <div className="compare-card">
          <div className="compare-heading"><Icon name="spark" size={16} /><strong>Compare answers</strong></div>
          {comparison.map((group, index) => (
            <div className="compare-row" key={group.bin}>
              <div>
                <strong>{group.bin}</strong>
                {index === 0 && comparison.length > 1 && <i>Most helpful</i>}
                <small>{group.replies} {group.replies === 1 ? 'reply' : 'replies'} · {group.helpful} helpful</small>
              </div>
              <span className="compare-bar"><span className={group.color} style={{ width: `${totalHelpful ? Math.max(6, (group.helpful / totalHelpful) * 100) : 0}%` }} /></span>
            </div>
          ))}
        </div>
      )}

      <div className="reply-count">
        <span>{question.replies.length} {question.replies.length === 1 ? 'reply' : 'replies'}</span>
        {question.replies.length > 1 && (
          <div className="feed-filter" role="group" aria-label="Sort replies">
            <button className={sort === 'helpful' ? 'active' : ''} onClick={() => setSort('helpful')} type="button">Most helpful</button>
            <button className={sort === 'newest' ? 'active' : ''} onClick={() => setSort('newest')} type="button">Newest</button>
          </div>
        )}
      </div>
      {pending > 0 && (
        <p className="loading-note waiting-note" aria-live="polite">
          {question.replies.length === 0
            ? 'Neighbors are looking at your question. Replies usually arrive within a few seconds…'
            : `${pending} more ${pending === 1 ? 'neighbor is' : 'neighbors are'} replying…`}
        </p>
      )}

      {replies.map((r) => {
        const liked = likedReplyIds.includes(r.id)
        const isSaved = r.id === question.saved_reply_id
        return (
          <article className={`reply-card ${isSaved ? 'saved-answer' : ''}`} key={r.id}>
            <div className="post-author">
              <span className={`avatar ${r.role ? 'expert' : ''}`}>{initials(r.author)}</span>
              <div>
                <strong>{r.author === userName ? 'You' : r.author}{r.role && <i>Expert</i>}</strong>
                <small>{[r.role, timeAgo(r.created_at)].filter(Boolean).join(' · ')}</small>
              </div>
            </div>
            <p>{r.text}</p>
            {r.answer_key && (
              <div className={`reply-answer ${catalog[r.answer_key].color}`}>
                <Icon name="recycle" size={17} /><span>Suggests: <strong>{catalog[r.answer_key].bin}</strong></span>
              </div>
            )}
            <div className="reply-actions">
              <button aria-pressed={liked} className={liked ? 'active' : ''} onClick={() => toggleHelpful(r)} type="button">
                <Icon name="heart" size={17} /> {liked ? 'Helpful' : 'Mark helpful'} · {r.helpful}
              </button>
              {r.answer_key && (
                <button className={isSaved ? 'active' : ''} disabled={isSaved} onClick={() => save(r)} type="button">
                  <Icon name={isSaved ? 'check' : 'save'} size={17} /> {isSaved ? 'Saved to My Guide' : saved ? 'Save this instead' : 'Save to My Guide'}
                </button>
              )}
            </div>
          </article>
        )
      })}

      {actionError && <p className="scan-error" role="alert">{actionError}</p>}
      <div className="comment-box">
        <input
          aria-label="Reply to this question"
          onChange={(event) => setReply(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && send()}
          placeholder={own ? 'Add details or thank a neighbor…' : 'Share what you know…'}
          value={reply}
        />
        <button aria-label="Post reply" disabled={sending} onClick={send} type="button"><Icon name="send" size={17} /></button>
      </div>
    </section>
  )
}

export default QuestionThread
