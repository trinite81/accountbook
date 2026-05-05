export type ViewFilter = 'mine' | 'all' | 'compare'

export const USER_COLORS = ['#3b82f6', '#f97316', '#10b981', '#8b5cf6', '#ec4899']

export function getUserColor(userId: string, members: { userId: string }[]): string {
  const idx = members.findIndex((m) => m.userId === userId)
  return USER_COLORS[idx >= 0 ? idx % USER_COLORS.length : 0]
}
