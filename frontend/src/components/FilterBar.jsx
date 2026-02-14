import React from "react";
import "./FilterBar.css";

/**
 * Filter Bar Component
 * 
 * Provides controls for filtering and sorting payments
 */
export default function FilterBar({ filters, onFilterChange, sortBy, sortOrder, onSortChange, filteredCount, totalCount }) {
    return (
        <div className="filter-bar glass-card">
            {/* Direction Filter */}
            <div className="filter-group">
                <label className="filter-label">Direction:</label>
                <div className="direction-buttons">
                    <button
                        className={`filter-btn ${filters.direction === 'all' ? 'active' : ''}`}
                        onClick={() => onFilterChange('direction', 'all')}
                    >
                        All
                    </button>
                    <button
                        className={`filter-btn ${filters.direction === 'sent' ? 'active' : ''}`}
                        onClick={() => onFilterChange('direction', 'sent')}
                    >
                        Sent
                    </button>
                    <button
                        className={`filter-btn ${filters.direction === 'received' ? 'active' : ''}`}
                        onClick={() => onFilterChange('direction', 'received')}
                    >
                        Received
                    </button>
                </div>
            </div>

            {/* Search by Hash */}
            <div className="filter-group">
                <label className="filter-label" htmlFor="search-hash">Search Hash:</label>
                <input
                    id="search-hash"
                    type="text"
                    className="input filter-input"
                    placeholder="Enter transaction hash..."
                    value={filters.searchHash}
                    onChange={(e) => onFilterChange('searchHash', e.target.value)}
                />
            </div>

            {/* Amount Range */}
            <div className="filter-group">
                <label className="filter-label">Amount Range (XLM):</label>
                <div className="range-inputs">
                    <input
                        type="number"
                        className="input filter-input-sm"
                        placeholder="Min"
                        value={filters.amountRange.min || ''}
                        onChange={(e) => onFilterChange('amountRange', { ...filters.amountRange, min: e.target.value })}
                    />
                    <span className="range-separator">-</span>
                    <input
                        type="number"
                        className="input filter-input-sm"
                        placeholder="Max"
                        value={filters.amountRange.max || ''}
                        onChange={(e) => onFilterChange('amountRange', { ...filters.amountRange, max: e.target.value })}
                    />
                </div>
            </div>

            {/* Sort Controls */}
            <div className="filter-group">
                <label className="filter-label">Sort By:</label>
                <select
                    className="input filter-select"
                    value={sortBy}
                    onChange={(e) => onSortChange(e.target.value, sortOrder)}
                >
                    <option value="date">Date</option>
                    <option value="amount">Amount</option>
                </select>
                <button
                    className="sort-order-btn"
                    onClick={() => onSortChange(sortBy, sortOrder === 'desc' ? 'asc' : 'desc')}
                    title={sortOrder === 'desc' ? 'Descending' : 'Ascending'}
                >
                    {sortOrder === 'desc' ? '↓' : '↑'}
                </button>
            </div>

            {/* Results Count */}
            <div className="filter-results">
                Showing <strong>{filteredCount}</strong> of <strong>{totalCount}</strong> transactions
            </div>
        </div>
    );
}
