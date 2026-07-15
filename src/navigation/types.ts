import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import type { TrackerType } from '@features/trackers/types'

export type MainTabParamList = {
  Today: undefined
  Trackers: undefined
  Settings: undefined
}

export type RootStackParamList = {
  MainTabs: undefined
  TrackerDetail: { trackerId: string }
  TrackerForm: { trackerId?: string; type: TrackerType; templateKey?: string }
  TrackerTypePicker: undefined
  TemplateCategory: { category: string }
  TemplateCategories: undefined
  SyncBackup: undefined
}

export type MainTabProps<T extends keyof MainTabParamList> =
  BottomTabScreenProps<MainTabParamList, T>
export type RootStackProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>
