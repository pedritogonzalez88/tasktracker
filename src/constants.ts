export const PROJECT_STATUSES = ['Active', 'On Hold', 'Completed'] as const;
export type ProjectStatus = typeof PROJECT_STATUSES[number];

export const THEME_COLORS = [
  { bg: 'bg-blue-500', name: 'Blue' },
  { bg: 'bg-emerald-500', name: 'Emerald' },
  { bg: 'bg-indigo-500', name: 'Indigo' },
  { bg: 'bg-orange-500', name: 'Orange' },
  { bg: 'bg-pink-500', name: 'Pink' },
  { bg: 'bg-purple-500', name: 'Purple' }
];

export const NOTE_COLORS = [
  'bg-[#fffebd] border-[#f0edaa]', 
  'bg-blue-50 border-blue-200',
  'bg-[#e6fcf5] border-emerald-200', 
  'bg-white border-slate-200 shadow-sm'
];

export const TASK_PRIORITIES = ['Low', 'Medium', 'High'] as const;
export type TaskPriority = typeof TASK_PRIORITIES[number];
