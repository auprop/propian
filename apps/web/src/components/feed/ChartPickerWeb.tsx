"use client";

import { useState, useMemo } from "react";
import {
  IconClose,
  IconSearch,
  IconChart,
  IconCheck,
} from "@propian/shared/icons";
import {
  TRADING_SYMBOLS,
  SYMBOL_CATEGORIES,
  CHART_INTERVALS,
} from "@propian/shared/constants";
import type { SymbolCategory, ChartInterval } from "@propian/shared/constants";

interface ChartPickerWebProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (data: { exchange: string; symbol: string; interval: ChartInterval }) => void;
}

export function ChartPickerWeb({ visible, onClose, onSelect }: ChartPickerWebProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<SymbolCategory>("forex");
  const [selectedSymbol, setSelectedSymbol] = useState<{
    symbol: string;
    exchange: string;
  } | null>(null);
  const [selectedInterval, setSelectedInterval] = useState<ChartInterval>("D");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return TRADING_SYMBOLS.filter(
      (s) =>
        s.category === category &&
        (q === "" ||
          s.symbol.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q)),
    );
  }, [search, category]);

  const handleConfirm = () => {
    if (!selectedSymbol) return;
    onSelect({
      exchange: selectedSymbol.exchange,
      symbol: selectedSymbol.symbol,
      interval: selectedInterval,
    });
    handleClose();
  };

  const handleClose = () => {
    setSearch("");
    setSelectedSymbol(null);
    setSelectedInterval("D");
    setCategory("forex");
    onClose();
  };

  if (!visible) return null;

  return (
    <div className="pt-modal-overlay" onClick={handleClose}>
      <div className="pt-chart-picker" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="pt-chart-picker-header">
          <h3>Attach Chart</h3>
          <button
            className="pt-chart-picker-close"
            onClick={handleClose}
            title="Close"
          >
            <IconClose size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="pt-chart-picker-search">
          <IconSearch size={16} />
          <input
            type="text"
            placeholder="Search symbols..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        {/* Category tabs */}
        <div className="pt-chart-picker-tabs">
          {SYMBOL_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              className={`pt-chart-picker-tab ${category === cat.value ? "active" : ""}`}
              onClick={() => {
                setCategory(cat.value);
                setSelectedSymbol(null);
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Symbol list */}
        <div className="pt-chart-picker-list">
          {filtered.length === 0 ? (
            <p className="pt-chart-picker-empty">No symbols found</p>
          ) : (
            filtered.map((sym) => {
              const isSelected =
                selectedSymbol?.symbol === sym.symbol &&
                selectedSymbol?.exchange === sym.exchange;
              return (
                <button
                  key={`${sym.exchange}:${sym.symbol}`}
                  className={`pt-chart-picker-item ${isSelected ? "selected" : ""}`}
                  onClick={() =>
                    setSelectedSymbol({
                      symbol: sym.symbol,
                      exchange: sym.exchange,
                    })
                  }
                >
                  <span className="pt-chart-picker-symbol">{sym.symbol}</span>
                  <span className="pt-chart-picker-name">{sym.name}</span>
                  {isSelected && (
                    <IconCheck size={16} style={{ color: "var(--lime)", marginLeft: "auto" }} />
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Interval picker (shown after symbol selected) */}
        {selectedSymbol && (
          <div className="pt-chart-picker-intervals">
            <span className="pt-chart-picker-intervals-label">Interval</span>
            <div className="pt-chart-picker-interval-row">
              {CHART_INTERVALS.map((iv) => (
                <button
                  key={iv.value}
                  className={`pt-chart-picker-interval ${selectedInterval === iv.value ? "active" : ""}`}
                  onClick={() => setSelectedInterval(iv.value)}
                >
                  {iv.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Confirm button */}
        <button
          className="pt-chart-picker-confirm"
          disabled={!selectedSymbol}
          onClick={handleConfirm}
        >
          <IconChart size={16} />
          {selectedSymbol
            ? `Attach ${selectedSymbol.symbol} Chart`
            : "Select a symbol"}
        </button>
      </div>
    </div>
  );
}
