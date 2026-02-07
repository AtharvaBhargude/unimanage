import React from 'react';

export const Button = ({ variant = 'primary', className = '', ...props }) => {
  return (
    <button className={`ui-btn ui-btn-${variant} ${className}`} {...props} />
  );
};

export const Input = ({ label, className = '', ...props }) => {
  return (
    <div className="ui-input-wrapper">
      {label && <label className="ui-label">{label}</label>}
      <input
        className={`ui-input ${className}`}
        {...props}
      />
    </div>
  );
};

export const Select = ({ label, options, className = '', ...props }) => {
  return (
    <div className="ui-input-wrapper">
      {label && <label className="ui-label">{label}</label>}
      <select
        className={`ui-select ${className}`}
        {...props}
      >
        <option value="">Select an option</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
};

export const Card = ({ children, className = '', title }) => {
  return (
    <div className={`ui-card ${className}`}>
      {title && (
        <div className="ui-card-header">
          <h3 className="ui-card-title">{title}</h3>
        </div>
      )}
      <div className="ui-card-body">{children}</div>
    </div>
  );
};

export const Badge = ({ children, color = 'blue' }) => {
  return (
    <span className={`ui-badge ui-badge-${color}`}>
      {children}
    </span>
  );
};