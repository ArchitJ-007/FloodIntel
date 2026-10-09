'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { PlaceResult } from '@/lib/places';

interface LocationSearchBoxProps {
  id?: string;
  placeholder?: string;
  initialValue?: string;
  onSelect: (place: PlaceResult) => void;
  onClearOrInvalidate?: () => void;
  className?: string;
  inputClassName?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  icon?: string;
  iconColor?: string;
  showClear?: boolean;
}

export function LocationSearchBox({
  id = 'location-search',
  placeholder = 'Search Indian city, district, or locality (e.g. Mumbai, Delhi, Silk Board)...',
  initialValue = '',
  onSelect,
  onClearOrInvalidate,
  className = '',
  inputClassName = '',
  autoFocus = false,
  disabled = false,
  icon = 'search',
  iconColor = 'text-outline',
  showClear = true,
}: LocationSearchBoxProps) {
  const [query, setQuery] = useState(initialValue);
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync initialValue changes
  useEffect(() => {
    setQuery(initialValue);
  }, [initialValue]);

  // Click-outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchResults = useCallback(async (searchQuery: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/places/search?q=${encodeURIComponent(searchQuery)}`, {
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error('Search failed');
      }

      const data = await res.json();
      if (abortControllerRef.current === controller) {
        const placeList: PlaceResult[] = Array.isArray(data.results) ? data.results : [];
        setResults(placeList);
        setIsOpen(true);
        setActiveIndex(-1);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError' && abortControllerRef.current === controller) {
        setErrorMessage('Location lookup unavailable.');
        setResults([]);
      }
    } finally {
      if (abortControllerRef.current === controller) {
        setIsLoading(false);
      }
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    // PRD F-06: Editing the text after selection invalidates old coordinates
    onClearOrInvalidate?.();

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (val.trim().length >= 2) {
      debounceTimerRef.current = setTimeout(() => {
        fetchResults(val.trim());
      }, 250);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  };

  const handleSelectPlace = (place: PlaceResult) => {
    setQuery(place.formattedAddress || place.name);
    setIsOpen(false);
    setResults([]);
    onSelect(place);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      if (results.length > 0) setIsOpen(true);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < results.length) {
        handleSelectPlace(results[activeIndex]);
      } else if (results.length === 1) {
        handleSelectPlace(results[0]);
      } else if (results.length > 0) {
        // Highlight first option rather than blindly selecting mismatched result
        setActiveIndex(0);
        setIsOpen(true);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    onClearOrInvalidate?.();
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Input Field Container */}
      <div className="relative flex items-center w-full">
        <span
          className={`material-symbols-outlined absolute left-3 text-lg pointer-events-none ${iconColor}`}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {icon}
        </span>

        <input
          ref={inputRef}
          id={id}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0 && query.trim().length >= 2) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={`${id}-listbox`}
          aria-activedescendant={
            activeIndex >= 0 && results[activeIndex]
              ? `${id}-option-${results[activeIndex].id}`
              : undefined
          }
          className={`w-full pl-9 pr-10 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg text-xs sm:text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all ${inputClassName}`}
        />

        {/* Right Trailing Action: Loading Spinner or Clear (X) */}
        <div className="absolute right-2.5 flex items-center gap-1">
          {isLoading && (
            <span className="material-symbols-outlined text-sm animate-spin text-primary">
              sync
            </span>
          )}

          {!isLoading && showClear && query.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded hover:bg-surface-container text-outline hover:text-on-surface transition-colors"
              title="Clear search"
            >
              <span className="material-symbols-outlined text-xs">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Suggestion Dropdown Popover */}
      {isOpen && (
        <div
          id={`${id}-listbox`}
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1.5 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-2xl overflow-hidden z-[9999] max-h-72 overflow-y-auto"
        >
          {errorMessage && (
            <div className="p-3 text-xs text-error flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">warning</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {!errorMessage && results.length === 0 && !isLoading && (
            <div className="p-4 text-center text-xs text-on-surface-variant">
              <span className="material-symbols-outlined text-base text-outline block mb-1">
                location_off
              </span>
              <span>No places found for &quot;{query}&quot;. Try a city, state, or landmark.</span>
            </div>
          )}

          {!errorMessage &&
            results.map((place, idx) => {
              const isSelected = idx === activeIndex;
              return (
                <div
                  key={place.id}
                  id={`${id}-option-${place.id}`}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelectPlace(place)}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={`px-3.5 py-2.5 flex items-start gap-2.5 cursor-pointer border-b border-outline-variant/30 last:border-b-0 transition-colors ${
                    isSelected
                      ? 'bg-primary/15 text-primary'
                      : 'hover:bg-surface-container text-on-surface'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-base mt-0.5 shrink-0 ${
                      place.source === 'curated'
                        ? 'text-amber-400'
                        : isSelected
                        ? 'text-primary'
                        : 'text-outline'
                    }`}
                  >
                    {place.source === 'curated' ? 'flood' : 'location_on'}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-xs sm:text-sm text-on-surface truncate">
                        {place.name}
                      </span>
                      {place.state && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-container border border-outline-variant text-on-surface-variant shrink-0">
                          {place.state}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-on-surface-variant truncate mt-0.5">
                      {place.formattedAddress}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-[9px] font-mono text-outline">
                      <span>
                        {place.lat.toFixed(4)}° N, {place.lng.toFixed(4)}° E
                      </span>
                      {place.source === 'curated' && (
                        <span className="text-amber-400 font-bold">• Urban Inundation Hotspot</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
