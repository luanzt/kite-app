import type {
  TrackerType,
  HabitDirection,
  Accumulation,
  Period
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
  targetValue?: number
  accumulation?: Accumulation
  period?: Period
}

export type TemplateCategory = {
  key: string // id + i18n key under template.categories.<key>
  color: string // accent for the category icon tile (palette name)
  templates: Template[]
}

/** Categories in design order, each populated from the Strides-style reference.
 *  Habits omit `period` (the form defaults to daily); averages omit `unit`
 *  (the average form stores unit as null). Only non-default values are set. */
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
        accumulation: 'latest'
      },
      {
        key: 'drinkWater',
        type: 'habit',
        icon: 'drop',
        color: 'cyan',
        direction: 'good'
      },
      {
        key: 'sleep',
        type: 'average',
        icon: 'sleep',
        color: 'indigo',
        targetValue: 8
      },
      {
        key: 'brushFloss',
        type: 'habit',
        icon: 'tooth',
        color: 'blue',
        direction: 'good'
      },
      {
        key: 'healthyMeal',
        type: 'habit',
        icon: 'salad',
        color: 'green',
        direction: 'good'
      },
      {
        key: 'foodJournal',
        type: 'habit',
        icon: 'read',
        color: 'orange',
        direction: 'good'
      },
      {
        key: 'eatVegetables',
        type: 'habit',
        icon: 'veggie',
        color: 'green',
        direction: 'good'
      },
      {
        key: 'eatFruit',
        type: 'habit',
        icon: 'apple',
        color: 'red',
        direction: 'good'
      },
      {
        key: 'calories',
        type: 'average',
        icon: 'calorie',
        color: 'orange',
        targetValue: 2000
      },
      {
        key: 'protein',
        type: 'average',
        icon: 'protein',
        color: 'red',
        targetValue: 100
      },
      {
        key: 'takeVitamins',
        type: 'habit',
        icon: 'pill',
        color: 'pink',
        direction: 'good'
      },
      {
        key: 'limitCaffeine',
        type: 'habit',
        icon: 'coffee',
        color: 'orange',
        direction: 'bad'
      },
      {
        key: 'noSugar',
        type: 'habit',
        icon: 'candy',
        color: 'pink',
        direction: 'bad'
      },
      {
        key: 'noJunkFood',
        type: 'habit',
        icon: 'fries',
        color: 'red',
        direction: 'bad'
      },
      {
        key: 'noSoda',
        type: 'habit',
        icon: 'soda',
        color: 'blue',
        direction: 'bad'
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
        direction: 'good'
      },
      {
        key: 'stretch',
        type: 'habit',
        icon: 'stretch',
        color: 'teal',
        direction: 'good'
      },
      {
        key: 'walk',
        type: 'habit',
        icon: 'walk',
        color: 'green',
        direction: 'good'
      },
      {
        key: 'run',
        type: 'habit',
        icon: 'run',
        color: 'orange',
        direction: 'good'
      },
      {
        key: 'intervalTraining',
        type: 'habit',
        icon: 'bolt',
        color: 'red',
        direction: 'good'
      },
      {
        key: 'weightLifting',
        type: 'habit',
        icon: 'muscle',
        color: 'red',
        direction: 'good'
      },
      {
        key: 'pushUps',
        type: 'average',
        icon: 'raise',
        color: 'orange',
        targetValue: 50
      },
      {
        key: 'crunches',
        type: 'average',
        icon: 'fire',
        color: 'red',
        targetValue: 50
      },
      {
        key: 'takeStairs',
        type: 'habit',
        icon: 'sneaker',
        color: 'teal',
        direction: 'good'
      },
      {
        key: 'playSport',
        type: 'habit',
        icon: 'sport',
        color: 'blue',
        direction: 'good'
      },
      {
        key: 'yoga',
        type: 'habit',
        icon: 'lotus',
        color: 'purple',
        direction: 'good'
      },
      {
        key: 'cycling',
        type: 'habit',
        icon: 'cycle',
        color: 'green',
        direction: 'good'
      },
      {
        key: 'swimming',
        type: 'habit',
        icon: 'swim',
        color: 'cyan',
        direction: 'good'
      },
      {
        key: 'standingDesk',
        type: 'habit',
        icon: 'stand',
        color: 'orange',
        direction: 'good'
      },
      {
        key: 'steps',
        type: 'average',
        icon: 'sneaker',
        color: 'teal',
        targetValue: 10000
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
        direction: 'good'
      },
      {
        key: 'journal',
        type: 'habit',
        icon: 'write',
        color: 'indigo',
        direction: 'good'
      },
      {
        key: 'goOutside',
        type: 'habit',
        icon: 'sun',
        color: 'orange',
        direction: 'good'
      },
      {
        key: 'pray',
        type: 'habit',
        icon: 'pray',
        color: 'blue',
        direction: 'good'
      },
      {
        key: 'gratitudeJournal',
        type: 'habit',
        icon: 'smile',
        color: 'pink',
        direction: 'good'
      },
      {
        key: 'watchFunny',
        type: 'habit',
        icon: 'laugh',
        color: 'orange',
        direction: 'good'
      },
      {
        key: 'readForFun',
        type: 'habit',
        icon: 'book',
        color: 'teal',
        direction: 'good'
      },
      {
        key: 'trySomethingNew',
        type: 'habit',
        icon: 'mountain',
        color: 'green',
        direction: 'good'
      },
      {
        key: 'playGame',
        type: 'habit',
        icon: 'game',
        color: 'purple',
        direction: 'good'
      },
      {
        key: 'relax',
        type: 'habit',
        icon: 'cool',
        color: 'blue',
        direction: 'good'
      },
      {
        key: 'quietTime',
        type: 'habit',
        icon: 'shush',
        color: 'indigo',
        direction: 'good'
      },
      {
        key: 'deepBreath',
        type: 'habit',
        icon: 'breathe',
        color: 'cyan',
        direction: 'good'
      },
      {
        key: 'volunteer',
        type: 'habit',
        icon: 'hand',
        color: 'pink',
        direction: 'good'
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
        direction: 'good'
      },
      {
        key: 'focusTopPriority',
        type: 'habit',
        icon: 'target',
        color: 'red',
        direction: 'good'
      },
      {
        key: 'planTomorrow',
        type: 'habit',
        icon: 'notebook',
        color: 'blue',
        direction: 'good'
      },
      {
        key: 'getUpEarly',
        type: 'habit',
        icon: 'alarm',
        color: 'orange',
        direction: 'good'
      },
      {
        key: 'inBedBy10',
        type: 'habit',
        icon: 'clock',
        color: 'indigo',
        direction: 'good'
      },
      {
        key: 'noSocialMedia',
        type: 'habit',
        icon: 'laptop',
        color: 'red',
        direction: 'bad'
      },
      {
        key: 'noPhoneInBed',
        type: 'habit',
        icon: 'phone',
        color: 'red',
        direction: 'bad'
      },
      {
        key: 'limitTv',
        type: 'habit',
        icon: 'tv',
        color: 'orange',
        direction: 'bad'
      },
      {
        key: 'limitVideoGames',
        type: 'habit',
        icon: 'game',
        color: 'orange',
        direction: 'bad'
      },
      {
        key: 'priorityBeforeEmail',
        type: 'habit',
        icon: 'star',
        color: 'blue',
        direction: 'good'
      },
      {
        key: 'inboxZero',
        type: 'habit',
        icon: 'envelope',
        color: 'teal',
        direction: 'good'
      },
      {
        key: 'pomodoro',
        type: 'habit',
        icon: 'tomato',
        color: 'red',
        direction: 'good'
      },
      {
        key: 'takeABreak',
        type: 'habit',
        icon: 'happy',
        color: 'green',
        direction: 'good'
      },
      {
        key: 'workSideProject',
        type: 'habit',
        icon: 'piggy',
        color: 'purple',
        direction: 'good'
      },
      {
        key: 'planTheWeek',
        type: 'habit',
        icon: 'calendar',
        color: 'blue',
        direction: 'good'
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
        period: 'monthly'
      },
      {
        key: 'saveMoney',
        type: 'target',
        icon: 'cash',
        color: 'green',
        unit: '$',
        accumulation: 'sum'
      },
      {
        key: 'debtFree',
        type: 'target',
        icon: 'party',
        color: 'pink',
        unit: '$',
        accumulation: 'sum'
      },
      {
        key: 'checkBankAccounts',
        type: 'habit',
        icon: 'bank',
        color: 'blue',
        direction: 'good'
      },
      {
        key: 'trackSpending',
        type: 'habit',
        icon: 'receipt',
        color: 'teal',
        direction: 'good'
      },
      {
        key: 'payBills',
        type: 'habit',
        icon: 'envelope',
        color: 'orange',
        direction: 'good'
      },
      {
        key: 'payCreditCards',
        type: 'habit',
        icon: 'card',
        color: 'red',
        direction: 'good'
      },
      {
        key: 'payLoans',
        type: 'habit',
        icon: 'institution',
        color: 'blue',
        direction: 'good'
      },
      {
        key: 'dinnerAtHome',
        type: 'habit',
        icon: 'plate',
        color: 'orange',
        direction: 'good'
      },
      {
        key: 'packLunch',
        type: 'habit',
        icon: 'takeout',
        color: 'green',
        direction: 'good'
      },
      {
        key: 'transferToSavings',
        type: 'habit',
        icon: 'flymoney',
        color: 'green',
        direction: 'good'
      },
      {
        key: 'noImpulseBuys',
        type: 'habit',
        icon: 'cart',
        color: 'red',
        direction: 'bad'
      },
      {
        key: 'income',
        type: 'average',
        icon: 'cash',
        color: 'green',
        period: 'monthly'
      },
      {
        key: 'retirementFund',
        type: 'target',
        icon: 'palm',
        color: 'teal',
        unit: '$',
        accumulation: 'latest'
      },
      {
        key: 'netWorth',
        type: 'target',
        icon: 'piggy',
        color: 'green',
        unit: '$',
        accumulation: 'latest'
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
        direction: 'good'
      },
      {
        key: 'study',
        type: 'habit',
        icon: 'notebook',
        color: 'indigo',
        direction: 'good'
      },
      {
        key: 'learnLanguage',
        type: 'habit',
        icon: 'globe',
        color: 'blue',
        direction: 'good'
      },
      {
        key: 'reviewNotes',
        type: 'habit',
        icon: 'memo',
        color: 'teal',
        direction: 'good'
      },
      {
        key: 'askQuestions',
        type: 'habit',
        icon: 'think',
        color: 'orange',
        direction: 'good'
      },
      {
        key: 'extracurriculars',
        type: 'habit',
        icon: 'medal',
        color: 'red',
        direction: 'good'
      },
      {
        key: 'homework',
        type: 'habit',
        icon: 'read',
        color: 'purple',
        direction: 'good'
      },
      {
        key: 'meetTutor',
        type: 'habit',
        icon: 'teacher',
        color: 'pink',
        direction: 'good'
      },
      {
        key: 'brainTraining',
        type: 'habit',
        icon: 'brain',
        color: 'pink',
        direction: 'good'
      },
      {
        key: 'flashCards',
        type: 'habit',
        icon: 'bluebook',
        color: 'blue',
        direction: 'good'
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
        direction: 'good'
      },
      {
        key: 'watchMovie',
        type: 'habit',
        icon: 'film',
        color: 'red',
        direction: 'good'
      },
      {
        key: 'playGames',
        type: 'habit',
        icon: 'game',
        color: 'purple',
        direction: 'good'
      },
      {
        key: 'playGuitar',
        type: 'habit',
        icon: 'guitar',
        color: 'orange',
        direction: 'good'
      },
      {
        key: 'playPiano',
        type: 'habit',
        icon: 'piano',
        color: 'indigo',
        direction: 'good'
      },
      {
        key: 'goGolfing',
        type: 'habit',
        icon: 'golf',
        color: 'green',
        direction: 'good'
      },
      {
        key: 'goFishing',
        type: 'habit',
        icon: 'fishing',
        color: 'blue',
        direction: 'good'
      },
      {
        key: 'gardening',
        type: 'habit',
        icon: 'blossom',
        color: 'pink',
        direction: 'good'
      },
      {
        key: 'listenMusic',
        type: 'habit',
        icon: 'headphone',
        color: 'purple',
        direction: 'good'
      },
      {
        key: 'knitting',
        type: 'habit',
        icon: 'yarn',
        color: 'orange',
        direction: 'good'
      },
      {
        key: 'sewing',
        type: 'habit',
        icon: 'thread',
        color: 'cyan',
        direction: 'good'
      },
      {
        key: 'crafts',
        type: 'habit',
        icon: 'artist',
        color: 'pink',
        direction: 'good'
      },
      {
        key: 'makeSomething',
        type: 'habit',
        icon: 'hammer',
        color: 'gray',
        direction: 'good'
      },
      {
        key: 'writing',
        type: 'habit',
        icon: 'write',
        color: 'indigo',
        direction: 'good'
      },
      {
        key: 'painting',
        type: 'habit',
        icon: 'paint',
        color: 'red',
        direction: 'good'
      },
      {
        key: 'photography',
        type: 'habit',
        icon: 'camera',
        color: 'blue',
        direction: 'good'
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
        direction: 'good'
      },
      {
        key: 'playWithKids',
        type: 'habit',
        icon: 'family',
        color: 'orange',
        direction: 'good'
      },
      {
        key: 'callMom',
        type: 'habit',
        icon: 'woman',
        color: 'pink',
        direction: 'good'
      },
      {
        key: 'callDad',
        type: 'habit',
        icon: 'man',
        color: 'blue',
        direction: 'good'
      },
      {
        key: 'callFriend',
        type: 'habit',
        icon: 'telephone',
        color: 'green',
        direction: 'good'
      },
      {
        key: 'textFriend',
        type: 'habit',
        icon: 'speech',
        color: 'cyan',
        direction: 'good'
      },
      {
        key: 'planGetTogether',
        type: 'habit',
        icon: 'memo',
        color: 'orange',
        direction: 'good'
      },
      {
        key: 'handwrittenLetter',
        type: 'habit',
        icon: 'loveletter',
        color: 'pink',
        direction: 'good'
      },
      {
        key: 'sayThankYou',
        type: 'habit',
        icon: 'blush',
        color: 'orange',
        direction: 'good'
      },
      {
        key: 'sayILoveYou',
        type: 'habit',
        icon: 'heart',
        color: 'red',
        direction: 'good'
      },
      {
        key: 'helpSomeone',
        type: 'habit',
        icon: 'handshake',
        color: 'green',
        direction: 'good'
      },
      {
        key: 'hangOutFriend',
        type: 'habit',
        icon: 'man',
        color: 'blue',
        direction: 'good'
      },
      {
        key: 'talkSomeoneNew',
        type: 'habit',
        icon: 'speaking',
        color: 'purple',
        direction: 'good'
      },
      {
        key: 'listenMore',
        type: 'habit',
        icon: 'ear',
        color: 'teal',
        direction: 'good'
      },
      {
        key: 'undividedAttention',
        type: 'habit',
        icon: 'target',
        color: 'indigo',
        direction: 'good'
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
        direction: 'good'
      },
      {
        key: 'laundry',
        type: 'habit',
        icon: 'basket',
        color: 'blue',
        direction: 'good'
      },
      {
        key: 'dishes',
        type: 'habit',
        icon: 'plate',
        color: 'teal',
        direction: 'good'
      },
      {
        key: 'sweepFloors',
        type: 'habit',
        icon: 'broom',
        color: 'orange',
        direction: 'good'
      },
      {
        key: 'mopFloors',
        type: 'habit',
        icon: 'sponge',
        color: 'cyan',
        direction: 'good'
      },
      {
        key: 'dusting',
        type: 'habit',
        icon: 'dash',
        color: 'gray',
        direction: 'good'
      },
      {
        key: 'makeBed',
        type: 'habit',
        icon: 'bed',
        color: 'indigo',
        direction: 'good'
      },
      {
        key: 'cookDinner',
        type: 'habit',
        icon: 'cook',
        color: 'red',
        direction: 'good'
      },
      {
        key: 'feedPets',
        type: 'habit',
        icon: 'cat',
        color: 'orange',
        direction: 'good'
      },
      {
        key: 'walkDog',
        type: 'habit',
        icon: 'dog',
        color: 'green',
        direction: 'good'
      },
      {
        key: 'cleanBathrooms',
        type: 'habit',
        icon: 'toilet',
        color: 'blue',
        direction: 'good'
      },
      {
        key: 'waterPlants',
        type: 'habit',
        icon: 'tree',
        color: 'green',
        direction: 'good'
      },
      {
        key: 'mowLawn',
        type: 'habit',
        icon: 'seedling',
        color: 'green',
        direction: 'good'
      },
      {
        key: 'washCar',
        type: 'habit',
        icon: 'car',
        color: 'blue',
        direction: 'good'
      },
      {
        key: 'processMail',
        type: 'habit',
        icon: 'incomingmail',
        color: 'teal',
        direction: 'good'
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
        accumulation: 'sum'
      },
      {
        key: 'expenses',
        type: 'average',
        icon: 'flymoney',
        color: 'red',
        period: 'monthly'
      },
      {
        key: 'profit',
        type: 'average',
        icon: 'piggy',
        color: 'green',
        period: 'monthly'
      },
      {
        key: 'websiteVisitors',
        type: 'average',
        icon: 'laptop',
        color: 'blue'
      },
      {
        key: 'emailList',
        type: 'target',
        icon: 'emailarrow',
        color: 'orange',
        unit: 'subs',
        accumulation: 'latest'
      },
      {
        key: 'followers',
        type: 'target',
        icon: 'people',
        color: 'purple',
        unit: 'followers',
        accumulation: 'latest'
      },
      {
        key: 'bookkeeping',
        type: 'habit',
        icon: 'write',
        color: 'teal',
        direction: 'good'
      },
      {
        key: 'payBillsBusiness',
        type: 'habit',
        icon: 'envelope',
        color: 'orange',
        direction: 'good'
      },
      {
        key: 'trackBusinessExpenses',
        type: 'habit',
        icon: 'receipt',
        color: 'red',
        direction: 'good'
      },
      {
        key: 'taxes',
        type: 'habit',
        icon: 'institution',
        color: 'blue',
        direction: 'good'
      },
      {
        key: 'processInbox',
        type: 'habit',
        icon: 'inbox',
        color: 'teal',
        direction: 'good'
      },
      {
        key: 'networking',
        type: 'habit',
        icon: 'raisehand',
        color: 'orange',
        direction: 'good'
      },
      {
        key: 'businessReading',
        type: 'habit',
        icon: 'book',
        color: 'purple',
        direction: 'good'
      },
      {
        key: 'mastermindMentor',
        type: 'habit',
        icon: 'teacher',
        color: 'pink',
        direction: 'good'
      },
      {
        key: 'talkToCustomers',
        type: 'habit',
        icon: 'megaphone',
        color: 'red',
        direction: 'good'
      }
    ]
  }
]

export function allTemplates(): Template[] {
  return TEMPLATE_CATEGORIES.flatMap((c) => c.templates)
}

export function findTemplate(key: string): Template | undefined {
  return allTemplates().find((t) => t.key === key)
}

export function categoryByKey(key: string): TemplateCategory | undefined {
  return TEMPLATE_CATEGORIES.find((c) => c.key === key)
}

/** Case-insensitive search key. Diacritic-insensitive matching (esp. for
 *  Vietnamese horn/stroke letters) is deferred — not trivial to do correctly. */
export function normalizeText(s: string): string {
  return s.toLowerCase().trim()
}
