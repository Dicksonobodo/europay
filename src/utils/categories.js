import {
  ArrowLeftRight, UtensilsCrossed, Car, ShoppingBag,
  Clapperboard, Receipt, HeartPulse, CircleDollarSign,
  Landmark, Package,
} from 'lucide-react';

export const CATEGORIES = {
  transfer: { label: 'Transfer', color: '#7c3aed', bg: 'rgba(124,58,237,0.12)', border: 'rgba(124,58,237,0.3)', icon: ArrowLeftRight },
  food: { label: 'Food & Dining', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', icon: UtensilsCrossed },
  transport: { label: 'Transport', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)', icon: Car },
  shopping: { label: 'Shopping', color: '#ec4899', bg: 'rgba(236,72,153,0.12)', border: 'rgba(236,72,153,0.3)', icon: ShoppingBag },
  entertainment: { label: 'Entertainment', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.3)', icon: Clapperboard },
  bills: { label: 'Bills & Utilities', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', icon: Receipt },
  health: { label: 'Health', color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', icon: HeartPulse },
  deposit: { label: 'Deposit', color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', icon: CircleDollarSign },
  withdrawal: { label: 'Withdrawal', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', icon: Landmark },
  other: { label: 'Other', color: '#6b7280', bg: 'rgba(107,114,128,0.12)', border: 'rgba(107,114,128,0.3)', icon: Package },
};

export const getCategory = (description = '') => {
  const d = description.toLowerCase();
  if (d.includes('admin deposit') || d.includes('deposit')) return 'deposit';
  if (d.includes('withdrawal')) return 'withdrawal';
  if (d.includes('transfer to') || d.includes('transfer from') || d.includes('split bill') || d.includes('request')) return 'transfer';
  if (d.includes('food') || d.includes('restaurant') || d.includes('cafe') || d.includes('coffee') || d.includes('pizza') || d.includes('dinner') || d.includes('lunch') || d.includes('breakfast') || d.includes('grocery') || d.includes('supermarket')) return 'food';
  if (d.includes('uber') || d.includes('taxi') || d.includes('bus') || d.includes('train') || d.includes('metro') || d.includes('fuel') || d.includes('parking') || d.includes('transport')) return 'transport';
  if (d.includes('amazon') || d.includes('shop') || d.includes('store') || d.includes('mall') || d.includes('market') || d.includes('buy')) return 'shopping';
  if (d.includes('netflix') || d.includes('spotify') || d.includes('cinema') || d.includes('movie') || d.includes('game') || d.includes('entertainment')) return 'entertainment';
  if (d.includes('rent') || d.includes('electricity') || d.includes('water') || d.includes('internet') || d.includes('phone') || d.includes('bill') || d.includes('utility')) return 'bills';
  if (d.includes('doctor') || d.includes('hospital') || d.includes('pharmacy') || d.includes('health') || d.includes('medical') || d.includes('gym')) return 'health';
  return 'other';
};

export const getCategoryInfo = (description) => {
  const key = getCategory(description);
  return { key, ...CATEGORIES[key] };
};