import { useState, useMemo } from 'react';
import { 
  Users, Coffee, Sun, Moon, Cookie, Download, Search, 
  Filter, CheckCircle, XCircle, TrendingUp, BarChart3,
  Calendar, Archive
} from 'lucide-react';
import { useMeal } from '../context/MealContext';
import { exportAttendanceCSV, exportFullHistoryCSV } from '../utils/csv';

const MEAL_ICONS = {
  breakfast: { icon: Coffee, color: '#FFE66D', label: 'Breakfast' },
  lunch: { icon: Sun, color: '#4ECDC4', label: 'Lunch' },
  dinner: { icon: Moon, color: '#FF6B6B', label: 'Dinner' },
  snacks: { icon: Cookie, color: '#C084FC', label: 'Snacks' }
};

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'has_meals', label: 'Has Meals' },
  { value: 'no_meals', label: 'No Meals' },
  { value: 'all_meals', label: 'All 4 Meals' }
];

export default function AttendanceDashboard() {
  const { participants, getStats, recentScans, trackingDate, getHistory } = useMeal();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');

  const stats = getStats();
  const participantsList = useMemo(() => Object.values(participants), [participants]);
  const history = useMemo(() => getHistory(), [getHistory]);
  const historyDates = useMemo(() => Object.keys(history).sort().reverse(), [history]);

  const filteredParticipants = useMemo(() => {
    let list = participantsList;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.uuid.toLowerCase().includes(q)
      );
    }

    if (filter === 'has_meals') {
      list = list.filter(p => Object.values(p.meals).some(v => v));
    } else if (filter === 'no_meals') {
      list = list.filter(p => !Object.values(p.meals).some(v => v));
    } else if (filter === 'all_meals') {
      list = list.filter(p => Object.values(p.meals).every(v => v));
    }

    if (sortBy === 'name') {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    } else {
      list = [...list].sort((a, b) => {
        const aMeals = Object.values(b.meals).filter(v => v).length;
        const bMeals = Object.values(a.meals).filter(v => v).length;
        return aMeals - bMeals;
      });
    }

    return list;
  }, [participantsList, searchQuery, filter, sortBy]);

  const totalMealsServed = useMemo(() => {
    return participantsList.reduce((total, p) =>
      total + Object.values(p.meals).filter(v => v).length, 0
    );
  }, [participantsList]);

  const attendancePercent = useMemo(() => {
    if (participantsList.length === 0) return 0;
    const withAnyMeal = participantsList.filter(p =>
      Object.values(p.meals).some(v => v)
    ).length;
    return Math.round((withAnyMeal / participantsList.length) * 100);
  }, [participantsList]);

  const handleExportToday = () => {
    exportAttendanceCSV(participants, trackingDate);
  };

  const handleExportHistory = () => {
    exportFullHistoryCSV(history, participants, trackingDate);
  };

  const handleExportDay = (date) => {
    const dayData = history[date];
    if (dayData?.participants) {
      exportAttendanceCSV(dayData.participants, date);
    }
  };

  return (
    <div className="dashboard-container">
      {/* Date Banner */}
      <div className="dash-date-banner">
        <Calendar size={18} />
        <span className="dash-date-text">
          Tracking: <strong>{new Date(trackingDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>
        </span>
        {historyDates.length > 0 && (
          <span className="dash-history-count">
            <Archive size={14} />
            {historyDates.length} day{historyDates.length !== 1 ? 's' : ''} archived
          </span>
        )}
      </div>

      {/* Stats Row */}
      <div className="dashboard-stats-grid">
        <div className="dash-stat-card" style={{ '--stat-accent': 'var(--teal)' }}>
          <div className="dash-stat-icon-wrap">
            <Users size={22} />
          </div>
          <div className="dash-stat-info">
            <span className="dash-stat-number">{stats.total}</span>
            <span className="dash-stat-label">Total Participants</span>
          </div>
        </div>

        <div className="dash-stat-card" style={{ '--stat-accent': 'var(--neon-green)' }}>
          <div className="dash-stat-icon-wrap">
            <TrendingUp size={22} />
          </div>
          <div className="dash-stat-info">
            <span className="dash-stat-number">{attendancePercent}%</span>
            <span className="dash-stat-label">Attendance Rate</span>
          </div>
        </div>

        <div className="dash-stat-card" style={{ '--stat-accent': 'var(--coral)' }}>
          <div className="dash-stat-icon-wrap">
            <BarChart3 size={22} />
          </div>
          <div className="dash-stat-info">
            <span className="dash-stat-number">{totalMealsServed}</span>
            <span className="dash-stat-label">Meals Served</span>
          </div>
        </div>

        <div className="dash-stat-card" style={{ '--stat-accent': 'var(--purple)' }}>
          <div className="dash-stat-icon-wrap">
            <CheckCircle size={22} />
          </div>
          <div className="dash-stat-info">
            <span className="dash-stat-number">{recentScans.length}</span>
            <span className="dash-stat-label">Scans Today</span>
          </div>
        </div>
      </div>

      {/* Meal Breakdown Bar */}
      <div className="meal-breakdown-bar">
        {Object.entries(MEAL_ICONS).map(([key, config]) => {
          const Icon = config.icon;
          const count = stats[key] || 0;
          return (
            <div key={key} className="meal-breakdown-item" style={{ '--mb-color': config.color }}>
              <Icon size={16} />
              <span className="mb-label">{config.label}</span>
              <span className="mb-count">{count}/{stats.total}</span>
              <div className="mb-bar-track">
                <div
                  className="mb-bar-fill"
                  style={{ width: `${stats.total ? (count / stats.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Controls Row */}
      <div className="dashboard-controls">
        <div className="dash-search-group">
          <div className="input-icon">
            <Search size={18} />
          </div>
          <input
            type="text"
            className="brutalist-input"
            placeholder="Search by name or UUID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            id="dashboard-search"
          />
        </div>

        <div className="dash-filter-group">
          <Filter size={16} />
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`dash-filter-btn ${filter === opt.value ? 'active' : ''}`}
              onClick={() => setFilter(opt.value)}
              id={`filter-${opt.value}`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="dash-actions">
          <button
            className="dash-sort-btn"
            onClick={() => setSortBy(s => s === 'name' ? 'meals' : 'name')}
            id="sort-toggle-btn"
            title={`Sort by ${sortBy === 'name' ? 'meals count' : 'name'}`}
          >
            Sort: {sortBy === 'name' ? 'A→Z' : 'Meals ↓'}
          </button>
          <button
            className="brutalist-btn export-btn"
            onClick={handleExportToday}
            id="export-csv-btn"
          >
            <Download size={16} />
            Export Today
          </button>
          {historyDates.length > 0 && (
            <button
              className="brutalist-btn export-btn export-history-btn"
              onClick={handleExportHistory}
              id="export-history-btn"
            >
              <Archive size={16} />
              Export All
            </button>
          )}
        </div>
      </div>

      {/* Participants Table */}
      <div className="dashboard-table-wrap">
        <div className="dash-table-header-info">
          <span className="dash-showing">
            Showing <strong>{filteredParticipants.length}</strong> of {participantsList.length} participants
          </span>
        </div>
        <div className="dash-table-scroll">
          <table className="dash-table" id="attendance-table">
            <thead>
              <tr>
                <th className="th-index">#</th>
                <th className="th-name">Name</th>
                <th className="th-uuid">UUID</th>
                {Object.entries(MEAL_ICONS).map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <th key={key} className="th-meal">
                      <Icon size={14} style={{ color: config.color }} />
                      <span>{config.label}</span>
                    </th>
                  );
                })}
                <th className="th-total">Total</th>
              </tr>
            </thead>
            <tbody>
              {filteredParticipants.map((p, idx) => {
                const mealCount = Object.values(p.meals).filter(v => v).length;
                return (
                  <tr key={p.uuid} className={mealCount === 4 ? 'row-complete' : mealCount > 0 ? 'row-partial' : ''}>
                    <td className="td-index">{idx + 1}</td>
                    <td className="td-name">{p.name}</td>
                    <td className="td-uuid" title={p.uuid}>{p.uuid.slice(0, 8)}…</td>
                    {['breakfast', 'lunch', 'dinner', 'snacks'].map(meal => (
                      <td key={meal} className="td-meal">
                        {p.meals[meal] ? (
                          <span className="meal-pill pill-yes">
                            <CheckCircle size={12} /> Yes
                          </span>
                        ) : (
                          <span className="meal-pill pill-no">
                            <XCircle size={12} /> No
                          </span>
                        )}
                      </td>
                    ))}
                    <td className="td-total">
                      <span className={`total-badge total-${mealCount}`}>{mealCount}/4</span>
                    </td>
                  </tr>
                );
              })}
              {filteredParticipants.length === 0 && (
                <tr>
                  <td colSpan={7} className="td-empty">
                    No participants match your search/filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Archived Days */}
      {historyDates.length > 0 && (
        <div className="dashboard-table-wrap">
          <div className="dash-table-header-info">
            <span className="dash-showing">
              <Archive size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              <strong>Archived Days</strong> — {historyDates.length} day{historyDates.length !== 1 ? 's' : ''} of data preserved
            </span>
          </div>
          <div className="dash-archive-list">
            {historyDates.map(date => {
              const day = history[date];
              const pList = day.participants ? Object.values(day.participants) : [];
              const mealsCount = pList.reduce((t, p) =>
                t + Object.values(p.meals).filter(v => v).length, 0
              );
              const attended = pList.filter(p => Object.values(p.meals).some(v => v)).length;
              const dateFormatted = new Date(date + 'T00:00:00').toLocaleDateString('en-IN', {
                weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
              });

              return (
                <div key={date} className="archive-day-row">
                  <div className="archive-day-info">
                    <Calendar size={16} />
                    <span className="archive-date">{dateFormatted}</span>
                    <span className="archive-stats">
                      {attended}/{pList.length} attended • {mealsCount} meals
                    </span>
                  </div>
                  <button
                    className="brutalist-btn small export-btn"
                    onClick={() => handleExportDay(date)}
                    id={`export-${date}`}
                  >
                    <Download size={14} />
                    CSV
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
