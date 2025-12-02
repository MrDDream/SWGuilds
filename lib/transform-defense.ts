import { Defense } from '@/types/defense'

type PrismaDefense = {
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
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy: string
  counters: {
    id: string
    counterMonsters: string
    description: string | null
    createdBy: string
    updatedBy: string
    createdAt: Date
    updatedAt: Date
    votes?: {
      voteType: string
    }[]
  }[]
  tags: {
    id: string
    tag: {
      id: string
      name: string
      color: string
      createdAt: Date
    }
  }[]
}

export function transformDefense(defense: PrismaDefense): Defense {
  return {
    ...defense,
    isPublic: defense.isPublic ?? true,
    createdAt: defense.createdAt.toISOString(),
    updatedAt: defense.updatedAt.toISOString(),
    counters: defense.counters
      .map(counter => {
        const likes = counter.votes?.filter((v: any) => v.voteType === 'like').length || 0
        const dislikes = counter.votes?.filter((v: any) => v.voteType === 'dislike').length || 0
        return {
          ...counter,
          createdAt: counter.createdAt.toISOString(),
          updatedAt: counter.updatedAt.toISOString(),
          likes,
          dislikes,
          votes: undefined, // Ne pas inclure les votes détaillés
        }
      })
      .sort((a, b) => {
        // Trier par likes décroissant, puis par dislikes croissant (plus de dislikes = plus bas)
        if (b.likes !== a.likes) {
          return b.likes - a.likes
        }
        if (a.dislikes !== b.dislikes) {
          return a.dislikes - b.dislikes // Plus de dislikes = plus bas
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }),
    tags: defense.tags.map(dt => ({
      id: dt.id,
      tag: {
        ...dt.tag,
        createdAt: dt.tag.createdAt.toISOString(),
      },
    })),
  }
}

