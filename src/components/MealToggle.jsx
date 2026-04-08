import { Coffee, Sun, Moon, Cookie } from 'lucide-react';
import { useMeal } from '../context/MealContext';

const MEAL_CONFIG = {
  breakfast: {
    icon: Coffee,
    label: 'Breakfast',
    color: '#FFE66D',
    emoji: '🌅'
  },
  lunch: {
    icon: Sun,
    label: 'Lunch',
    color: '#4ECDC4',
    emoji: '☀️'
  },
  dinner: {
    icon: Moon,
    label: 'Dinner',
    color: '#FF6B6B',
    emoji: '🌙'
  },
  snacks: {
    icon: Cookie,
    label: 'Snacks',
    color: '#C084FC',
    emoji: '🍪'
  }
};

export default function MealToggle() {
  const { currentMeal, setCurrentMeal, getStats, MEAL_OPTIONS } = useMeal();
  const stats = getStats();

  return (
    <div className="meal-toggle-section">
      <h2 className="section-title">MEAL SESSION</h2>
      <div className="meal-buttons">
        {MEAL_OPTIONS.map((meal) => {
          const config = MEAL_CONFIG[meal];
          const Icon = config.icon;
          const count = stats[meal] || 0;

          return (
            <button
              key={meal}
              className={`meal-btn ${currentMeal === meal ? 'active' : ''}`}
              onClick={() => setCurrentMeal(meal)}
              style={{
                '--meal-color': config.color,
                '--meal-shadow': currentMeal === meal ? config.color : '#000'
              }}
              id={`meal-btn-${meal}`}
            >
              <span className="meal-icon-circle" style={{ borderColor: config.color }}>
                <Icon size={22} />
              </span>
              <span className="meal-label">{config.label}</span>
              <span className="meal-count">{count}/{stats.total}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
