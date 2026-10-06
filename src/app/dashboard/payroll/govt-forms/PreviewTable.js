import React, { useState } from 'react';

export default function PreviewTable({ title, rule, cols, records, dataMapper, contractorName, contractorAddress, monthStr, location, woNo, blankRows = 3, theme = 'yellow', renderFooter }) {
  const c = cols.length;
  const span1 = Math.floor(c * 0.2) || 1;
  const span2 = Math.floor(c * 0.5) || 1;
  const span3 = Math.floor(c * 0.15) || 1;
  const span4 = c - span1 - span2 - span3;

  const initialRows = records.map(dataMapper);
  const initialBlank = Array.from({ length: blankRows }).map(() => Array(c).fill(''));
  const [extraRows, setExtraRows] = useState(initialBlank);

  const addRow = () => {
    setExtraRows(prev => [...prev, Array(c).fill('')]);
  };

  // For screen: all rows visible. For print: only data rows (no blank/extra rows).

  const isBlue = theme === 'blue';
  const borderColor  = isBlue ? '#99ccff' : '#333333';
  const headerBg     = isBlue ? '#e8f4fd' : '#FFD700';
  const numRowBg     = isBlue ? '#ffffff'  : '#BFE0EE';
  const headerTxt    = isBlue ? '#0066cc'  : '#000000';
  const labelTxt     = isBlue ? '#0066cc'  : '#000000';

  const tdBorder = `1px solid ${borderColor}`;

  const cellStyle = (extra = {}) => ({
    border: tdBorder,
    padding: '5px 6px',
    fontSize: '10px',
    fontFamily: 'Arial, sans-serif',
    ...extra
  });

  const editableStyle = (extra = {}) => ({
    ...cellStyle(extra),
    outline: 'none',
    cursor: 'text',
  });

  return (
    <div 
      className="preview-table-container" 
      data-org={contractorName}
      data-address={contractorAddress}
      data-month={monthStr}
      data-location={location}
      data-wono={woNo}
      style={{ marginBottom: '40px', overflowX: 'auto', backgroundColor: 'white', padding: '10px' }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', border: `2px solid ${borderColor}`, fontSize: '10px', fontFamily: 'Arial, sans-serif' }}>
        <thead>
          {/* Title row */}
          <tr>
            <th colSpan={c} style={cellStyle({ textAlign: 'center', fontSize: '17px', color: headerTxt, background: '#ffffff', padding: '10px' })}>
              <strong>{title}</strong><br />
              <span style={{ fontSize: '11px', fontWeight: 'normal' }}>
                {rule.split('\n').map((l, i) => <span key={i}>{l}{i < rule.split('\n').length - 1 && <br />}</span>)}
              </span>
            </th>
          </tr>

          {/* Contractor + Month row — EDITABLE value cells */}
          <tr>
            <th colSpan={span1} style={cellStyle({ textAlign: 'left', fontWeight: 'bold', color: labelTxt, background: '#ffffff' })}>
              Name and address of Contractor &gt;
            </th>
            <th colSpan={span2} contentEditable suppressContentEditableWarning
              style={editableStyle({ textAlign: 'left', color: '#cc0000', fontWeight: 'bold', background: '#FFE4E1' })}>
              {contractorName}<br />{contractorAddress}
            </th>
            <th colSpan={span3} style={cellStyle({ textAlign: 'left', fontWeight: 'bold', color: labelTxt, background: '#ffffff' })}>
              For the month of :&gt;
            </th>
            <th colSpan={span4} contentEditable suppressContentEditableWarning
              style={editableStyle({ textAlign: 'left', color: '#cc0000', fontWeight: 'bold', background: '#FFE4E1' })}>
              {monthStr}
            </th>
          </tr>

          {/* Principal Employer row — EDITABLE */}
          <tr>
            <th colSpan={span1} style={cellStyle({ textAlign: 'left', fontWeight: 'bold', color: labelTxt, background: '#ffffff' })}>
              Name &amp; Address of Principal Employer &gt;
            </th>
            <th colSpan={c - span1} contentEditable suppressContentEditableWarning
              style={editableStyle({ textAlign: 'left', color: '#cc0000', fontWeight: 'bold', background: '#FFE4E1' })}>
            </th>
          </tr>

          {/* Location + WO row — EDITABLE value cells */}
          <tr>
            <th colSpan={span1} style={cellStyle({ textAlign: 'left', fontWeight: 'bold', color: labelTxt, background: '#ffffff' })}>
              Nature and Location Of Work &gt;
            </th>
            <th colSpan={span2} contentEditable suppressContentEditableWarning
              style={editableStyle({ textAlign: 'left', color: '#cc0000', fontWeight: 'bold', background: '#FFE4E1' })}>
              {location}
            </th>
            <th colSpan={span3} style={cellStyle({ textAlign: 'left', fontWeight: 'bold', color: labelTxt, background: '#ffffff' })}>
              Work order No.:&gt;
            </th>
            <th colSpan={span4} contentEditable suppressContentEditableWarning
              style={editableStyle({ textAlign: 'left', color: '#cc0000', fontWeight: 'bold', background: '#FFE4E1' })}>
              {woNo}
            </th>
          </tr>

          {/* Column names row */}
          <tr style={{ backgroundColor: headerBg }}>
            {cols.map((col, i) => (
              <th key={i} style={cellStyle({ textAlign: 'center', fontWeight: 'bold', color: headerTxt, background: headerBg })}>
                {col}
              </th>
            ))}
          </tr>

          {/* Column numbers row */}
          <tr style={{ backgroundColor: numRowBg }}>
            {cols.map((_, i) => (
              <th key={i} style={cellStyle({ textAlign: 'center', fontWeight: 'bold', color: headerTxt, background: numRowBg })}>
                {i + 1}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {/* Data rows — always printed */}
          {initialRows.map((row, rIdx) => (
            <tr key={`data-${rIdx}`}>
              {row.map((val, cIdx) => (
                <td
                  key={cIdx}
                  contentEditable
                  suppressContentEditableWarning
                  style={{
                    border: tdBorder,
                    padding: '5px 4px',
                    textAlign: 'center',
                    minWidth: '28px',
                    backgroundColor: val === 'W/O' ? '#f59e0b' : 'transparent',
                    color: val === 'W/O' ? '#fff' : '#000',
                    fontWeight: val === 'W/O' ? 'bold' : 'normal',
                    fontSize: '10px',
                    outline: 'none',
                    cursor: 'text',
                  }}
                >
                  {val === undefined || val === null ? '' : val}
                </td>
              ))}
            </tr>
          ))}

          {/* Blank / extra rows — hidden during print */}
          {extraRows.map((row, rIdx) => (
            <tr key={`blank-${rIdx}`} className="no-print">
              {row.map((val, cIdx) => (
                <td
                  key={cIdx}
                  contentEditable
                  suppressContentEditableWarning
                  style={{
                    border: tdBorder,
                    padding: '5px 4px',
                    textAlign: 'center',
                    minWidth: '28px',
                    fontSize: '10px',
                    outline: 'none',
                    cursor: 'text',
                  }}
                >
                  {val === undefined || val === null ? '' : val}
                </td>
              ))}
            </tr>
          ))}
          {renderFooter && renderFooter(c, borderColor)}
        </tbody>
      </table>

      {/* Add Row button — only shown on screen, hidden on print */}
      <div className="no-print" style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-start' }}>
        <button
          onClick={addRow}
          style={{
            padding: '6px 16px',
            backgroundColor: '#0f766e',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          + Add Row
        </button>
      </div>

      {/* Blank space at bottom for signing */}
      <div style={{ height: '80px' }}></div>
    </div>
  );
}
