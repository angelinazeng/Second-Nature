import { ReactNode } from 'react'

export type IconName =
  | 'back'
  | 'camera'
  | 'check'
  | 'chevron'
  | 'community'
  | 'guide'
  | 'heart'
  | 'leaf'
  | 'location'
  | 'plus'
  | 'profile'
  | 'recycle'
  | 'save'
  | 'send'
  | 'share'
  | 'spark'

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const path: Record<IconName, ReactNode> = {
    back: <path d="m15 18-6-6 6-6" />,
    camera: (
      <>
        <path d="M4 7.5h3l1.5-2h7l1.5 2h3v11H4z" />
        <circle cx="12" cy="13" r="3.5" />
      </>
    ),
    check: <path d="m5 12.5 4 4L19 7" />,
    chevron: <path d="m9 5 7 7-7 7" />,
    community: (
      <>
        <circle cx="8.5" cy="8" r="3" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M2.5 20c0-4 2.5-6 6-6s6 2 6 6M15 15c3.5-.5 6 1 6 4" />
      </>
    ),
    guide: (
      <>
        <path d="M5 4.5h11a3 3 0 0 1 3 3V20H7a2 2 0 0 1-2-2Z" />
        <path d="M7 17h12M9 8h6M9 11h5" />
      </>
    ),
    heart: <path d="M20 8.5c0 5-8 10-8 10s-8-5-8-10a4.5 4.5 0 0 1 8-3 4.5 4.5 0 0 1 8 3Z" />,
    leaf: (
      <>
        <path d="M19 4C11 4 5.5 7.5 5.5 13c0 3 2.2 5 5.1 5C16 18 19 12.2 19 4Z" />
        <path d="M4 20c2-4.5 5.5-8 11-11" />
      </>
    ),
    location: (
      <>
        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    profile: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4.5 21c.7-4.5 3.2-6.5 7.5-6.5s6.8 2 7.5 6.5" />
      </>
    ),
    recycle: (
      <>
        <path d="m9 5 2-3 2 3M11 2l3 5M18 11l3 1.5-2 2.5M21 12.5l-5 1M7 19l-1 3-3-1M6 22l-3-5" />
        <path d="M7.5 7 5 11M17 17l-4 3M7 17h6" />
      </>
    ),
    save: (
      <>
        <path d="M6 3h12v18l-6-4-6 4Z" />
      </>
    ),
    send: <path d="m3 11 18-8-7 18-3-7-8-3Zm8 3L21 3" />,
    share: (
      <>
        <circle cx="18" cy="5" r="2.5" />
        <circle cx="6" cy="12" r="2.5" />
        <circle cx="18" cy="19" r="2.5" />
        <path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5" />
      </>
    ),
    spark: <path d="M12 2c.5 5 2.5 7 7 7-4.5.5-6.5 2.5-7 7-.5-4.5-2.5-6.5-7-7 4.5 0 6.5-2 7-7Z" />,
  }

  return (
    <svg aria-hidden="true" className="icon" fill="none" height={size} viewBox="0 0 24 24" width={size}>
      {path[name]}
    </svg>
  )
}

export default Icon
