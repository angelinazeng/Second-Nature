import { catalog } from '../data/catalog'
import { initials, Question, timeAgo } from '../lib/api'
import Icon from './Icon'

function QuestionCard({ question, own, onOpen }: { question: Question; own: boolean; onOpen: () => void }) {
  const saved = question.replies.find((r) => r.id === question.saved_reply_id)
  const count = question.replies.length
  const status = saved?.answer_key
    ? `Resolved · ${catalog[saved.answer_key].bin}`
    : count
      ? `${count} ${count === 1 ? 'reply' : 'replies'} to compare`
      : 'Waiting for replies'

  return (
    <button className={`story-card question-card ${own ? 'own-story' : ''}`} onClick={onOpen} type="button">
      <div className="post-author">
        <span className="avatar">{initials(question.author)}</span>
        <div>
          <strong>{own ? 'You' : question.author}<i>Question</i></strong>
          <small>{timeAgo(question.created_at)} · {question.city.split(',')[0]}</small>
        </div>
      </div>
      <div className="question-card-body">
        {question.photo && <img alt="" src={question.photo} />}
        <p>{question.details}</p>
      </div>
      <div className={`question-status ${saved ? 'resolved' : ''}`}>
        <Icon name={saved ? 'check' : 'community'} size={15} />
        <span>{status}</span>
        <Icon name="chevron" size={15} />
      </div>
    </button>
  )
}

export default QuestionCard
