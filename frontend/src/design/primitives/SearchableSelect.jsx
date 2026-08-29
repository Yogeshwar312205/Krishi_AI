import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';

/**
 * Searchable dropdown select component with filter functionality.
 * 
 * Features:
 * - Live search/filter as you type
 * - Keyboard navigation (arrow keys, enter, escape)
 * - Click outside to close
 * - Highlights selected option
 * - Responsive design
 * 
 * @param {Object} props
 * @param {string} props.label - Label text
 * @param {string} props.value - Selected value
 * @param {Function} props.onChange - Change handler (value) => void
 * @param {Array} props.options - Array of {value, label, ...} objects
 * @param {string} props.placeholder - Placeholder text
 * @param {string} props.id - HTML id attribute
 * @param {string} props.searchPlaceholder - Search input placeholder
 */
export const SearchableSelect = ({
  label,
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  id,
  searchPlaceholder = 'Search...',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const optionsRef = useRef([]);

  // Filter options based on search query
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(search.toLowerCase()) ||
    option.value.toLowerCase().includes(search.toLowerCase()) ||
    (option.district && option.district.toLowerCase().includes(search.toLowerCase()))
  );

  // Get display text for selected value
  const selectedOption = options.find((opt) => opt.value === value);
  const displayText = selectedOption ? selectedOption.label : placeholder;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearch('');
        setFocusedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (event) => {
    if (!isOpen) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setFocusedIndex((prev) => Math.min(prev + 1, filteredOptions.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setFocusedIndex((prev) => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        event.preventDefault();
        if (focusedIndex >= 0 && filteredOptions[focusedIndex]) {
          handleSelect(filteredOptions[focusedIndex].value);
        }
        break;
      case 'Escape':
        event.preventDefault();
        setIsOpen(false);
        setSearch('');
        setFocusedIndex(-1);
        break;
      default:
        break;
    }
  };

  // Scroll focused option into view
  useEffect(() => {
    if (focusedIndex >= 0 && optionsRef.current[focusedIndex]) {
      optionsRef.current[focusedIndex].scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [focusedIndex]);

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearch('');
    setFocusedIndex(-1);
  };

  const toggleDropdown = () => {
    setIsOpen((prev) => !prev);
    if (isOpen) {
      setSearch('');
      setFocusedIndex(-1);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {label && (
        <label className="field-label" htmlFor={id}>
          {label}
        </label>
      )}

      {/* Selected value display / dropdown trigger */}
      <button
        type="button"
        id={id}
        onClick={toggleDropdown}
        onKeyDown={handleKeyDown}
        className="field flex w-full items-center justify-between cursor-pointer"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={value ? 'text-ink' : 'text-ink-faint'}>{displayText}</span>
        <ChevronDown
          className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          strokeWidth={2.5}
          aria-hidden="true"
        />
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full border-2 border-ink bg-white shadow-xl">
          {/* Search input */}
          <div className="sticky top-0 border-b-2 border-ink bg-forest-50 p-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
                strokeWidth={2.25}
                aria-hidden="true"
              />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setFocusedIndex(-1);
                }}
                onKeyDown={handleKeyDown}
                placeholder={searchPlaceholder}
                className="w-full border-2 border-ink py-2 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-forest-700"
                aria-label="Search options"
              />
            </div>
          </div>

          {/* Options list */}
          <div
            className="max-h-60 overflow-y-auto"
            role="listbox"
            aria-label="Select an option"
          >
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-ink-faint">
                No matches found
              </div>
            ) : (
              filteredOptions.map((option, index) => {
                const isSelected = option.value === value;
                const isFocused = index === focusedIndex;

                return (
                  <button
                    key={option.value}
                    ref={(el) => (optionsRef.current[index] = el)}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(option.value)}
                    className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors
                      ${isSelected ? 'bg-forest-700 text-white' : ''}
                      ${isFocused && !isSelected ? 'bg-forest-50' : ''}
                      ${!isSelected && !isFocused ? 'hover:bg-turmeric-50' : ''}
                    `}
                  >
                    <div className="min-w-0">
                      <div className="font-medium">{option.label}</div>
                      {option.district && (
                        <div className={`mt-0.5 text-xs ${isSelected ? 'text-forest-100' : 'text-ink-faint'}`}>
                          {option.district} District
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="ml-2 h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden="true" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          <div className="border-t-2 border-ink bg-forest-50 px-4 py-2 text-xs text-ink-faint">
            {filteredOptions.length} {filteredOptions.length === 1 ? 'option' : 'options'}
            {search && ` matching "${search}"`}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
