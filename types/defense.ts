export interface Tag {
  id: string
  name: string
  color: string
  createdAt?: string
}

export interface DefenseTag {
  id: string
  tag: Tag
}

export interface Counter {
  id: string
  counterMonsters: string
  description: string | null
  createdBy: string
  updatedBy: string
  createdAt: string
  updatedAt: string
}

export interface Defense {
  id: string
  userId: string
  leaderMonster: string
  monster2: string
  monster3: string
  strengths: string | null
  weaknesses: string | null
  attackSequence: string | null
  notes: string | null
  pinnedToDashboard: boolean
  isPublic: boolean
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string
  counters: Counter[]
  tags: DefenseTag[]
}

