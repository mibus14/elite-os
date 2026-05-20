'use client';

interface TitleUser {
  streak: number;
  level: number;
  deathCount: number;
  statStr: number;
  statInt: number;
  comboStreak: number;
  rank: string;
}

export function getTitle(user: TitleUser): { title: string; color: string } {
  if (user.rank === 'Diamond' && user.streak >= 30) return { title: 'Leyenda', color: 'text-cyan-300' };
  if (user.streak >= 30) return { title: 'El Incansable', color: 'text-yellow-400' };
  if (user.statStr >= 50) return { title: 'Maestro del Hierro', color: 'text-red-400' };
  if (user.statInt >= 50) return { title: 'Oráculo', color: 'text-purple-400' };
  if (user.comboStreak >= 7) return { title: 'Combo Master', color: 'text-orange-400' };
  if (user.deathCount >= 3) return { title: 'El Resurrecto', color: 'text-gray-400' };
  if (user.level >= 10) return { title: 'Veterano', color: 'text-blue-400' };
  if (user.streak >= 7) return { title: 'Constante', color: 'text-green-400' };
  return { title: 'Recluta', color: 'text-gray-500' };
}

interface TitleBadgeProps {
  user: TitleUser;
}

export default function TitleBadge({ user }: TitleBadgeProps) {
  const { title, color } = getTitle(user);
  return <span className={`text-xs font-bold ${color}`}>「{title}」</span>;
}
