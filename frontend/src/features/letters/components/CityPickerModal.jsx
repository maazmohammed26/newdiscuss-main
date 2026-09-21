import React, { useState, useMemo, useEffect, useRef } from 'react';
import { X, Search, MapPin, Check, Plus } from 'lucide-react';
import { searchCities, POPULAR_CITIES, formatCityLabel } from '../city/indiaCities';

export default function CityPickerModal({
  isOpen,
  onClose,
  onSelectCity,
  selectedCity = null,
  rememberCity = false,
  onToggleRemember = null,
}) {
  const [query, setQuery] = useState('');
  const [customCity, setCustomCity] = useState('');
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setIsAddingCustom(false);
      setCustomCity('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    return searchCities(query.trim(), 35);
  }, [query]);

  if (!isOpen) return null;

  const handleSelect = (city) => {
    onSelectCity(city);
    onClose();
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    const clean = customCity.trim().slice(0, 48);
    if (!clean) return;
    const customRecord = {
      id: `custom_${Date.now()}`,
      name: clean,
      state: 'India',
      isCustom: true,
    };
    onSelectCity(customRecord);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="city-picker-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 id="city-picker-title" className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Select Origin City
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Stamped on your letter as the mailing origin
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search bar */}
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search 350+ Indian cities & towns..."
              className="w-full pl-9 pr-4 py-2.5 bg-zinc-100 dark:bg-zinc-800/80 border border-transparent focus:border-amber-500 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none transition-all"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* City list / popular chips */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!query.trim() && (
            <div>
              <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2.5">
                Popular Cities
              </div>
              <div className="flex flex-wrap gap-2">
                {POPULAR_CITIES.map((city) => {
                  const isSelected = selectedCity?.id === city.id || selectedCity?.name === city.name;
                  return (
                    <button
                      key={city.id}
                      onClick={() => handleSelect(city)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-amber-500 text-white shadow-sm'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400'
                      }`}
                    >
                      {city.name}
                      {isSelected && <Check className="w-3 h-3" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Search results */}
          {query.trim() && searchResults.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                Search Results ({searchResults.length})
              </div>
              {searchResults.map((city) => {
                const isSelected = selectedCity?.id === city.id;
                return (
                  <button
                    key={city.id}
                    onClick={() => handleSelect(city)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-sm transition-colors ${
                      isSelected
                        ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 font-medium'
                        : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span>{city.name}</span>
                      {city.state && (
                        <span className="text-xs text-zinc-400">({city.state})</span>
                      )}
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-amber-500" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* No results */}
          {query.trim() && searchResults.length === 0 && !isAddingCustom && (
            <div className="py-8 text-center">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                No city found matching "{query}"
              </p>
              <button
                onClick={() => {
                  setCustomCity(query);
                  setIsAddingCustom(true);
                }}
                className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add "{query}" as custom city
              </button>
            </div>
          )}

          {/* Custom city form */}
          {isAddingCustom && (
            <form onSubmit={handleCustomSubmit} className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl space-y-3">
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                Enter Custom City / Town Name
              </label>
              <input
                type="text"
                value={customCity}
                onChange={(e) => setCustomCity(e.target.value.slice(0, 48))}
                placeholder="e.g., Kalady, Kerala"
                className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingCustom(false)}
                  className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!customCity.trim()}
                  className="px-3 py-1.5 text-xs font-medium bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg transition-colors"
                >
                  Use Custom City
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer options */}
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between">
          {onToggleRemember && (
            <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberCity}
                onChange={(e) => onToggleRemember(e.target.checked)}
                className="rounded border-zinc-300 text-amber-500 focus:ring-amber-500/20"
              />
              <span>Remember as my default city</span>
            </label>
          )}

          <button
            onClick={() => handleSelect(null)}
            className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 ml-auto"
          >
            Clear / Omit City
          </button>
        </div>
      </div>
    </div>
  );
}
