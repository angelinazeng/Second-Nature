import { useEffect, useState } from 'react'
import { catalog } from '../data/catalog'
import { fetchGuide, SharedGuide } from '../lib/api'
import { groupByBin } from './GuideScreen'
import Icon from './Icon'
import ItemDrawing from './ItemDrawing'

type Props = {
  guideId: string
  onBack: () => void
  onAdopt: (guide: SharedGuide) => void
}

function SharedGuideView({ guideId, onBack, onAdopt }: Props) {
  const [guide, setGuide] = useState<SharedGuide | null>(null)
  const [error, setError] = useState('')
  const [adopted, setAdopted] = useState(false)

  useEffect(() => {
    let cancelled = false
    setGuide(null)
    setError('')
    setAdopted(false)
    fetchGuide(guideId)
      .then((data) => !cancelled && setGuide(data))
      .catch(() => !cancelled && setError("We couldn't open this guide. The link may be wrong, or the app server isn't running."))
    return () => {
      cancelled = true
    }
  }, [guideId])

  return (
    <div className="app-screen guide-screen">
      <button className="text-back" onClick={onBack} type="button"><Icon name="back" size={18} /> Back</button>
      {error && <p className="scan-error" role="alert">{error}</p>}
      {!guide && !error && <p className="loading-note">Opening guide…</p>}
      {guide && (
        <>
          <section className="screen-heading">
            <div><span className="mini-kicker">Shared household guide</span><h1>{guide.household}</h1></div>
          </section>
          <div className="guide-summary">
            <div><strong>{guide.items.length}</strong><span>items</span></div>
            <div><strong>{guide.items.filter((item) => item.tip.trim()).length}</strong><span>household tips</span></div>
            <div><strong>{guide.city.split(',')[0]}</strong><span>local rules</span></div>
          </div>
          {guide.note && (
            <blockquote className="guide-why">
              <small>Why it matters to us</small>
              {guide.note}
            </blockquote>
          )}
          <div className="saved-list">
            {groupByBin(guide.items).map(([bin, items]) => (
              <div className="saved-group" key={bin}>
                <div className="list-heading">{bin} <span>{items.length}</span></div>
                {items.map((item) => (
                  <article className="saved-item open" key={item.key}>
                    <div className="saved-item-row">
                      <span className={`item-thumb ${catalog[item.key].color}`}><ItemDrawing item={item.key} /></span>
                      <div><strong>{catalog[item.key].name}</strong><small>{bin}</small></div>
                    </div>
                    {item.tip.trim() && <p className="shared-tip"><Icon name="spark" size={14} /> {item.tip}</p>}
                  </article>
                ))}
              </div>
            ))}
          </div>
          <button
            className={adopted ? 'secondary-action saved' : 'primary-action'}
            disabled={adopted}
            onClick={() => {
              onAdopt(guide)
              setAdopted(true)
            }}
            type="button"
          >
            <Icon name={adopted ? 'check' : 'save'} size={18} /> {adopted ? 'Added to My Guide' : 'Add these to My Guide'}
          </button>
        </>
      )}
    </div>
  )
}

export default SharedGuideView
