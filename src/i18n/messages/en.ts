import type { Messages } from './vi'

/**
 * English, typed against the Vietnamese key set.
 *
 * The annotation is what enforces the acceptance criterion: a key present in
 * `vi` and missing here is a **type error**, and a key here that `vi` does not
 * have is an excess property, which is also a type error. Neither can reach a
 * page as a blank string or a key name, because neither compiles.
 *
 * **What is written out, and what is not.** T-15A's flag says Vietnamese that is
 * not already written down and English that is not *mechanical* both get
 * `TODO(copy)`. Interface terms are mechanical — a navigation item reading
 * "Pricing", a button reading "Send message", a field labelled "Email" — and
 * writing those is not translation in any meaningful sense. Marketing lines are
 * not mechanical, so where the designs give no English for one, it is left as
 * `TODO(copy)` rather than translated.
 *
 * The designs are almost entirely Vietnamese. The one English page is the
 * pricing comparison, which shows package names and short selling lines; it is
 * product copy belonging to the CMS (T-23), not to this catalog.
 */
export const en: Messages = {
  nav: {
    home: 'Home',
    services: 'Services',
    pricing: 'Pricing',
    guide: 'How it works',
    about: 'About us',
    news: 'News',
    contact: 'Contact',
    primaryLabel: 'Primary',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
  },

  /** The endonyms are the same in both locales, by design — see `vi.ts`. */
  language: {
    vietnamese: 'VI',
    english: 'EN',
    switchLabel: 'Language',
  },

  actions: {
    findStation: 'Find a station near you',
    tryToday: 'TODO(copy): headline CTA — "try the service today"',
    tryTodayLead: 'TODO(copy): CTA lead — "fast, convenient, always ready to serve you"',
    callNow: 'Call now',
    directions: 'Directions',
    viewOnMap: 'View on map',
    sendMessage: 'Send message',
  },

  sections: {
    featuredPackages: 'Featured packages',
    faq: 'Frequently asked questions',
    priceList: 'Price list',
    fourSteps: 'How it works in four steps',
    serviceDetails: 'Service details',
    includes: 'Includes',
    servicePackage: 'Package',
    estimatedDuration: 'Estimated duration',
  },

  steps: {
    scanQr: 'Scan the QR code',
    chooseService: 'Choose a service',
    wash: 'Wash',
  },

  footer: {
    servicesHeading: 'Services',
    aboutHeading: 'About us',
    contactHeading: 'Contact',
    hotline: 'Hotline',
    email: 'Email',
    support: 'Support',
    rights: 'All rights reserved.',
  },

  contact: {
    heading: 'Get in touch',
    nameLabel: 'Full name',
    namePlaceholder: 'Enter your name',
    emailLabel: 'Email',
    emailPlaceholder: 'Enter your email',
    subjectLabel: 'Subject',
    subjectPlaceholder: 'Choose a subject',
    messageLabel: 'Message',
    messagePlaceholder: 'Type your message...',
    addressHeading: 'Address',
    hoursHeading: 'Opening hours',
    required: 'This field is required',
    invalidEmail: 'That does not look like an email address',
    sent: 'Thank you, your message has been sent',
    sendFailed: 'The message could not be sent. Please try again.',
  },

  notFound: {
    title: '404',
    message: 'We could not find that page.',
    backHome: 'Back to the home page',
  },

  weekdays: {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday',
    closed: 'Closed',
  },

  a11y: {
    skipToContent: 'Skip to main content',
  },

  placeholder: {
    homeBody: 'TODO(copy): home page content — see T-17 (blocks) and T-23 (seed).',
    pageBody: 'TODO(copy): page body — blocks are T-17, real content is T-23.',
  },

  draft: {
    message: 'You are viewing a draft — this content is not published',
    exit: 'Exit preview',
  },
}
