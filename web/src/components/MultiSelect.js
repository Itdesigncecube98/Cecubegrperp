import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import './multiselect.css';

export default function MultiSelect({ options, selected, onChange, placeholder = "Select" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [tempSelected, setTempSelected] = useState(selected || []);
  const wrapperRef = useRef(null);

  useEffect(() => {
    setTempSelected(selected || []);
  }, [selected, isOpen]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isAllSelected = filteredOptions.length > 0 && filteredOptions.every(opt => tempSelected.includes(opt));
  const isSomeSelected = filteredOptions.some(opt => tempSelected.includes(opt));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      // Remove all filtered options from tempSelected
      setTempSelected(prev => prev.filter(opt => !filteredOptions.includes(opt)));
    } else {
      // Add all filtered options to tempSelected
      const newSelected = new Set([...tempSelected, ...filteredOptions]);
      setTempSelected(Array.from(newSelected));
    }
  };

  const toggleOption = (opt) => {
    if (tempSelected.includes(opt)) {
      setTempSelected(prev => prev.filter(item => item !== opt));
    } else {
      setTempSelected(prev => [...prev, opt]);
    }
  };

  const handleOk = () => {
    onChange(tempSelected);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setTempSelected(selected);
    setIsOpen(false);
  };

  const getDisplayText = () => {
    if (!selected || selected.length === 0) return placeholder;
    if (selected.length === options.length && options.length > 0) return `${selected.length} all selected!`;
    if (selected.length === 1) return selected[0];
    return `${selected.length} selected`;
  };

  return (
    <div className="custom-multiselect-container" ref={wrapperRef}>
      <div className="multiselect-trigger" onClick={() => setIsOpen(!isOpen)}>
        <span>{getDisplayText()}</span>
        <ChevronDown size={16} color="#64748b" />
      </div>

      {isOpen && (
        <div className="multiselect-dropdown">
          <div className="multiselect-search">
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>
          
          <div className="multiselect-options">
            {filteredOptions.length > 0 ? (
              <>
                <label className="multiselect-option-item select-all-item">
                  <input 
                    type="checkbox" 
                    checked={isAllSelected}
                    ref={input => {
                      if (input) input.indeterminate = isSomeSelected && !isAllSelected;
                    }}
                    onChange={toggleSelectAll}
                  />
                  <span className="multiselect-option-text">Select All</span>
                </label>
                
                {filteredOptions.map(opt => (
                  <label key={opt} className="multiselect-option-item">
                    <input 
                      type="checkbox" 
                      checked={tempSelected.includes(opt)}
                      onChange={() => toggleOption(opt)}
                    />
                    <span className="multiselect-option-text">{opt}</span>
                  </label>
                ))}
              </>
            ) : (
              <div className="multiselect-no-results">No results found</div>
            )}
          </div>

          <div className="multiselect-footer">
            <button className="multiselect-btn btn-ok" onClick={handleOk}>OK</button>
            <button className="multiselect-btn btn-cancel" onClick={handleCancel}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
