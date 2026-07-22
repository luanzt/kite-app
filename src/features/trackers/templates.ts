import type {
  TrackerType,
  HabitDirection,
  Accumulation,
  Period,
  AverageWindow
} from '@features/trackers/types'

/** A pre-built goal shown in the Templates browser. Tapping one opens the
 *  TrackerForm pre-filled from these fields (name comes from i18n by `key`). */
export type Template = {
  key: string // unique; i18n key under template.items.<key>
  type: TrackerType
  icon: string // ASCII keyword (must exist in ICON_EMOJI)
  color: string // palette name (COLOR_HEX key)
  direction?: HabitDirection // habit only: 'good' | 'bad'
  unit?: string
  targetValue?: number // habit: times per period (bad habit: slip limit)
  accumulation?: Accumulation
  period?: Period
  repeatDays?: number[] // habit only: due weekdays (0=Sun..6=Sat); omit = every day
  reminderTimes?: string[] // "HH:MM" 24h
  deadlineMonths?: number // target only: goal date offset from today, in months
  averageWindow?: AverageWindow // average only; omit = since_start
  rollingDays?: number // average only: rolling window in calendar days
  // average only: whether the goal is a floor ("N or More") or a ceiling
  // ("N or Less", e.g. Budget/Expenses). Omit = at_least (the Strides default).
  // Applied via templateDirection() → the tracker's `direction` ('at_most' =
  // 'bad'), which calculateAverage reads for its lower-is-better mode.
  goalDirection?: 'at_least' | 'at_most'
}

export type TemplateCategory = {
  key: string // id + i18n key under template.categories.<key>
  color: string // accent for the category icon tile (palette name)
  templates: Template[]
}

/** Categories in design order, each populated from the Strides-style reference
 *  screenshots (goal / time period / due days / reminders / average options).
 *  Habits omit `period` (the form defaults to daily) and omit `targetValue`
 *  when it is 1 (good) / 0 (bad-habit limit) — those are the engine defaults.
 *  Only non-default values are set. Reminder lists showing "+N" in the
 *  reference expose only their first time; that visible time is kept. */
export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  {
    key: 'health',
    color: 'pink',
    templates: [
      {
        key: 'weight',
        type: 'target',
        icon: 'scale',
        color: 'pink',
        unit: 'kg',
        accumulation: 'latest',
        deadlineMonths: 1,
        reminderTimes: ['07:00']
      },
      {
        key: 'drinkWater',
        type: 'habit',
        icon: 'drop',
        color: 'cyan',
        direction: 'good',
        targetValue: 8,
        reminderTimes: ['09:00', '12:00', '15:00', '18:00']
      },
      {
        key: 'sleep',
        type: 'average',
        icon: 'sleep',
        color: 'indigo',
        targetValue: 8,
        averageWindow: 'rolling',
        rollingDays: 7,
        reminderTimes: ['07:30']
      },
      {
        key: 'brushFloss',
        type: 'habit',
        icon: 'tooth',
        color: 'blue',
        direction: 'good',
        targetValue: 2,
        reminderTimes: ['07:00', '21:00']
      },
      {
        key: 'healthyMeal',
        type: 'habit',
        icon: 'salad',
        color: 'green',
        direction: 'good',
        targetValue: 3,
        reminderTimes: ['07:30', '12:00', '17:30']
      },
      {
        key: 'foodJournal',
        type: 'habit',
        icon: 'read',
        color: 'orange',
        direction: 'good',
        targetValue: 3,
        reminderTimes: ['07:30', '12:00', '17:30']
      },
      {
        key: 'eatVegetables',
        type: 'habit',
        icon: 'veggie',
        color: 'green',
        direction: 'good',
        targetValue: 3,
        reminderTimes: ['07:30', '12:00', '17:30']
      },
      {
        key: 'eatFruit',
        type: 'habit',
        icon: 'apple',
        color: 'red',
        direction: 'good',
        targetValue: 3,
        reminderTimes: ['07:30', '12:00', '17:30']
      },
      {
        key: 'calories',
        type: 'average',
        icon: 'calorie',
        color: 'orange',
        targetValue: 2000,
        averageWindow: 'rolling',
        rollingDays: 7,
        reminderTimes: ['07:30', '12:00', '17:30']
      },
      {
        key: 'protein',
        type: 'average',
        icon: 'protein',
        color: 'red',
        targetValue: 50,
        averageWindow: 'rolling',
        rollingDays: 7,
        reminderTimes: ['07:30', '12:00', '17:30']
      },
      {
        key: 'takeVitamins',
        type: 'habit',
        icon: 'pill',
        color: 'pink',
        direction: 'good',
        reminderTimes: ['07:30']
      },
      {
        key: 'limitCaffeine',
        type: 'habit',
        icon: 'coffee',
        color: 'orange',
        direction: 'bad',
        targetValue: 1,
        reminderTimes: ['07:00']
      },
      {
        key: 'noSugar',
        type: 'habit',
        icon: 'candy',
        color: 'pink',
        direction: 'bad',
        reminderTimes: ['19:00']
      },
      {
        key: 'noJunkFood',
        type: 'habit',
        icon: 'fries',
        color: 'red',
        direction: 'bad',
        reminderTimes: ['07:30', '12:00', '17:30']
      },
      {
        key: 'noSoda',
        type: 'habit',
        icon: 'soda',
        color: 'blue',
        direction: 'bad',
        reminderTimes: ['10:00']
      },
      {
        key: 'noAlcohol',
        type: 'habit',
        icon: 'beer',
        color: 'orange',
        direction: 'bad',
        reminderTimes: ['19:00']
      },
      {
        key: 'noSnacks',
        type: 'habit',
        icon: 'popcorn',
        color: 'orange',
        direction: 'bad',
        reminderTimes: ['19:00']
      },
      {
        key: 'dontSmoke',
        type: 'habit',
        icon: 'nosmoke',
        color: 'gray',
        direction: 'bad',
        reminderTimes: ['19:00']
      },
      {
        key: 'dontBiteNails',
        type: 'habit',
        icon: 'nails',
        color: 'blue',
        direction: 'bad',
        reminderTimes: ['19:00']
      },
      {
        key: 'takeMedicine',
        type: 'habit',
        icon: 'pill',
        color: 'red',
        direction: 'good',
        reminderTimes: ['07:30']
      }
    ]
  },
  {
    key: 'fitness',
    color: 'orange',
    templates: [
      {
        key: 'exercise',
        type: 'habit',
        icon: 'dumbbell',
        color: 'orange',
        direction: 'good',
        reminderTimes: ['17:30']
      },
      {
        key: 'stretch',
        type: 'habit',
        icon: 'stretch',
        color: 'teal',
        direction: 'good',
        reminderTimes: ['07:00']
      },
      {
        key: 'walk',
        type: 'habit',
        icon: 'walk',
        color: 'green',
        direction: 'good',
        reminderTimes: ['12:00']
      },
      {
        key: 'run',
        type: 'habit',
        icon: 'run',
        color: 'orange',
        direction: 'good',
        targetValue: 5,
        period: 'weekly',
        reminderTimes: ['07:30']
      },
      {
        key: 'intervalTraining',
        type: 'habit',
        icon: 'calorie',
        color: 'red',
        direction: 'good',
        targetValue: 3,
        period: 'weekly',
        reminderTimes: ['07:30']
      },
      {
        key: 'weightLifting',
        type: 'habit',
        icon: 'protein',
        color: 'red',
        direction: 'good',
        targetValue: 5,
        period: 'weekly',
        reminderTimes: ['07:30']
      },
      {
        key: 'pushUps',
        type: 'average',
        icon: 'raise',
        color: 'orange',
        targetValue: 25,
        averageWindow: 'rolling',
        rollingDays: 7,
        reminderTimes: ['07:30']
      },
      {
        key: 'crunches',
        type: 'average',
        icon: 'fire',
        color: 'red',
        targetValue: 50,
        averageWindow: 'rolling',
        rollingDays: 7,
        reminderTimes: ['07:30']
      },
      {
        key: 'takeStairs',
        type: 'habit',
        icon: 'sneaker',
        color: 'teal',
        direction: 'good',
        reminderTimes: ['12:00']
      },
      {
        key: 'playSport',
        type: 'habit',
        icon: 'sport',
        color: 'blue',
        direction: 'good',
        reminderTimes: ['18:00']
      },
      {
        key: 'yoga',
        type: 'habit',
        icon: 'lotus',
        color: 'purple',
        direction: 'good',
        reminderTimes: ['07:00']
      },
      {
        key: 'cycling',
        type: 'habit',
        icon: 'cycle',
        color: 'green',
        direction: 'good',
        reminderTimes: ['19:00']
      },
      {
        key: 'swimming',
        type: 'habit',
        icon: 'swim',
        color: 'cyan',
        direction: 'good',
        reminderTimes: ['19:00']
      },
      {
        key: 'standingDesk',
        type: 'habit',
        icon: 'stand',
        color: 'orange',
        direction: 'good',
        reminderTimes: ['08:00']
      },
      {
        key: 'steps',
        type: 'average',
        icon: 'sneaker',
        color: 'teal',
        targetValue: 10000,
        averageWindow: 'rolling',
        rollingDays: 7,
        reminderTimes: ['07:30']
      }
    ]
  },
  {
    key: 'wellness',
    color: 'purple',
    templates: [
      {
        key: 'meditate',
        type: 'habit',
        icon: 'lotus',
        color: 'purple',
        direction: 'good',
        reminderTimes: ['19:00']
      },
      {
        key: 'journal',
        type: 'habit',
        icon: 'write',
        color: 'indigo',
        direction: 'good',
        reminderTimes: ['20:00']
      },
      {
        key: 'goOutside',
        type: 'habit',
        icon: 'sun',
        color: 'orange',
        direction: 'good',
        reminderTimes: ['12:00']
      },
      {
        key: 'pray',
        type: 'habit',
        icon: 'pray',
        color: 'blue',
        direction: 'good',
        reminderTimes: ['21:00']
      },
      {
        key: 'gratitudeJournal',
        type: 'habit',
        icon: 'smile',
        color: 'pink',
        direction: 'good',
        reminderTimes: ['21:00']
      },
      {
        key: 'watchFunny',
        type: 'habit',
        icon: 'laugh',
        color: 'orange',
        direction: 'good',
        reminderTimes: ['20:00']
      },
      {
        key: 'readForFun',
        type: 'habit',
        icon: 'book',
        color: 'teal',
        direction: 'good',
        reminderTimes: ['20:00']
      },
      {
        key: 'trySomethingNew',
        type: 'habit',
        icon: 'mountain',
        color: 'green',
        direction: 'good',
        reminderTimes: ['12:00']
      },
      {
        key: 'playGame',
        type: 'habit',
        icon: 'game',
        color: 'purple',
        direction: 'good',
        reminderTimes: ['20:00']
      },
      {
        key: 'relax',
        type: 'habit',
        icon: 'cool',
        color: 'blue',
        direction: 'good',
        reminderTimes: ['20:00']
      },
      {
        key: 'quietTime',
        type: 'habit',
        icon: 'shush',
        color: 'indigo',
        direction: 'good',
        reminderTimes: ['20:00']
      },
      {
        key: 'deepBreath',
        type: 'habit',
        icon: 'breathe',
        color: 'cyan',
        direction: 'good',
        reminderTimes: ['12:00']
      },
      {
        key: 'volunteer',
        type: 'habit',
        icon: 'hand',
        color: 'pink',
        direction: 'good',
        repeatDays: [6],
        reminderTimes: ['12:00']
      }
    ]
  },
  {
    key: 'productivity',
    color: 'blue',
    templates: [
      {
        key: 'prioritizeTasks',
        type: 'habit',
        icon: 'checkbox',
        color: 'green',
        direction: 'good',
        reminderTimes: ['08:00']
      },
      {
        key: 'focusTopPriority',
        type: 'habit',
        icon: 'target',
        color: 'red',
        direction: 'good',
        reminderTimes: ['08:00']
      },
      {
        key: 'planTomorrow',
        type: 'habit',
        icon: 'notebook',
        color: 'blue',
        direction: 'good',
        reminderTimes: ['19:00']
      },
      {
        key: 'getUpEarly',
        type: 'habit',
        icon: 'alarm',
        color: 'orange',
        direction: 'good',
        reminderTimes: ['06:30']
      },
      {
        key: 'inBedBy10',
        type: 'habit',
        icon: 'clock',
        color: 'indigo',
        direction: 'good',
        reminderTimes: ['21:30', '21:45']
      },
      {
        key: 'noSocialMedia',
        type: 'habit',
        icon: 'laptop',
        color: 'red',
        direction: 'bad',
        reminderTimes: ['07:00', '19:00']
      },
      {
        key: 'noPhoneInBed',
        type: 'habit',
        icon: 'phone',
        color: 'red',
        direction: 'bad',
        reminderTimes: ['07:00', '21:00']
      },
      {
        key: 'limitTv',
        type: 'habit',
        icon: 'tv',
        color: 'orange',
        direction: 'bad',
        targetValue: 1,
        reminderTimes: ['19:00']
      },
      {
        key: 'limitVideoGames',
        type: 'habit',
        icon: 'game',
        color: 'orange',
        direction: 'bad',
        targetValue: 1,
        reminderTimes: ['19:00']
      },
      {
        key: 'priorityBeforeEmail',
        type: 'habit',
        icon: 'star',
        color: 'blue',
        direction: 'good',
        reminderTimes: ['08:00']
      },
      {
        key: 'inboxZero',
        type: 'habit',
        icon: 'envelope',
        color: 'teal',
        direction: 'good',
        reminderTimes: ['16:00']
      },
      {
        key: 'pomodoro',
        type: 'habit',
        icon: 'tomato',
        color: 'red',
        direction: 'good',
        targetValue: 3,
        reminderTimes: ['09:00', '13:00', '16:00']
      },
      {
        key: 'takeABreak',
        type: 'habit',
        icon: 'happy',
        color: 'green',
        direction: 'good',
        targetValue: 2,
        reminderTimes: ['10:00', '14:30']
      },
      {
        key: 'workSideProject',
        type: 'habit',
        icon: 'piggy',
        color: 'purple',
        direction: 'good',
        reminderTimes: ['19:00']
      },
      {
        key: 'planTheWeek',
        type: 'habit',
        icon: 'calendar',
        color: 'blue',
        direction: 'good',
        period: 'weekly',
        repeatDays: [0],
        reminderTimes: ['16:00']
      }
    ]
  },
  {
    key: 'money',
    color: 'green',
    templates: [
      {
        key: 'budget',
        type: 'average',
        icon: 'piggy',
        color: 'green',
        targetValue: 1000,
        goalDirection: 'at_most',
        period: 'monthly',
        averageWindow: 'rolling',
        rollingDays: 90,
        reminderTimes: ['12:00']
      },
      {
        key: 'saveMoney',
        type: 'target',
        icon: 'cash',
        color: 'green',
        unit: '$',
        accumulation: 'latest',
        deadlineMonths: 3,
        reminderTimes: ['12:00']
      },
      {
        key: 'debtFree',
        type: 'target',
        icon: 'party',
        color: 'pink',
        unit: '$',
        accumulation: 'latest',
        deadlineMonths: 12,
        reminderTimes: ['10:00']
      },
      {
        key: 'checkBankAccounts',
        type: 'habit',
        icon: 'bank',
        color: 'blue',
        direction: 'good',
        period: 'weekly',
        reminderTimes: ['12:00']
      },
      {
        key: 'trackSpending',
        type: 'habit',
        icon: 'receipt',
        color: 'teal',
        direction: 'good',
        reminderTimes: ['19:00']
      },
      {
        key: 'payBills',
        type: 'habit',
        icon: 'envelope',
        color: 'orange',
        direction: 'good',
        period: 'monthly',
        reminderTimes: ['12:00']
      },
      {
        key: 'payCreditCards',
        type: 'habit',
        icon: 'card',
        color: 'red',
        direction: 'good',
        period: 'monthly',
        reminderTimes: ['12:00']
      },
      {
        key: 'payLoans',
        type: 'habit',
        icon: 'institution',
        color: 'blue',
        direction: 'good',
        period: 'monthly',
        reminderTimes: ['12:00']
      },
      {
        key: 'dinnerAtHome',
        type: 'habit',
        icon: 'plate',
        color: 'orange',
        direction: 'good',
        targetValue: 6,
        period: 'weekly',
        reminderTimes: ['17:30']
      },
      {
        key: 'packLunch',
        type: 'habit',
        icon: 'takeout',
        color: 'green',
        direction: 'good',
        targetValue: 4,
        period: 'weekly',
        repeatDays: [1, 2, 3, 4, 5],
        reminderTimes: ['07:30']
      },
      {
        key: 'transferToSavings',
        type: 'habit',
        icon: 'flymoney',
        color: 'green',
        direction: 'good',
        period: 'monthly',
        reminderTimes: ['12:00']
      },
      {
        key: 'noImpulseBuys',
        type: 'habit',
        icon: 'cart',
        color: 'red',
        direction: 'bad',
        reminderTimes: ['19:00']
      },
      {
        key: 'income',
        type: 'average',
        icon: 'cash',
        color: 'green',
        period: 'monthly',
        averageWindow: 'rolling',
        rollingDays: 365,
        reminderTimes: ['19:00']
      },
      {
        key: 'retirementFund',
        type: 'target',
        icon: 'palm',
        color: 'teal',
        unit: '$',
        accumulation: 'latest',
        deadlineMonths: 240,
        reminderTimes: ['12:00']
      },
      {
        key: 'netWorth',
        type: 'target',
        icon: 'piggy',
        color: 'green',
        unit: '$',
        accumulation: 'latest',
        deadlineMonths: 60,
        reminderTimes: ['12:00']
      }
    ]
  },
  {
    key: 'education',
    color: 'pink',
    templates: [
      {
        key: 'read',
        type: 'habit',
        icon: 'book',
        color: 'pink',
        direction: 'good',
        reminderTimes: ['20:00']
      },
      {
        key: 'study',
        type: 'habit',
        icon: 'notebook',
        color: 'indigo',
        direction: 'good',
        reminderTimes: ['19:00']
      },
      {
        key: 'learnLanguage',
        type: 'habit',
        icon: 'globe',
        color: 'blue',
        direction: 'good',
        reminderTimes: ['19:00']
      },
      {
        key: 'reviewNotes',
        type: 'habit',
        icon: 'memo',
        color: 'teal',
        direction: 'good',
        targetValue: 5,
        period: 'weekly',
        repeatDays: [0, 1, 2, 3, 4],
        reminderTimes: ['19:00']
      },
      {
        key: 'askQuestions',
        type: 'habit',
        icon: 'think',
        color: 'orange',
        direction: 'good',
        reminderTimes: ['12:00']
      },
      {
        key: 'extracurriculars',
        type: 'habit',
        icon: 'medal',
        color: 'red',
        direction: 'good',
        targetValue: 3,
        period: 'weekly',
        repeatDays: [1, 2, 3, 4, 5],
        reminderTimes: ['15:00']
      },
      {
        key: 'homework',
        type: 'habit',
        icon: 'read',
        color: 'purple',
        direction: 'good',
        targetValue: 5,
        period: 'weekly',
        repeatDays: [0, 1, 2, 3, 4],
        reminderTimes: ['19:00']
      },
      {
        key: 'meetTutor',
        type: 'habit',
        icon: 'teacher',
        color: 'pink',
        direction: 'good',
        targetValue: 3,
        period: 'weekly',
        repeatDays: [1, 2, 3, 4, 5],
        reminderTimes: ['15:00']
      },
      {
        key: 'brainTraining',
        type: 'habit',
        icon: 'brain',
        color: 'pink',
        direction: 'good',
        reminderTimes: ['19:00']
      },
      {
        key: 'flashCards',
        type: 'habit',
        icon: 'bluebook',
        color: 'blue',
        direction: 'good',
        reminderTimes: ['19:00']
      }
    ]
  },
  {
    key: 'hobbies',
    color: 'orange',
    templates: [
      {
        key: 'readBook',
        type: 'habit',
        icon: 'read',
        color: 'teal',
        direction: 'good',
        reminderTimes: ['19:00']
      },
      {
        key: 'watchMovie',
        type: 'habit',
        icon: 'film',
        color: 'red',
        direction: 'good',
        period: 'weekly',
        repeatDays: [5, 6],
        reminderTimes: ['20:00']
      },
      {
        key: 'playGames',
        type: 'habit',
        icon: 'game',
        color: 'purple',
        direction: 'good',
        targetValue: 5,
        period: 'weekly',
        reminderTimes: ['19:00']
      },
      {
        key: 'playGuitar',
        type: 'habit',
        icon: 'guitar',
        color: 'orange',
        direction: 'good',
        reminderTimes: ['19:00']
      },
      {
        key: 'playPiano',
        type: 'habit',
        icon: 'piano',
        color: 'indigo',
        direction: 'good',
        reminderTimes: ['19:00']
      },
      {
        key: 'goGolfing',
        type: 'habit',
        icon: 'golf',
        color: 'green',
        direction: 'good',
        period: 'weekly',
        repeatDays: [0, 6],
        reminderTimes: ['07:00']
      },
      {
        key: 'goFishing',
        type: 'habit',
        icon: 'fishing',
        color: 'blue',
        direction: 'good',
        period: 'weekly',
        repeatDays: [0, 6],
        reminderTimes: ['07:00']
      },
      {
        key: 'gardening',
        type: 'habit',
        icon: 'blossom',
        color: 'pink',
        direction: 'good',
        targetValue: 3,
        period: 'weekly',
        reminderTimes: ['19:00']
      },
      {
        key: 'listenMusic',
        type: 'habit',
        icon: 'headphone',
        color: 'purple',
        direction: 'good',
        reminderTimes: ['19:00']
      },
      {
        key: 'knitting',
        type: 'habit',
        icon: 'yarn',
        color: 'orange',
        direction: 'good',
        reminderTimes: ['19:00']
      },
      {
        key: 'sewing',
        type: 'habit',
        icon: 'thread',
        color: 'cyan',
        direction: 'good',
        reminderTimes: ['19:00']
      },
      {
        key: 'crafts',
        type: 'habit',
        icon: 'artist',
        color: 'pink',
        direction: 'good',
        reminderTimes: ['19:00']
      },
      {
        key: 'makeSomething',
        type: 'habit',
        icon: 'hammer',
        color: 'gray',
        direction: 'good',
        reminderTimes: ['19:00']
      },
      {
        key: 'writing',
        type: 'habit',
        icon: 'write',
        color: 'indigo',
        direction: 'good',
        reminderTimes: ['19:00']
      },
      {
        key: 'painting',
        type: 'habit',
        icon: 'paint',
        color: 'red',
        direction: 'good',
        reminderTimes: ['19:00']
      },
      {
        key: 'photography',
        type: 'habit',
        icon: 'camera',
        color: 'blue',
        direction: 'good',
        reminderTimes: ['19:00']
      }
    ]
  },
  {
    key: 'relationships',
    color: 'purple',
    templates: [
      {
        key: 'familyTime',
        type: 'habit',
        icon: 'family',
        color: 'purple',
        direction: 'good',
        targetValue: 5,
        period: 'weekly',
        reminderTimes: ['19:00']
      },
      {
        key: 'playWithKids',
        type: 'habit',
        icon: 'family',
        color: 'orange',
        direction: 'good',
        reminderTimes: ['19:00']
      },
      {
        key: 'callMom',
        type: 'habit',
        icon: 'woman',
        color: 'pink',
        direction: 'good',
        targetValue: 2,
        period: 'weekly',
        reminderTimes: ['19:00']
      },
      {
        key: 'callDad',
        type: 'habit',
        icon: 'man',
        color: 'blue',
        direction: 'good',
        targetValue: 2,
        period: 'weekly',
        reminderTimes: ['19:00']
      },
      {
        key: 'callFriend',
        type: 'habit',
        icon: 'telephone',
        color: 'green',
        direction: 'good',
        targetValue: 3,
        period: 'weekly',
        reminderTimes: ['19:00']
      },
      {
        key: 'textFriend',
        type: 'habit',
        icon: 'speech',
        color: 'cyan',
        direction: 'good',
        targetValue: 5,
        period: 'weekly',
        reminderTimes: ['19:00']
      },
      {
        key: 'planGetTogether',
        type: 'habit',
        icon: 'memo',
        color: 'orange',
        direction: 'good',
        period: 'weekly',
        reminderTimes: ['19:00']
      },
      {
        key: 'handwrittenLetter',
        type: 'habit',
        icon: 'loveletter',
        color: 'pink',
        direction: 'good',
        period: 'weekly',
        repeatDays: [0, 6],
        reminderTimes: ['13:00']
      },
      {
        key: 'sayThankYou',
        type: 'habit',
        icon: 'blush',
        color: 'orange',
        direction: 'good',
        reminderTimes: ['15:00']
      },
      {
        key: 'sayILoveYou',
        type: 'habit',
        icon: 'heart',
        color: 'red',
        direction: 'good',
        reminderTimes: ['19:00']
      },
      {
        key: 'helpSomeone',
        type: 'habit',
        icon: 'handshake',
        color: 'green',
        direction: 'good',
        reminderTimes: ['10:00']
      },
      {
        key: 'hangOutFriend',
        type: 'habit',
        icon: 'man',
        color: 'blue',
        direction: 'good',
        period: 'weekly',
        repeatDays: [5, 6],
        reminderTimes: ['18:00']
      },
      {
        key: 'talkSomeoneNew',
        type: 'habit',
        icon: 'speaking',
        color: 'purple',
        direction: 'good',
        period: 'weekly',
        reminderTimes: ['13:00']
      },
      {
        key: 'listenMore',
        type: 'habit',
        icon: 'ear',
        color: 'teal',
        direction: 'good',
        reminderTimes: ['19:00']
      },
      {
        key: 'undividedAttention',
        type: 'habit',
        icon: 'target',
        color: 'indigo',
        direction: 'good',
        reminderTimes: ['19:00']
      }
    ]
  },
  {
    key: 'chores',
    color: 'blue',
    templates: [
      {
        key: 'declutter',
        type: 'habit',
        icon: 'box',
        color: 'orange',
        direction: 'good',
        reminderTimes: ['19:00']
      },
      {
        key: 'laundry',
        type: 'habit',
        icon: 'basket',
        color: 'blue',
        direction: 'good',
        reminderTimes: ['19:00']
      },
      {
        key: 'dishes',
        type: 'habit',
        icon: 'plate',
        color: 'teal',
        direction: 'good',
        targetValue: 2,
        reminderTimes: ['07:00', '19:00']
      },
      {
        key: 'sweepFloors',
        type: 'habit',
        icon: 'broom',
        color: 'orange',
        direction: 'good',
        period: 'weekly',
        repeatDays: [0, 6],
        reminderTimes: ['10:00']
      },
      {
        key: 'mopFloors',
        type: 'habit',
        icon: 'sponge',
        color: 'cyan',
        direction: 'good',
        targetValue: 2,
        period: 'monthly',
        repeatDays: [0, 6],
        reminderTimes: ['10:00']
      },
      {
        key: 'dusting',
        type: 'habit',
        icon: 'dash',
        color: 'gray',
        direction: 'good',
        period: 'weekly',
        repeatDays: [0, 6],
        reminderTimes: ['10:00']
      },
      {
        key: 'makeBed',
        type: 'habit',
        icon: 'bed',
        color: 'indigo',
        direction: 'good',
        reminderTimes: ['07:00']
      },
      {
        key: 'cookDinner',
        type: 'habit',
        icon: 'cook',
        color: 'red',
        direction: 'good',
        targetValue: 5,
        period: 'weekly',
        reminderTimes: ['17:30']
      },
      {
        key: 'feedPets',
        type: 'habit',
        icon: 'cat',
        color: 'orange',
        direction: 'good',
        targetValue: 2,
        reminderTimes: ['07:00', '19:00']
      },
      {
        key: 'walkDog',
        type: 'habit',
        icon: 'dog',
        color: 'green',
        direction: 'good',
        reminderTimes: ['19:00']
      },
      {
        key: 'cleanBathrooms',
        type: 'habit',
        icon: 'toilet',
        color: 'blue',
        direction: 'good',
        period: 'weekly',
        repeatDays: [0, 6],
        reminderTimes: ['10:00']
      },
      {
        key: 'waterPlants',
        type: 'habit',
        icon: 'tree',
        color: 'green',
        direction: 'good',
        reminderTimes: ['07:30']
      },
      {
        key: 'mowLawn',
        type: 'habit',
        icon: 'seedling',
        color: 'green',
        direction: 'good',
        period: 'weekly',
        repeatDays: [0, 6],
        reminderTimes: ['10:00']
      },
      {
        key: 'washCar',
        type: 'habit',
        icon: 'car',
        color: 'blue',
        direction: 'good',
        period: 'weekly',
        repeatDays: [0, 6],
        reminderTimes: ['10:00']
      },
      {
        key: 'processMail',
        type: 'habit',
        icon: 'incomingmail',
        color: 'teal',
        direction: 'good',
        reminderTimes: ['19:00']
      }
    ]
  },
  {
    key: 'business',
    color: 'green',
    templates: [
      {
        key: 'revenue',
        type: 'target',
        icon: 'cash',
        color: 'green',
        unit: '$',
        accumulation: 'latest',
        deadlineMonths: 12,
        reminderTimes: ['12:00']
      },
      {
        key: 'expenses',
        type: 'average',
        icon: 'flymoney',
        color: 'red',
        targetValue: 1000,
        goalDirection: 'at_most',
        period: 'monthly',
        averageWindow: 'rolling',
        rollingDays: 365,
        reminderTimes: ['12:00']
      },
      {
        key: 'profit',
        type: 'average',
        icon: 'piggy',
        color: 'green',
        targetValue: 1000,
        period: 'monthly',
        averageWindow: 'rolling',
        rollingDays: 365,
        reminderTimes: ['12:00']
      },
      {
        key: 'websiteVisitors',
        type: 'average',
        icon: 'laptop',
        color: 'blue',
        targetValue: 10000,
        period: 'monthly',
        averageWindow: 'rolling',
        rollingDays: 90,
        reminderTimes: ['12:00']
      },
      {
        key: 'emailList',
        type: 'target',
        icon: 'emailarrow',
        color: 'orange',
        unit: 'subs',
        accumulation: 'latest',
        deadlineMonths: 12,
        reminderTimes: ['12:00']
      },
      {
        key: 'followers',
        type: 'target',
        icon: 'people',
        color: 'purple',
        unit: 'followers',
        accumulation: 'latest',
        deadlineMonths: 12,
        reminderTimes: ['12:00']
      },
      {
        key: 'bookkeeping',
        type: 'habit',
        icon: 'write',
        color: 'teal',
        direction: 'good',
        period: 'weekly',
        repeatDays: [1, 2, 3, 4, 5],
        reminderTimes: ['16:00']
      },
      {
        key: 'payBillsBusiness',
        type: 'habit',
        icon: 'envelope',
        color: 'orange',
        direction: 'good',
        period: 'weekly',
        repeatDays: [1, 2, 3, 4, 5],
        reminderTimes: ['16:00']
      },
      {
        key: 'trackBusinessExpenses',
        type: 'habit',
        icon: 'receipt',
        color: 'red',
        direction: 'good',
        period: 'weekly',
        repeatDays: [1, 2, 3, 4, 5],
        reminderTimes: ['16:00']
      },
      {
        key: 'taxes',
        type: 'habit',
        icon: 'institution',
        color: 'blue',
        direction: 'good',
        period: 'monthly',
        reminderTimes: ['16:00']
      },
      {
        key: 'processInbox',
        type: 'habit',
        icon: 'inbox',
        color: 'teal',
        direction: 'good',
        targetValue: 3,
        period: 'weekly',
        repeatDays: [1, 2, 3, 4, 5],
        reminderTimes: ['16:00']
      },
      {
        key: 'networking',
        type: 'habit',
        icon: 'raisehand',
        color: 'orange',
        direction: 'good',
        period: 'weekly',
        repeatDays: [1, 2, 3, 4, 5],
        reminderTimes: ['19:00']
      },
      {
        key: 'businessReading',
        type: 'habit',
        icon: 'book',
        color: 'purple',
        direction: 'good',
        reminderTimes: ['19:00']
      },
      {
        key: 'mastermindMentor',
        type: 'habit',
        icon: 'teacher',
        color: 'pink',
        direction: 'good',
        period: 'weekly',
        reminderTimes: ['19:00']
      },
      {
        key: 'talkToCustomers',
        type: 'habit',
        icon: 'megaphone',
        color: 'red',
        direction: 'good',
        targetValue: 5,
        period: 'weekly',
        repeatDays: [1, 2, 3, 4, 5],
        reminderTimes: ['10:00']
      }
    ]
  }
]

/** The tracker `direction` a template should pre-fill. Habits carry their own
 *  `direction`; an average with an 'at_most' goal (Budget/Expenses — a ceiling)
 *  maps to 'bad' so calculateAverage scores it lower-is-better. Everything else
 *  (at_least averages, targets, missing template) defaults to 'good'. */
export function templateDirection(template?: Template): HabitDirection {
  if (!template) return 'good'
  if (template.goalDirection === 'at_most') return 'bad'
  return template.direction ?? 'good'
}

export function allTemplates(): Template[] {
  return TEMPLATE_CATEGORIES.flatMap((c) => c.templates)
}

export function findTemplate(key: string): Template | undefined {
  return allTemplates().find((t) => t.key === key)
}

/** Curated featured templates shown as one-tap quick-starts on the empty
 *  Trackers state. Quick-starts are just templates — their definition lives in
 *  TEMPLATE_CATEGORIES (single source of truth); here we only pick which ones.
 *  Balanced across types (4 habit / 2 target / 2 average) and categories; no
 *  `project` (needs milestones, unsuitable for one-tap). */
export const QUICK_START_KEYS = [
  'drinkWater',
  'exercise',
  'saveMoney',
  'read',
  'sleep',
  'meditate',
  'steps',
  'weight'
] as const

export function quickStartTemplates(): Template[] {
  return QUICK_START_KEYS.map((k) => findTemplate(k)).filter(
    (t): t is Template => t != null
  )
}

export function categoryByKey(key: string): TemplateCategory | undefined {
  return TEMPLATE_CATEGORIES.find((c) => c.key === key)
}

/** Case-insensitive search key. Diacritic-insensitive matching (esp. for
 *  Vietnamese horn/stroke letters) is deferred — not trivial to do correctly. */
export function normalizeText(s: string): string {
  return s.toLowerCase().trim()
}
