import { useId } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';

import { SearchIcon } from '../icons/SearchIcon';

type SearchInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  label?: string;
  hint?: string;
  rightAdornment?: ReactNode;
};

export function SearchInput({ label, hint, className = '', id, rightAdornment, ...props }: SearchInputProps) {
  const fallbackId = useId();
  const inputId = id ?? fallbackId;

  return (
    <label className="ds-field" htmlFor={inputId}>
      {label ? <span className="ds-field-label">{label}</span> : null}
      <div className={`ds-search-input ${className}`.trim()}>
        <span className="ds-search-input-icon" aria-hidden="true">
          <SearchIcon />
        </span>
        <input id={inputId} {...props} className="ds-search-input-control" />
        {rightAdornment ? <span className="ds-search-input-adornment">{rightAdornment}</span> : null}
      </div>
      {hint ? <span className="ds-field-hint">{hint}</span> : null}
    </label>
  );
}
