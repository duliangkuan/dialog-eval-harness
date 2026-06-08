'use client';

import { useState, useEffect, useRef } from 'react';

interface HeaderFilterOption {
  value: string;
  label: string;
}

interface HeaderFilterProps {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  options: HeaderFilterOption[];
}

export function HeaderFilter({ label, value, onChange, options }: HeaderFilterProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (val: string) => {
    if (value.includes(val)) {
      onChange(value.filter((v) => v !== val));
    } else {
      onChange([...value, val]);
    }
  };

  const hasFilter = value.length > 0;

  return (
    <span ref={ref} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span>{label}</span>
      <span
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        style={{
          cursor: 'pointer',
          fontSize: 9,
          color: hasFilter ? 'var(--accent)' : 'var(--ink-light)',
          userSelect: 'none',
          transition: 'color 0.15s',
          padding: '2px 4px',
          borderRadius: 3,
          background: hasFilter ? 'var(--accent-light)' : 'transparent',
        }}
      >
        ▾
      </span>
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            minWidth: 140,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
            zIndex: 100,
            padding: '6px 0',
            fontSize: 12,
          }}
        >
          {options.map((opt) => (
            <label
              key={opt.value}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 14px',
                cursor: 'pointer',
                color: value.includes(opt.value) ? 'var(--accent-dark)' : 'var(--ink)',
                background: value.includes(opt.value) ? 'var(--accent-light)' : 'transparent',
                transition: 'background 0.1s',
                fontWeight: value.includes(opt.value) ? 500 : 400,
              }}
              onMouseEnter={(e) => {
                if (!value.includes(opt.value)) e.currentTarget.style.background = 'var(--bg-warm)';
              }}
              onMouseLeave={(e) => {
                if (!value.includes(opt.value)) e.currentTarget.style.background = 'transparent';
              }}
            >
              <input
                type="checkbox"
                checked={value.includes(opt.value)}
                onChange={() => toggle(opt.value)}
                style={{ accentColor: 'var(--accent)', width: 14, height: 14 }}
              />
              <span>{opt.label}</span>
            </label>
          ))}
          {value.length > 0 && (
            <div
              style={{
                borderTop: '1px solid var(--border-light)',
                marginTop: 4,
                paddingTop: 4,
              }}
            >
              <div
                onClick={() => onChange([])}
                style={{
                  padding: '6px 14px',
                  fontSize: 11,
                  color: 'var(--ink-muted)',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--ink-muted)'; }}
              >
                清除筛选
              </div>
            </div>
          )}
        </div>
      )}
    </span>
  );
}
