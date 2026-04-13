import React, { useState, useCallback, useRef, memo } from 'react';

/**
 * InlineCell - A single editable cell that only re-renders when its own value changes.
 * Performance: Uses memo + local state to avoid parent re-renders on keystroke.
 */
const InlineCell = memo(({
  value,
  type = 'text',       // text | number | select | currency | date
  options = [],         // for select type
  editable = true,
  onSave,              // (newValue) => void
  formatter,           // (value) => display string
  placeholder = '',
  className = '',
  align = 'left',      // left | right | center
  tabIndex,
  onKeyNav,            // ({ direction: 'next-cell' | 'prev-cell' | 'next-row' | 'prev-row' }) => void
  rowIndex,
  colIndex,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [flash, setFlash] = useState(false);
  const inputRef = useRef(null);

  const displayValue = formatter ? formatter(value) : value;

  const startEdit = useCallback(() => {
    if (!editable) return;
    setDraft(value ?? '');
    setIsEditing(true);
    // Focus after render
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [editable, value]);

  const commitEdit = useCallback(() => {
    setIsEditing(false);
    const newVal = type === 'number' ? (draft === '' ? 0 : parseFloat(draft)) : draft;
    if (newVal !== value) {
      onSave?.(newVal);
      setFlash(true);
      setTimeout(() => setFlash(false), 600);
    }
  }, [draft, value, type, onSave]);

  const cancelEdit = useCallback(() => {
    setDraft(value ?? '');
    setIsEditing(false);
  }, [value]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitEdit();
      onKeyNav?.({ direction: 'next-row', rowIndex, colIndex });
    } else if (e.key === 'Tab') {
      e.preventDefault();
      commitEdit();
      onKeyNav?.({ direction: e.shiftKey ? 'prev-cell' : 'next-cell', rowIndex, colIndex });
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  }, [commitEdit, cancelEdit, onKeyNav, rowIndex, colIndex]);

  const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

  if (isEditing && editable) {
    if (type === 'select') {
      return (
        <td className={`ss-cell-editing ${className}`}>
          <select
            ref={inputRef}
            value={draft}
            onChange={e => { setDraft(e.target.value); }}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            tabIndex={tabIndex}
            className={alignClass}
          >
            {options.map(opt => (
              <option key={opt.value ?? opt} value={opt.value ?? opt}>
                {opt.label ?? opt}
              </option>
            ))}
          </select>
        </td>
      );
    }

    return (
      <td className={`ss-cell-editing ${className}`}>
        <input
          ref={inputRef}
          type={type === 'currency' ? 'number' : type}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          tabIndex={tabIndex}
          className={alignClass}
          step={type === 'number' || type === 'currency' ? '0.01' : undefined}
          min={type === 'number' || type === 'currency' ? '0' : undefined}
          autoComplete="off"
        />
      </td>
    );
  }

  return (
    <td
      className={`${editable ? 'ss-cell-editable' : ''} ${flash ? 'ss-cell-saved' : ''} ${alignClass} ${className}`}
      onClick={editable ? startEdit : undefined}
      tabIndex={editable ? tabIndex || 0 : undefined}
      onKeyDown={editable ? (e) => { if (e.key === 'Enter' || e.key === 'F2') startEdit(); } : undefined}
    >
      {displayValue !== null && displayValue !== undefined && displayValue !== ''
        ? displayValue
        : <span className="text-[#9aa0a6]">{placeholder || '—'}</span>
      }
    </td>
  );
});

InlineCell.displayName = 'InlineCell';
export default InlineCell;
