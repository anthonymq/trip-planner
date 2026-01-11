import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Check, 
  Circle,
  ClipboardList,
  Shirt,
  FileText,
  Smartphone,
  Package,
  ChevronDown,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { ChecklistItem } from '../types';

interface ChecklistViewProps {
  items: ChecklistItem[];
  onUpdateItems: (items: ChecklistItem[]) => void;
}

type CategoryType = 'documents' | 'clothing' | 'toiletries' | 'electronics' | 'other';

const CATEGORIES: { id: CategoryType; label: string; icon: React.ReactNode }[] = [
  { id: 'documents', label: 'Documents', icon: <FileText className="w-4 h-4" /> },
  { id: 'clothing', label: 'Clothing', icon: <Shirt className="w-4 h-4" /> },
  { id: 'toiletries', label: 'Toiletries', icon: <Package className="w-4 h-4" /> },
  { id: 'electronics', label: 'Electronics', icon: <Smartphone className="w-4 h-4" /> },
  { id: 'other', label: 'Other', icon: <ClipboardList className="w-4 h-4" /> },
];

const CATEGORY_COLORS: Record<CategoryType, { bg: string; text: string; border: string }> = {
  documents: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
  clothing: { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800' },
  toiletries: { bg: 'bg-pink-50 dark:bg-pink-900/20', text: 'text-pink-600 dark:text-pink-400', border: 'border-pink-200 dark:border-pink-800' },
  electronics: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' },
  other: { bg: 'bg-sand-50 dark:bg-slate-700', text: 'text-sand-600 dark:text-slate-400', border: 'border-sand-200 dark:border-slate-600' },
};

const SUGGESTED_ITEMS: Record<CategoryType, string[]> = {
  documents: ['Passport', 'Travel insurance', 'Flight tickets', 'Hotel confirmation', 'ID card', 'Visa documents'],
  clothing: ['T-shirts', 'Pants/shorts', 'Underwear', 'Socks', 'Jacket', 'Comfortable shoes', 'Sleepwear', 'Swimsuit'],
  toiletries: ['Toothbrush', 'Toothpaste', 'Shampoo', 'Sunscreen', 'Deodorant', 'Medications', 'First aid kit'],
  electronics: ['Phone charger', 'Power bank', 'Camera', 'Headphones', 'Travel adapter', 'Laptop'],
  other: ['Cash/cards', 'Snacks', 'Water bottle', 'Travel pillow', 'Umbrella', 'Sunglasses', 'Books/entertainment'],
};

const ChecklistView: React.FC<ChecklistViewProps> = ({ items, onUpdateItems }) => {
  const [newItemText, setNewItemText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('other');
  const [expandedCategories, setExpandedCategories] = useState<Set<CategoryType>>(new Set(CATEGORIES.map(c => c.id)));
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleAddItem = () => {
    if (!newItemText.trim()) return;
    
    const newItem: ChecklistItem = {
      id: Math.random().toString(36).substr(2, 9),
      text: newItemText.trim(),
      checked: false,
      category: selectedCategory,
    };
    
    onUpdateItems([...items, newItem]);
    setNewItemText('');
  };

  const handleToggleItem = (id: string) => {
    onUpdateItems(
      items.map(item => 
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const handleDeleteItem = (id: string) => {
    onUpdateItems(items.filter(item => item.id !== id));
  };

  const handleAddSuggested = (text: string, category: CategoryType) => {
    // Check if item already exists
    if (items.some(item => item.text.toLowerCase() === text.toLowerCase())) return;
    
    const newItem: ChecklistItem = {
      id: Math.random().toString(36).substr(2, 9),
      text,
      checked: false,
      category,
    };
    
    onUpdateItems([...items, newItem]);
  };

  const toggleCategory = (category: CategoryType) => {
    const next = new Set(expandedCategories);
    if (next.has(category)) {
      next.delete(category);
    } else {
      next.add(category);
    }
    setExpandedCategories(next);
  };

  const groupedItems = CATEGORIES.map(cat => ({
    ...cat,
    items: items.filter(item => (item.category || 'other') === cat.id),
  }));

  const totalItems = items.length;
  const checkedItems = items.filter(i => i.checked).length;
  const progressPercent = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;

  return (
    <div className="p-4 lg:p-6 pb-20 lg:pb-6">
      {/* Progress Header */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 mb-6 border border-sand-100 dark:border-slate-700 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-terracotta-100 dark:bg-terracotta-900/30 rounded-xl flex items-center justify-center text-terracotta-600 dark:text-terracotta-400">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-ocean-900 dark:text-sand-100">Packing Checklist</h3>
              <p className="text-xs text-sand-500 dark:text-slate-400">
                {checkedItems} of {totalItems} items packed
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-terracotta-600 dark:text-terracotta-400">{progressPercent}%</span>
          </div>
        </div>
        <div className="h-2 bg-sand-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-terracotta-400 to-terracotta-600 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Add New Item */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 mb-6 border border-sand-100 dark:border-slate-700 shadow-sm">
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
            placeholder="Add item to pack..."
            className="flex-1 px-4 py-3 bg-sand-50 dark:bg-slate-700 border border-sand-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-terracotta-500 focus:border-transparent transition-all text-ocean-900 dark:text-sand-100 placeholder:text-sand-400 dark:placeholder:text-slate-500"
          />
          <button
            onClick={handleAddItem}
            disabled={!newItemText.trim()}
            className="px-4 py-3 bg-terracotta-500 text-white rounded-xl font-bold text-sm hover:bg-terracotta-600 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-terracotta-500/20"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
        
        {/* Category Pills */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(cat => {
            const colors = CATEGORY_COLORS[cat.id];
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isSelected 
                    ? `${colors.bg} ${colors.text} ring-2 ring-offset-1 ring-current` 
                    : 'bg-sand-50 dark:bg-slate-700 text-sand-500 dark:text-slate-400 hover:bg-sand-100 dark:hover:bg-slate-600'
                }`}
              >
                {cat.icon}
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Suggestions Toggle */}
      <button
        onClick={() => setShowSuggestions(!showSuggestions)}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 mb-6 bg-gradient-to-r from-terracotta-50 to-amber-50 dark:from-terracotta-900/20 dark:to-amber-900/20 border border-terracotta-200 dark:border-terracotta-800 rounded-xl text-sm font-bold text-terracotta-700 dark:text-terracotta-300 hover:from-terracotta-100 hover:to-amber-100 dark:hover:from-terracotta-900/30 dark:hover:to-amber-900/30 transition-all"
      >
        <Sparkles className="w-4 h-4" />
        {showSuggestions ? 'Hide Suggestions' : 'Show Packing Suggestions'}
        {showSuggestions ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      {/* Suggestions Panel */}
      {showSuggestions && (
        <div className="bg-gradient-to-br from-terracotta-50/50 to-amber-50/50 dark:from-terracotta-900/10 dark:to-amber-900/10 rounded-2xl p-4 mb-6 border border-terracotta-100 dark:border-terracotta-900/30">
          <p className="text-xs font-bold text-terracotta-600 dark:text-terracotta-400 uppercase tracking-wider mb-3">
            Quick Add Suggestions
          </p>
          <div className="space-y-3">
            {CATEGORIES.map(cat => {
              const existingTexts = new Set(items.map(i => i.text.toLowerCase()));
              const suggestions = SUGGESTED_ITEMS[cat.id].filter(s => !existingTexts.has(s.toLowerCase()));
              if (suggestions.length === 0) return null;
              
              return (
                <div key={cat.id}>
                  <p className="text-xs font-bold text-sand-500 dark:text-slate-400 mb-2 flex items-center gap-1">
                    {cat.icon} {cat.label}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestions.slice(0, 6).map(text => (
                      <button
                        key={text}
                        onClick={() => handleAddSuggested(text, cat.id)}
                        className="px-2.5 py-1 bg-white dark:bg-slate-700 border border-sand-200 dark:border-slate-600 rounded-lg text-xs font-medium text-ocean-700 dark:text-sand-200 hover:bg-terracotta-50 dark:hover:bg-terracotta-900/20 hover:border-terracotta-300 dark:hover:border-terracotta-700 hover:text-terracotta-700 dark:hover:text-terracotta-300 transition-all"
                      >
                        + {text}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Grouped Checklist */}
      <div className="space-y-4">
        {groupedItems.map(group => {
          if (group.items.length === 0) return null;
          
          const colors = CATEGORY_COLORS[group.id];
          const isExpanded = expandedCategories.has(group.id);
          const checkedCount = group.items.filter(i => i.checked).length;
          
          return (
            <div key={group.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-sand-100 dark:border-slate-700 overflow-hidden shadow-sm">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(group.id)}
                className={`w-full flex items-center justify-between p-4 ${colors.bg} ${colors.border} border-b transition-colors`}
              >
                <div className="flex items-center gap-3">
                  <div className={`${colors.text}`}>
                    {group.icon}
                  </div>
                  <span className={`font-bold text-sm ${colors.text}`}>{group.label}</span>
                  <span className="text-xs font-medium text-sand-400 dark:text-slate-500">
                    ({checkedCount}/{group.items.length})
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-sand-400 dark:text-slate-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-sand-400 dark:text-slate-500" />
                )}
              </button>
              
              {/* Items */}
              {isExpanded && (
                <div className="divide-y divide-sand-100 dark:divide-slate-700">
                  {group.items.map(item => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 p-4 transition-all ${
                        item.checked ? 'bg-sand-50/50 dark:bg-slate-700/30' : ''
                      }`}
                    >
                      <button
                        onClick={() => handleToggleItem(item.id)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                          item.checked
                            ? 'bg-terracotta-500 border-terracotta-500 text-white'
                            : 'border-sand-300 dark:border-slate-500 hover:border-terracotta-400 dark:hover:border-terracotta-500'
                        }`}
                      >
                        {item.checked && <Check className="w-3.5 h-3.5" />}
                      </button>
                      <span className={`flex-1 text-sm transition-all ${
                        item.checked 
                          ? 'text-sand-400 dark:text-slate-500 line-through' 
                          : 'text-ocean-900 dark:text-sand-100'
                      }`}>
                        {item.text}
                      </span>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-2 text-sand-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {totalItems === 0 && (
        <div className="text-center py-16 px-6">
          <div className="w-20 h-20 bg-sand-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="w-10 h-10 text-sand-300 dark:text-slate-600" />
          </div>
          <h3 className="font-bold text-ocean-900 dark:text-sand-100 mb-2">No items yet</h3>
          <p className="text-sm text-sand-500 dark:text-slate-400 mb-4">
            Start adding items to your packing checklist so you don't forget anything!
          </p>
          <button
            onClick={() => setShowSuggestions(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-terracotta-500 text-white rounded-xl text-sm font-bold hover:bg-terracotta-600 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Get Suggestions
          </button>
        </div>
      )}
    </div>
  );
};

export default ChecklistView;
