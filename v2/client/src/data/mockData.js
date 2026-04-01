export const tabItems = [
  { key: 'messages', label: 'Messages' },
  { key: 'memories', label: 'Memories' },
  { key: 'activity', label: 'Activity' },
]

export const seedMessages = [
  {
    id: 'm1',
    sender: 'friend',
    text: 'Morning. Did you sleep okay?',
    dateLabel: 'Today',
    time: '09:02',
  },
  {
    id: 'm2',
    sender: 'me',
    text: 'Much better today. Coffee fixed everything.',
    dateLabel: 'Today',
    time: '09:04',
    read: true,
  },
  {
    id: 'm3',
    sender: 'friend',
    text: 'Good. Ping me when you are free tonight.',
    dateLabel: 'Today',
    time: '09:05',
  },
  {
    id: 'm4',
    sender: 'friend',
    text: 'Also I uploaded our old train photo to memories.',
    dateLabel: 'Today',
    time: '09:06',
  },
  {
    id: 'm5',
    sender: 'me',
    text: 'Just saw it. That day was chaos and perfect.',
    dateLabel: 'Today',
    time: '09:08',
    read: false,
  },
]

export const firstUnreadMessageId = 'm5'

export const memories = [
  {
    id: 'mem1',
    title: 'Train To Jaipur',
    note: 'Window seat, chai, and a playlist we still replay.',
    date: 'Feb 10, 2026',
  },
  {
    id: 'mem2',
    title: '2 AM Pancakes',
    note: 'You burned the first batch and still called it gourmet.',
    date: 'Jan 29, 2026',
  },
  {
    id: 'mem3',
    title: 'First Ping',
    note: 'A single ping that turned into daily rituals.',
    date: 'Dec 17, 2025',
  },
]

export const activities = [
  {
    id: 'a1',
    type: 'message',
    content: 'You sent a message: "Coffee fixed everything."',
    time: 'Today, 09:04',
  },
  {
    id: 'a2',
    type: 'memory',
    content: 'Abhi added memory: "Train To Jaipur"',
    time: 'Today, 09:06',
  },
  {
    id: 'a3',
    type: 'ping',
    content: 'You sent a quick ping',
    time: 'Yesterday, 22:11',
  },
]
