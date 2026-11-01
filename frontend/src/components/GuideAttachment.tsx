import Icon from './Icon'

function GuideAttachment({ city, count, household }: { city: string; count: number; household: string }) {
  return (
    <div className="guide-attachment">
      <span><Icon name="guide" size={22} /></span>
      <div><strong>{household} guide</strong><small>{count} sorted items · {city.split(',')[0]} rules</small></div>
      <Icon name="chevron" size={17} />
    </div>
  )
}

export default GuideAttachment
