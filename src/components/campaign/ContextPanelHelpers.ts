export function formatPopulation(pop: number): string {
  if (pop >= 1_000_000_000) {
    return `${(pop / 1_000_000_000).toFixed(1)}B`;
  }
  if (pop >= 1_000_000) {
    return `${(pop / 1_000_000).toFixed(1)}M`;
  }
  if (pop >= 1_000) {
    return `${(pop / 1_000).toFixed(1)}K`;
  }
  return pop.toLocaleString();
}

export function formatCBills(amount: number): string {
  return amount.toLocaleString('en-US');
}

export function getArmorColor(percent: number): string {
  if (percent >= 75) return 'bg-emerald-500';
  if (percent >= 50) return 'bg-amber-500';
  if (percent >= 25) return 'bg-orange-500';
  return 'bg-red-500';
}

export function getArmorTextColor(percent: number): string {
  if (percent >= 75) return 'text-emerald-400';
  if (percent >= 50) return 'text-amber-400';
  if (percent >= 25) return 'text-orange-400';
  return 'text-red-400';
}

export function getStatusBadgeStyle(status: string): string {
  const statusLower = status.toLowerCase();
  if (statusLower === 'ready' || statusLower === 'operational') {
    return 'bg-emerald-900/50 text-emerald-400 border-emerald-700/50';
  }
  if (statusLower === 'damaged' || statusLower === 'injured') {
    return 'bg-amber-900/50 text-amber-400 border-amber-700/50';
  }
  if (statusLower === 'critical' || statusLower === 'destroyed') {
    return 'bg-red-900/50 text-red-400 border-red-700/50';
  }
  if (statusLower === 'repairing' || statusLower === 'recovering') {
    return 'bg-sky-900/50 text-sky-400 border-sky-700/50';
  }
  return 'bg-slate-700/50 text-slate-400 border-slate-600/50';
}
