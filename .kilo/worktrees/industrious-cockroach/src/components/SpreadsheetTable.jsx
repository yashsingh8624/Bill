import React, { useCallback, useMemo, useRef, memo } from 'react';
import InlineCell from './InlineCell';

/**
 * SpreadsheetTable - Excel-like table with inline editing, keyboard nav, and performance optimization.
 * 
 * Props:
 * - columns: [{ key, label, type, width, editable, formatter, align, options, placeholder }]
 * - data: array of row objects
 * - onCellChange: (rowIndex, key, newValue) => void
 * - onRowClick: (row, rowIndex) => void  
 * - onAddRow: () => void (called when typing in last row)
 * - rowKeyField: string (unique key field, default 'id')
 * - summaryRow: object with keys matching column keys (shown in tfoot)
 * - emptyMessage: string
 * - stickyHeader: boolean (default true)
 * - searchable: boolean
 * - searchValue: string
 * - onSearchChange: (value) => void
 * - className: string
 * - rowClassName: (row, idx) => string
 * - minWidth: string (for mobile horizontal scroll)
 */
const SpreadsheetTable = memo(({
  columns,
  data,
  onCellChange,
  onRowClick,
  onAddRow,
  rowKeyField = 'id',
  summaryRow,
  emptyMessage = 'No data',
  className = '',
  rowClassName,
  minWidth,
  maxHeight,
}) => {
  const tableRef = useRef(null);

  // Keyboard navigation between cells
  const handleKeyNav = useCallback(({ direction, rowIndex, colIndex }) => {
    const editableCols = columns.reduce((acc, col, i) => {
      if (col.editable !== false) acc.push(i);
      return acc;
    }, []);
    
    if (!editableCols.length) return;

    let nextRow = rowIndex;
    let nextCol = colIndex;
    const currentEditIdx = editableCols.indexOf(colIndex);

    switch (direction) {
      case 'next-cell': {
        if (currentEditIdx < editableCols.length - 1) {
          nextCol = editableCols[currentEditIdx + 1];
        } else {
          // Move to first editable cell of next row
          nextRow = rowIndex + 1;
          nextCol = editableCols[0];
        }
        break;
      }
      case 'prev-cell': {
        if (currentEditIdx > 0) {
          nextCol = editableCols[currentEditIdx - 1];
        } else if (rowIndex > 0) {
          nextRow = rowIndex - 1;
          nextCol = editableCols[editableCols.length - 1];
        }
        break;
      }
      case 'next-row': {
        nextRow = rowIndex + 1;
        // If we're at last row, trigger add row
        if (nextRow >= data.length && onAddRow) {
          onAddRow();
        }
        break;
      }
      case 'prev-row': {
        if (rowIndex > 0) nextRow = rowIndex - 1;
        break;
      }
    }

    // Focus the target cell
    requestAnimationFrame(() => {
      const cell = tableRef.current?.querySelector(
        `tbody tr:nth-child(${nextRow + 1}) td:nth-child(${nextCol + 1})`
      );
      cell?.click();
    });
  }, [columns, data.length, onAddRow]);

  const handleCellSave = useCallback((rowIndex, key, newValue) => {
    onCellChange?.(rowIndex, key, newValue);
  }, [onCellChange]);

  return (
    <div 
      className={`ss-table-wrap overflow-auto custom-scrollbar ${className}`}
      style={{ maxHeight: maxHeight || undefined }}
    >
      <table className="ss-table" ref={tableRef} style={{ minWidth: minWidth || undefined }}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{ width: col.width || 'auto' }}
                className={
                  col.align === 'right' ? 'text-right' :
                  col.align === 'center' ? 'text-center' : 'text-left'
                }
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="!text-center !py-12 !text-[#9aa0a6] font-medium">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIdx) => (
              <MemoRow
                key={row[rowKeyField] || rowIdx}
                row={row}
                rowIdx={rowIdx}
                columns={columns}
                onCellSave={handleCellSave}
                onRowClick={onRowClick}
                onKeyNav={handleKeyNav}
                rowClassName={rowClassName}
              />
            ))
          )}
        </tbody>
        {summaryRow && (
          <tfoot>
            <tr>
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={
                    col.align === 'right' ? 'text-right' :
                    col.align === 'center' ? 'text-center' : 'text-left'
                  }
                >
                  {col.formatter && summaryRow[col.key] !== undefined
                    ? col.formatter(summaryRow[col.key])
                    : summaryRow[col.key] ?? ''
                  }
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
});

/**
 * MemoRow - Individual row, memoized to prevent re-renders when other rows change.
 */
const MemoRow = memo(({ row, rowIdx, columns, onCellSave, onRowClick, onKeyNav, rowClassName }) => {
  const extraClass = rowClassName ? rowClassName(row, rowIdx) : '';

  return (
    <tr
      className={`${onRowClick ? 'cursor-pointer' : ''} ${extraClass}`}
      onClick={onRowClick ? (e) => {
        // Don't trigger row click when editing a cell
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
        onRowClick(row, rowIdx);
      } : undefined}
    >
      {columns.map((col, colIdx) => (
        <InlineCell
          key={col.key}
          value={row[col.key]}
          type={col.type || 'text'}
          editable={col.editable !== false}
          options={col.options}
          formatter={col.formatter}
          placeholder={col.placeholder}
          align={col.align}
          className={col.cellClassName || ''}
          rowIndex={rowIdx}
          colIndex={colIdx}
          onSave={(newVal) => onCellSave(rowIdx, col.key, newVal)}
          onKeyNav={onKeyNav}
        />
      ))}
    </tr>
  );
});

MemoRow.displayName = 'MemoRow';
SpreadsheetTable.displayName = 'SpreadsheetTable';
export default SpreadsheetTable;
