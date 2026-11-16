import { useState } from 'react'
import { catalog } from '../data/catalog'
import { initials, Story, timeAgo } from '../lib/api'
import GuideAttachment from './GuideAttachment'
import Icon from './Icon'

type Props = {
  story: Story
  own: boolean
  liked: boolean
  onToggleHelpful: () => void
  onReply: (text: string) => Promise<void>
  onOpenGuide: (id: string) => void
}

function StoryCard({ story, own, liked, onToggleHelpful, onReply, onOpenGuide }: Props) {
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(false)
  const item = story.item_key ? catalog[story.item_key] : null

  async function send() {
    if (!reply.trim() || sending) return
    setSending(true)
    setError(false)
    try {
      await onReply(reply.trim())
      setReply('')
    } catch {
      setError(true)
    } finally {
      setSending(false)
    }
  }

  return (
    <article className={`story-card ${own ? 'own-story' : ''}`}>
      <div className="post-author">
        <span className={`avatar ${story.role ? 'expert' : ''}`}>{initials(story.author)}</span>
        <div>
          <strong>{own ? 'You' : story.author}{story.kind === 'tip' && <i>Tip</i>}</strong>
          <small>{[story.role, timeAgo(story.created_at), story.city.split(',')[0]].filter(Boolean).join(' · ')}</small>
        </div>
      </div>
      {item && (
        <div className={`tip-item ${item.color}`}>
          <Icon name="recycle" size={16} /> <span><strong>{item.name}</strong> → {item.bin}</span>
        </div>
      )}
      {story.photo && <img alt="Shared sustainable practice" className="story-photo" src={story.photo} />}
      <p>{story.caption}</p>
      {story.guide && (
        <button className="attachment-button" onClick={() => onOpenGuide(story.guide!.id)} type="button">
          <GuideAttachment city={story.guide.city} count={story.guide.count} household={story.guide.household} />
        </button>
      )}
      <div className="story-stats">
        <button aria-pressed={liked} className={liked ? 'liked' : ''} onClick={onToggleHelpful} type="button">
          <Icon name="heart" size={16} /> {story.helpful} helpful
        </button>
        <span>{story.replies.length} {story.replies.length === 1 ? 'reply' : 'replies'}</span>
      </div>
      {story.replies.map((r) => (
        <div className="comment" key={r.id}><span>{initials(r.author)}</span><p><strong>{r.author}</strong>{r.text}</p></div>
      ))}
      <div className="comment-box">
        <input
          aria-label="Write a reply"
          onChange={(event) => setReply(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && send()}
          placeholder="Add a reply…"
          value={reply}
        />
        <button aria-label="Post reply" disabled={sending} onClick={send} type="button"><Icon name="send" size={17} /></button>
      </div>
      {error && <p className="inline-error" role="alert">Reply didn’t send. Try again.</p>}
    </article>
  )
}

export default StoryCard
