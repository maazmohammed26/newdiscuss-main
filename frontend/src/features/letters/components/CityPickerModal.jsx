import React, { useState, useMemo, useEffect, useRef } from 'react';
import { X, Search, MapPin, Check, Plus } from 'lucide-react';
import { searchCities, POPULAR_CITIES } from '../city/indiaCities';

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
        className="w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="city-picker-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 id="city-picker-title" className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Select Origin City
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Stamped on your letter as the mailing origin
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search bar */}
        <div className="p-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search 350+ Indian cities & towns..."
              className="w-full pl-9 pr-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 border-0 rounded-xl text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-700 transition-all"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* City list / popular chips with hidden scrollbar */}
        <div 
          className="flex-1 overflow-y-auto p-4 space-y-4"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {!query.trim() && (
            <div>
              <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2.5">
                Popular Cities
              </div>
              <div className="flex flex-wrap gap-2">
                {POPULAR_CITIES.map((city) => {
                  const isSelected = selectedCity?.id === city.id || selectedCity?.name === city.name;
                  return (
                    <button
                      key={city.id}
                      onClick={() => handleSelect(city)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-neutral-900 dark:bg-white text-white dark:text-black shadow-xs'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
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
              <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                Search Results ({searchResults.length})
              </div>
              {searchResults.map((city) => {
                const isSelected = selectedCity?.id === city.id;
                return (
                  <button
                    key={city.id}
                    onClick={() => handleSelect(city)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white font-semibold'
                        : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/60 text-neutral-800 dark:text-neutral-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      <span>{city.name}</span>
                      {city.state && (
                        <span className="text-xs text-neutral-400">({city.state})</span>
                      )}
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-neutral-900 dark:text-white" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* No results */}
          {query.trim() && searchResults.length === 0 && !isAddingCustom && (
            <div className="py-8 text-center">
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                No city found matching "{query}"
              </p>
              <button
                onClick={() => {
                  setCustomCity(query);
                  setIsAddingCustom(true);
                }}
                className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-neutral-900 dark:text-white bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-xl transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add "{query}" as custom city
              </button>
            </div>
          )}

          {/* Custom city form */}
          {isAddingCustom && (
            <form onSubmit={handleCustomSubmit} className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl space-y-3">
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Enter Custom City / Town Name
              </label>
              <input
                type="text"
                value={customCity}
                onChange={(e) => setCustomCity(e.target.value.slice(0, 48))}
                placeholder="e.g., Kalady, Kerala"
                className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-400"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingCustom(false)}
                  className="px-3 py-1.5 text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!customCity.trim()}
                  className="px-3 py-1.5 text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-black rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Use Custom City
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer options */}
        <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 flex items-center justify-between">
          {onToggleRemember && (
            <label className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberCity}
                onChange={(e) => onToggleRemember(e.target.checked)}
                className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-400"
              />
              <span>Remember as my default city</span>
            </label>
          )}

          <button
            onClick={() => handleSelect(null)}
            className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 ml-auto cursor-pointer"
          >
            Clear / Omit City
          </button>
        </div>
      </div>
    </div>
  );
}
