"use client";

import React from "react";

/**
 * Wii Event Malta — Input.
 * Dark, calm form field for checkout & community sign-up. Mono label.
 */
export function Input({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  error,
  hint,
  prefix,
  suffix,
  id,
  required = false,
  name,
  autoComplete,
  style,
}: {
  label?: string;
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  hint?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  id?: string;
  required?: boolean;
  name?: string;
  autoComplete?: string;
  style?: React.CSSProperties;
}) {
  const inputId = id || (label ? "wii-" + label.toLowerCase().replace(/\s+/g, "-") : undefined);
  const [focus, setFocus] = React.useState(false);

  const wrap: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    height: "var(--control-lg)",
    padding: "0 16px",
    background: "var(--surface-2)",
    border: `1px solid ${error ? "var(--ember-500)" : focus ? "var(--text)" : "var(--border)"}`,
    borderRadius: "var(--radius-sm)",
    transition: "var(--t-hover)",
    boxShadow: focus ? "var(--ring)" : "none",
  };

  return (
    <label htmlFor={inputId} style={{ display: "block", ...style }}>
      {label ? (
        <span
          style={{
            display: "block",
            marginBottom: "8px",
            fontFamily: "var(--font-mono)",
            fontSize: "0.6875rem",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
          }}
        >
          {label}
          {required ? <span style={{ color: "var(--ember-500)" }}> *</span> : null}
        </span>
      ) : null}
      <span style={wrap}>
        {prefix ? (
          <span style={{ color: "var(--text-faint)", fontFamily: "var(--font-mono)", fontSize: "0.875rem" }}>
            {prefix}
          </span>
        ) : null}
        <input
          id={inputId}
          name={name}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          required={required}
          autoComplete={autoComplete}
          style={{
            flex: 1,
            width: "100%",
            background: "transparent",
            border: "none",
            outline: "none",
            color: "var(--text-strong)",
            fontFamily: "var(--font-ui)",
            fontSize: "0.95rem",
          }}
        />
        {suffix ? (
          <span style={{ color: "var(--text-faint)", fontFamily: "var(--font-mono)", fontSize: "0.8125rem" }}>
            {suffix}
          </span>
        ) : null}
      </span>
      {error ? (
        <span style={{ display: "block", marginTop: "7px", fontSize: "0.8125rem", color: "var(--ember-300)" }}>
          {error}
        </span>
      ) : hint ? (
        <span style={{ display: "block", marginTop: "7px", fontSize: "0.8125rem", color: "var(--text-faint)" }}>
          {hint}
        </span>
      ) : null}
    </label>
  );
}
