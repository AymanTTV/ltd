import React, { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react'; // Import X for clear button on tags
import { useOnClickOutside } from '../../hooks/useOnClickOutside';

interface Option {
  id: string;
  label: string;
  subLabel?: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string | string[]; // Can be a single string or an array of strings
  onChange: (value: string | string[]) => void; // onChange can receive a string or string array
  label: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  isMulti?: boolean; // New prop to enable multi-select
  isClearable?: boolean; // Prop to allow clearing single selection
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  label,
  placeholder = 'Search...',
  required = false,
  disabled = false,
  error,
  isMulti = false, // Default to single select
  isClearable = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  
  useOnClickOutside(wrapperRef, () => setIsOpen(false));

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    option.subLabel?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Determine selected options based on isMulti prop
  const selectedOptions = isMulti
    ? options.filter(opt => (value as string[]).includes(opt.id))
    : options.find(opt => opt.id === (value as string));

  const handleOptionClick = (optionId: string) => {
    if (isMulti) {
      const currentValues = Array.isArray(value) ? [...value] : [];
      if (currentValues.includes(optionId)) {
        // Remove option if already selected
        onChange(currentValues.filter(id => id !== optionId));
      } else {
        // Add option if not selected
        onChange([...currentValues, optionId]);
      }
    } else {
      // Single select behavior
      onChange(optionId);
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  const handleRemoveTag = (optionId: string) => {
    if (isMulti) {
      const currentValues = Array.isArray(value) ? [...value] : [];
      onChange(currentValues.filter(id => id !== optionId));
    }
  };

  const handleClearSingle = () => {
    if (!isMulti && isClearable) {
      onChange('');
    }
  };

  // Effect to clear search term when closing the dropdown
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  return (
    <div className="space-y-1" ref={wrapperRef}>
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      
      <div className="relative">
        <div
          className={`w-full border ${error ? 'border-red-300' : 'border-gray-300'} rounded-md bg-white ${
            disabled ? 'bg-gray-50 cursor-not-allowed' : 'cursor-pointer'
          } p-2 flex flex-wrap gap-2 items-center min-h-[42px]`}
          onClick={() => !disabled && setIsOpen(true)}
        >
          {isMulti && Array.isArray(selectedOptions) && selectedOptions.length > 0 ? (
            selectedOptions.map(option => (
              <span 
                key={option.id} 
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800"
                onClick={(e) => e.stopPropagation()} // Prevent opening dropdown when clicking tag
              >
                {option.label}
                <button 
                  type="button" 
                  onClick={() => handleRemoveTag(option.id)} 
                  className="ml-1 -mr-0.5 h-4 w-4 rounded-full inline-flex items-center justify-center text-primary-600 hover:bg-primary-200 hover:text-primary-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))
          ) : !isMulti && selectedOptions ? (
            <div className="flex-grow flex items-center justify-between">
              <div>
                <div>{(selectedOptions as Option).label}</div>
                {(selectedOptions as Option).subLabel && (
                  <div className="text-sm text-gray-500">{(selectedOptions as Option).subLabel}</div>
                )}
              </div>
              {isClearable && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleClearSingle(); }}
                  className="ml-2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ) : (
            <span className="text-gray-400 flex-grow">{placeholder}</span>
          )}

          {isOpen && (
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border-0 focus:ring-0 sm:text-sm"
                placeholder={placeholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
          )}
        </div>

        {isOpen && (
          <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto focus:outline-none sm:text-sm">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <div
                  key={option.id}
                  className={`cursor-pointer px-3 py-2 ${
                    isMulti && Array.isArray(value) && value.includes(option.id)
                      ? 'bg-primary-50 text-primary-900'
                      : 'hover:bg-gray-100'
                  }`}
                  onClick={() => handleOptionClick(option.id)}
                >
                  <div className="flex items-center">
                    {isMulti && (
                      <input
                        type="checkbox"
                        checked={Array.isArray(value) && value.includes(option.id)}
                        readOnly // Prevent direct interaction with checkbox, let parent div handle click
                        className="mr-2 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                    )}
                    <div>
                      <div>{option.label}</div>
                      {option.subLabel && (
                        <div className="text-sm text-gray-500">{option.subLabel}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500 px-3 py-2">No results found</div>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 mt-1">{error}</p>
      )}
    </div>
  );
};

export default SearchableSelect;
