import { useState } from 'react'
import { catalog, ScanKey } from '../data/catalog'
import { GuideEntry } from '../lib/api'
import Icon from './Icon'
import ItemDrawing from './ItemDrawing'

export type ShareStatus = 'idle' | 'sharing' | 'copied' | 'error'

const allKeys = Object.keys(catalog) as ScanKey[]

export function groupByBin<T extends { key: ScanKey }>(items: T[]) {
  const groups = new Map<string, T[]>()
  for (const item of items) {
    const bin = catalog[item.key].bin
    groups.set(bin, [...(groups.get(bin) ?? []), item])
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))
}

type Props = {
  household: string
  city: string
  entries: GuideEntry[]
  note: string
  shareStatus: ShareStatus
  onEntriesChange: (entries: GuideEntry[]) => void
  onNoteChange: (note: string) => void
  onShare: () => void
  onScan: () => void
  onTeach: (key: ScanKey, tip: string) => void
}

function GuideScreen({ household, city, entries, note, shareStatus, onEntriesChange, onNoteChange, onShare, onScan, onTeach }: Props) {
  const [grouped, setGrouped] = useState(true)
  const [showGaps, setShowGaps] = useState(false)
  const [openKey, setOpenKey] = useState<ScanKey | null>(null)

  const missing = allKeys.filter((key) => !entries.some((entry) => entry.key === key))
  const withTips = entries.filter((entry) => entry.tip.trim()).length
  const sections: [string | null, GuideEntry[]][] = grouped
    ? groupByBin(entries)
    : [[null, entries.slice().sort((a, b) => b.savedAt - a.savedAt)]]

  function updateTip(key: ScanKey, tip: string) {
    onEntriesChange(entries.map((entry) => (entry.key === key ? { ...entry, tip } : entry)))
  }

  function remove(key: ScanKey) {
    onEntriesChange(entries.filter((entry) => entry.key !== key))
    setOpenKey(null)
  }

  const shareLabel = { idle: 'Share guide with family', sharing: 'Creating link…', copied: 'Link copied', error: "Couldn't share. Try again" }[shareStatus]

  return (
    <div className="app-screen guide-screen">
      <section className="screen-heading">
        <div><span className="mini-kicker">{household}</span><h1>My Guide</h1></div>
        <button aria-label="Share guide" className="square-action" disabled={shareStatus === 'sharing'} onClick={onShare} type="button">
          <Icon name={shareStatus === 'copied' ? 'check' : 'share'} />
        </button>
      </section>
      {shareStatus === 'copied' && <div className="toast"><Icon name="check" size={16} /> Family guide link copied</div>}
      {shareStatus === 'error' && <div className="toast error-toast" role="alert">Couldn’t reach the app server to share. Is the backend running?</div>}

      <div className="guide-summary">
        <div><strong>{entries.length}</strong><span>items saved</span></div>
        <div><strong>{withTips}</strong><span>household tips</span></div>
        <div><strong>{city.split(',')[0]}</strong><span>local rules</span></div>
      </div>

      <div className="guide-toolbar">
        <button className={grouped ? 'active' : ''} onClick={() => setGrouped(!grouped)} type="button">
          <Icon name="guide" size={16} /> {grouped ? 'Grouped by bin' : 'Group by bin'}
        </button>
        <button className={showGaps ? 'active' : ''} onClick={() => setShowGaps(!showGaps)} type="button">
          <Icon name="spark" size={16} /> Review gaps
        </button>
      </div>

      {showGaps && (
        <div className="gap-card">
          <Icon name="spark" />
          {missing.length === 0 ? (
            <div><strong>Every material is covered.</strong><p>Add household tips so everyone remembers the details, like rinsing or removing lids.</p></div>
          ) : (
            <>
              <div>
                <strong>{missing.length} {missing.length === 1 ? 'material' : 'materials'} not in your guide yet</strong>
                <p>{missing.map((key) => catalog[key].name).join(', ')}. Scan one next time you have it in hand.</p>
              </div>
              <button onClick={onScan} type="button">Scan one</button>
            </>
          )}
        </div>
      )}

      {entries.length === 0 ? (
        <div className="empty-guide">
          <span><Icon name="guide" size={36} /></span>
          <h2>Build your household guide</h2>
          <p>Save answers after you scan. They’ll stay organized here for everyone at home.</p>
          <button className="primary-action" onClick={onScan} type="button"><Icon name="camera" size={18} /> Scan your first item</button>
        </div>
      ) : (
        <div className="saved-list">
          {sections.map(([bin, items]) => (
            <div className="saved-group" key={bin ?? 'all'}>
              {bin && <div className="list-heading">{bin} <span>{items.length}</span></div>}
              {items.map((entry) => {
                const info = catalog[entry.key]
                const open = openKey === entry.key
                return (
                  <article className={`saved-item ${open ? 'open' : ''}`} key={entry.key}>
                    <button aria-expanded={open} className="saved-item-row" onClick={() => setOpenKey(open ? null : entry.key)} type="button">
                      <span className={`item-thumb ${info.color}`}><ItemDrawing item={entry.key} /></span>
                      <div>
                        <strong>{info.name}</strong>
                        <small>{info.bin}{entry.tip.trim() ? ' · has a household tip' : ''}{entry.source === 'community' ? ' · from community' : ''}</small>
                      </div>
                      <Icon name="chevron" size={17} />
                    </button>
                    {open && (
                      <div className="saved-item-detail">
                        <p>{info.why}</p>
                        <label>
                          Household tip
                          <textarea
                            onChange={(event) => updateTip(entry.key, event.target.value)}
                            placeholder="e.g. Rinse jars, then they go in the blue tub under the sink."
                            rows={2}
                            value={entry.tip}
                          />
                        </label>
                        <div className="saved-item-actions">
                          <button onClick={() => onTeach(entry.key, entry.tip)} type="button"><Icon name="community" size={16} /> Teach others</button>
                          <button className="danger" onClick={() => remove(entry.key)} type="button">Remove</button>
                        </div>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          ))}
        </div>
      )}

      <label className="personal-note">
        <span>Our household “why”</span>
        <textarea
          onChange={(event) => onNoteChange(event.target.value)}
          placeholder="Why does sorting well matter to your family?"
          rows={3}
          value={note}
        />
        <small>{note ? 'Saved. It shows on your shared guide.' : 'Add a note everyone at home can see.'}</small>
      </label>
      <button className="share-guide-button" disabled={entries.length === 0 || shareStatus === 'sharing'} onClick={onShare} type="button">
        <Icon name="share" size={18} /> {shareLabel}
      </button>
    </div>
  )
}

export default GuideScreen
