import React, { useState } from 'react';

interface TableGridPickerProps {
  maxRows?: number;
  maxCols?: number;
  onSelect: (rows: number, cols: number) => void;
  onClose?: () => void;
}

const TableGridPicker: React.FC<TableGridPickerProps> = ({
  maxRows = 10,
  maxCols = 10,
  onSelect,
  onClose,
}) => {
  const [hovered, setHovered] = useState<{ row: number; col: number }>({ row: 0, col: 0 });

  return (
    <div
      style={{
        background: '#2c3543',
        padding: 8,
        borderRadius: 6,
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        display: 'inline-block',
        userSelect: 'none',
        minWidth: 0,
      }}
      onMouseLeave={() => setHovered({ row: 0, col: 0 })}
    >
      <div style={{ color: 'white', fontWeight: 500, marginBottom: 4, fontSize: 14 }}>
        Insert table
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${maxCols}, 20px)`, gap: 2 }}>
        {Array.from({ length: maxRows }).map((_, rowIdx) =>
          Array.from({ length: maxCols }).map((_, colIdx) => {
            const isSelected = rowIdx <= hovered.row && colIdx <= hovered.col;
            return (
              <div
                key={`${rowIdx}-${colIdx}`}
                style={{
                  width: 20,
                  height: 20,
                  border: '1px solid #fff',
                  background: isSelected ? '#4e5a6e' : 'transparent',
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={() => setHovered({ row: rowIdx, col: colIdx })}
                onClick={() => {
                  onSelect(rowIdx + 1, colIdx + 1);
                  if (onClose) onClose();
                }}
                title={`${rowIdx + 1} x ${colIdx + 1}`}
              />
            );
          })
        )}
      </div>
      <div style={{ color: '#fff', fontSize: 12, marginTop: 6, minHeight: 16 }}>
        {hovered.row + 1} × {hovered.col + 1}
      </div>
    </div>
  );
};

export default TableGridPicker; 