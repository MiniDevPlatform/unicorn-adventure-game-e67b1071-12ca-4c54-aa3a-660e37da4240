/**
 * MiniDev ONE Template - Health & Fitness Tracker
 * 
 * Steps, calories, sleep, workout tracking, and health metrics.
 */

import { FEATURES, getColors } from '@/lib/config';
import { storage } from '@/lib/storage';
import { logger } from '@/lib/logger';

// =============================================================================
// TYPES
// =============================================================================
interface HealthMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  goal?: number;
  trend: 'up' | 'down' | 'stable';
  history: { date: number; value: number }[];
}

interface Workout {
  id: string;
  name: string;
  type: 'cardio' | 'strength' | 'flexibility' | 'hiit' | 'other';
  duration: number; // minutes
  calories: number;
  date: number;
  exercises: Exercise[];
  notes?: string;
  intensity?: 'low' | 'medium' | 'high';
}

interface Exercise {
  name: string;
  sets?: number;
  reps?: number;
  duration?: number; // seconds
  weight?: number;
  rest?: number; // seconds
}

interface SleepRecord {
  id: string;
  date: number;
  startTime: number;
  endTime: number;
  duration: number; // hours
  quality: 1 | 2 | 3 | 4 | 5; // 1=poor, 5=excellent
  phases?: { deep: number; light: number; rem: number; awake: number };
  interruptions?: number;
}

interface NutritionLog {
  id: string;
  date: number;
  meals: Meal[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  water: number; // ml
}

interface Meal {
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  time: number;
}

interface StepRecord {
  date: number;
  steps: number;
  distance: number; // km
  calories: number;
  activeMinutes: number;
  goal: number;
}

// =============================================================================
// HEALTH TRACKER
// =============================================================================
class HealthTracker {
  private container: HTMLElement;
  private metrics: Map<string, HealthMetric> = new Map();
  private workouts: Workout[] = [];
  private sleepRecords: SleepRecord[] = [];
  private nutritionLogs: NutritionLog[] = [];
  private stepRecords: StepRecord[] = [];
  private storageKey: string;
  private currentView: 'dashboard' | 'workout' | 'sleep' | 'nutrition' | 'steps' | 'history' = 'dashboard';

  constructor(selector: string, storageKey: string = 'health') {
    const el = document.querySelector(selector);
    if (!el) throw new Error(`Element ${selector} not found`);
    this.container = el as HTMLElement;
    this.storageKey = storageKey;
    this.load();
    this.render();
  }

  private load(): void {
    const saved = storage.get<{
      metrics: HealthMetric[];
      workouts: Workout[];
      sleepRecords: SleepRecord[];
      nutritionLogs: NutritionLog[];
      stepRecords: StepRecord[];
    }>(this.storageKey);

    if (saved) {
      saved.metrics?.forEach(m => this.metrics.set(m.id, m));
      this.workouts = saved.workouts || [];
      this.sleepRecords = saved.sleepRecords || [];
      this.nutritionLogs = saved.nutritionLogs || [];
      this.stepRecords = saved.stepRecords || [];
    } else {
      this.initDefaultData();
    }
  }

  private save(): void {
    storage.set(this.storageKey, {
      metrics: Array.from(this.metrics.values()),
      workouts: this.workouts,
      sleepRecords: this.sleepRecords,
      nutritionLogs: this.nutritionLogs,
      stepRecords: this.stepRecords,
    });
  }

  private initDefaultData(): void {
    // Initialize default health metrics
    const defaultMetrics: HealthMetric[] = [
      { id: 'steps', name: 'Steps', value: 0, unit: 'steps', goal: 10000, trend: 'stable', history: [] },
      { id: 'calories', name: 'Calories Burned', value: 0, unit: 'kcal', goal: 2000, trend: 'stable', history: [] },
      { id: 'heart_rate', name: 'Heart Rate', value: 72, unit: 'bpm', goal: undefined, trend: 'stable', history: [] },
      { id: 'sleep', name: 'Sleep', value: 7.5, unit: 'hours', goal: 8, trend: 'stable', history: [] },
      { id: 'water', name: 'Water', value: 0, unit: 'ml', goal: 2000, trend: 'stable', history: [] },
      { id: 'weight', name: 'Weight', value: 70, unit: 'kg', goal: undefined, trend: 'stable', history: [] },
      { id: 'active', name: 'Active Minutes', value: 0, unit: 'min', goal: 30, trend: 'stable', history: [] },
    ];
    defaultMetrics.forEach(m => this.metrics.set(m.id, m));

    // Generate sample step history
    const today = new Date();
    for (let i = 30; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const steps = Math.floor(Math.random() * 5000) + 5000;
      this.stepRecords.push({
        date: date.getTime(),
        steps,
        distance: steps * 0.0008,
        calories: steps * 0.04,
        activeMinutes: Math.floor(steps / 100),
        goal: 10000,
      });
    }

    this.save();
  }

  // =============================================================================
  // NAVIGATION
  // =============================================================================
  setView(view: typeof this.currentView): void {
    this.currentView = view;
    this.render();
  }

  // =============================================================================
  // STEP TRACKING
  // =============================================================================
  addSteps(steps: number): void {
    const today = new Date().setHours(0, 0, 0, 0);
    let todayRecord = this.stepRecords.find(r => r.date === today);

    if (!todayRecord) {
      todayRecord = {
        date: today,
        steps: 0,
        distance: 0,
        calories: 0,
        activeMinutes: 0,
        goal: 10000,
      };
      this.stepRecords.push(todayRecord);
    }

    todayRecord.steps += steps;
    todayRecord.distance = todayRecord.steps * 0.0008;
    todayRecord.calories = todayRecord.steps * 0.04;
    todayRecord.activeMinutes = Math.floor(todayRecord.steps / 100);

    // Update metric
    const metric = this.metrics.get('steps');
    if (metric) {
      metric.value = todayRecord.steps;
      metric.trend = this.calculateTrend('steps');
    }

    this.save();
    this.render();
  }

  // =============================================================================
  // WORKOUT TRACKING
  // =============================================================================
  addWorkout(workout: Omit<Workout, 'id'>): Workout {
    const newWorkout: Workout = {
      ...workout,
      id: `workout_${Date.now()}`,
    };
    this.workouts.push(newWorkout);

    // Update calories metric
    const caloriesMetric = this.metrics.get('calories');
    if (caloriesMetric) {
      caloriesMetric.value += workout.calories;
      caloriesMetric.trend = this.calculateTrend('calories');
    }

    this.save();
    this.render();
    return newWorkout;
  }

  // =============================================================================
  // SLEEP TRACKING
  // =============================================================================
  addSleepRecord(record: Omit<SleepRecord, 'id'>): SleepRecord {
    const newRecord: SleepRecord = {
      ...record,
      id: `sleep_${Date.now()}`,
    };
    this.sleepRecords.push(newRecord);

    // Update sleep metric
    const sleepMetric = this.metrics.get('sleep');
    if (sleepMetric) {
      sleepMetric.value = record.duration;
      sleepMetric.trend = this.calculateTrend('sleep');
    }

    this.save();
    this.render();
    return newRecord;
  }

  // =============================================================================
  // NUTRITION TRACKING
  // =============================================================================
  addMeal(meal: Meal): void {
    const today = new Date().setHours(0, 0, 0, 0);
    let todayLog = this.nutritionLogs.find(l => l.date === today);

    if (!todayLog) {
      todayLog = {
        id: `nutrition_${today}`,
        date: today,
        meals: [],
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFat: 0,
        water: 0,
      };
      this.nutritionLogs.push(todayLog);
    }

    todayLog.meals.push(meal);
    todayLog.totalCalories += meal.calories;
    todayLog.totalProtein += meal.protein;
    todayLog.totalCarbs += meal.carbs;
    todayLog.totalFat += meal.fat;

    this.save();
    this.render();
  }

  addWater(ml: number): void {
    const today = new Date().setHours(0, 0, 0, 0);
    let todayLog = this.nutritionLogs.find(l => l.date === today);

    if (!todayLog) {
      todayLog = {
        id: `nutrition_${today}`,
        date: today,
        meals: [],
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFat: 0,
        water: 0,
      };
      this.nutritionLogs.push(todayLog);
    }

    todayLog.water += ml;

    const waterMetric = this.metrics.get('water');
    if (waterMetric) {
      waterMetric.value = todayLog.water;
      waterMetric.trend = this.calculateTrend('water');
    }

    this.save();
    this.render();
  }

  // =============================================================================
  // METRICS
  // =============================================================================
  private calculateTrend(metricId: string): 'up' | 'down' | 'stable' {
    const records = this.stepRecords.slice(-7);
    if (records.length < 2) return 'stable';

    const recent = records.slice(-3).reduce((sum, r) => sum + r.steps, 0) / 3;
    const older = records.slice(0, 3).reduce((sum, r) => sum + r.steps, 0) / 3;

    const diff = (recent - older) / older * 100;
    if (diff > 5) return 'up';
    if (diff < -5) return 'down';
    return 'stable';
  }

  // =============================================================================
  // RENDERING
  // =============================================================================
  private render(): void {
    switch (this.currentView) {
      case 'dashboard':
        this.renderDashboard();
        break;
      case 'workout':
        this.renderWorkout();
        break;
      case 'sleep':
        this.renderSleep();
        break;
      case 'nutrition':
        this.renderNutrition();
        break;
      case 'steps':
        this.renderSteps();
        break;
      case 'history':
        this.renderHistory();
        break;
    }
  }

  private renderDashboard(): void {
    const c = getColors();

    this.container.innerHTML = `
      <div class="health-dashboard p-6 space-y-6" style="background: ${c.background}">
        <!-- Header -->
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-bold">Health Dashboard</h1>
          <button id="sync-btn" class="px-4 py-2 bg-primary text-white rounded-lg flex items-center gap-2">
            🔄 Sync
          </button>
        </div>

        <!-- Quick Stats -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          ${this.renderMetricCard('steps', '🚶', 'Steps Today')}
          ${this.renderMetricCard('calories', '🔥', 'Calories')}
          ${this.renderMetricCard('heart_rate', '❤️', 'Heart Rate')}
          ${this.renderMetricCard('sleep', '😴', 'Sleep')}
        </div>

        <!-- Today's Summary -->
        <div class="bg-card rounded-xl p-6 border border-border">
          <h2 class="text-lg font-bold mb-4">Today's Summary</h2>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
            ${this.renderSummaryItem('🚶', this.getTodaySteps(), 'steps', 'Steps')}
            ${this.renderSummaryItem('🔥', this.getTodayCalories(), 'kcal', 'Burned')}
            ${this.renderSummaryItem('💧', this.getTodayWater(), 'ml', 'Water')}
            ${this.renderSummaryItem('⏱️', this.getTodayActive(), 'min', 'Active')}
          </div>
        </div>

        <!-- Progress Rings -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          ${this.renderProgressRing('steps', 'Steps', this.getTodaySteps(), this.getMetricGoal('steps'))}
          ${this.renderProgressRing('water', 'Water', this.getTodayWater(), this.getMetricGoal('water'))}
          ${this.renderProgressRing('active', 'Active', this.getTodayActive(), this.getMetricGoal('active'))}
        </div>

        <!-- Quick Actions -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button class="quick-action p-4 rounded-xl border border-border hover:border-primary transition-colors" data-action="workout">
            <span class="text-3xl mb-2 block">🏋️</span>
            <span class="font-medium">Log Workout</span>
          </button>
          <button class="quick-action p-4 rounded-xl border border-border hover:border-primary transition-colors" data-action="steps">
            <span class="text-3xl mb-2 block">🚶</span>
            <span class="font-medium">Add Steps</span>
          </button>
          <button class="quick-action p-4 rounded-xl border border-border hover:border-primary transition-colors" data-action="water">
            <span class="text-3xl mb-2 block">💧</span>
            <span class="font-medium">Add Water</span>
          </button>
          <button class="quick-action p-4 rounded-xl border border-border hover:border-primary transition-colors" data-action="food">
            <span class="text-3xl mb-2 block">🍽️</span>
            <span class="font-medium">Log Food</span>
          </button>
        </div>

        <!-- Recent Activity -->
        <div class="bg-card rounded-xl p-6 border border-border">
          <h2 class="text-lg font-bold mb-4">Recent Activity</h2>
          <div class="space-y-4">
            ${this.renderRecentActivity()}
          </div>
        </div>

        <!-- Navigation -->
        <div class="flex gap-2 overflow-x-auto pb-2">
          <button class="nav-btn px-4 py-2 rounded-lg bg-primary text-white" data-view="dashboard">Dashboard</button>
          <button class="nav-btn px-4 py-2 rounded-lg bg-muted" data-view="workout">Workouts</button>
          <button class="nav-btn px-4 py-2 rounded-lg bg-muted" data-view="sleep">Sleep</button>
          <button class="nav-btn px-4 py-2 rounded-lg bg-muted" data-view="nutrition">Nutrition</button>
          <button class="nav-btn px-4 py-2 rounded-lg bg-muted" data-view="steps">Steps</button>
          <button class="nav-btn px-4 py-2 rounded-lg bg-muted" data-view="history">History</button>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  private renderMetricCard(id: string, icon: string, title: string): string {
    const metric = this.metrics.get(id);
    if (!metric) return '';

    const trendIcon = metric.trend === 'up' ? '📈' : metric.trend === 'down' ? '📉' : '➡️';

    return `
      <div class="bg-card rounded-xl p-4 border border-border">
        <div class="flex items-center justify-between mb-2">
          <span class="text-2xl">${icon}</span>
          <span class="text-sm text-muted">${trendIcon}</span>
        </div>
        <div class="text-2xl font-bold">${Math.round(metric.value).toLocaleString()}</div>
        <div class="text-sm text-muted">${title}</div>
        ${metric.goal ? `
          <div class="mt-2 h-2 bg-muted rounded-full overflow-hidden">
            <div class="h-full bg-primary rounded-full" style="width: ${Math.min(100, (metric.value / metric.goal) * 100)}%"></div>
          </div>
          <div class="text-xs text-muted mt-1">${Math.round(metric.value)} / ${metric.goal}</div>
        ` : ''}
      </div>
    `;
  }

  private renderSummaryItem(icon: string, value: number, unit: string, label: string): string {
    return `
      <div class="text-center">
        <div class="text-3xl mb-1">${icon}</div>
        <div class="text-2xl font-bold">${value.toLocaleString()}</div>
        <div class="text-sm text-muted">${value} ${unit}</div>
        <div class="text-xs text-muted">${label}</div>
      </div>
    `;
  }

  private renderProgressRing(metricId: string, label: string, current: number, goal: number): string {
    const percentage = Math.min(100, (current / goal) * 100);
    const circumference = 2 * Math.PI * 40;
    const offset = circumference - (percentage / 100) * circumference;

    return `
      <div class="bg-card rounded-xl p-6 border border-border flex flex-col items-center">
        <div class="relative w-24 h-24">
          <svg class="w-full h-full -rotate-90">
            <circle cx="48" cy="48" r="40" fill="none" stroke="${getColors().muted}" stroke-width="8"/>
            <circle cx="48" cy="48" r="40" fill="none" stroke="${getColors().primary}" stroke-width="8"
                    stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" stroke-linecap="round"/>
          </svg>
          <div class="absolute inset-0 flex items-center justify-center">
            <span class="text-lg font-bold">${Math.round(percentage)}%</span>
          </div>
        </div>
        <div class="mt-4 text-center">
          <div class="font-bold">${label}</div>
          <div class="text-sm text-muted">${current} / ${goal}</div>
        </div>
      </div>
    `;
  }

  private renderRecentActivity(): string {
    const recentWorkouts = this.workouts.slice(-3).reverse();
    
    if (recentWorkouts.length === 0) {
      return '<p class="text-muted text-center py-4">No recent activity. Start a workout!</p>';
    }

    return recentWorkouts.map(w => `
      <div class="flex items-center gap-4 p-4 bg-muted rounded-lg">
        <div class="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-2xl">
          ${this.getWorkoutIcon(w.type)}
        </div>
        <div class="flex-1">
          <div class="font-bold">${w.name}</div>
          <div class="text-sm text-muted">${w.duration} min • ${w.calories} kcal</div>
        </div>
        <div class="text-sm text-muted">${this.formatDate(w.date)}</div>
      </div>
    `).join('');
  }

  private renderWorkout(): void {
    const c = getColors();

    this.container.innerHTML = `
      <div class="health-workout p-6 space-y-6" style="background: ${c.background}">
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-bold">Workouts</h1>
          <button id="add-workout" class="px-4 py-2 bg-primary text-white rounded-lg">+ Add Workout</button>
        </div>

        <!-- Quick Start -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          ${['cardio', 'strength', 'hiit', 'stretch'].map(type => `
            <button class="workout-type p-6 rounded-xl border border-border hover:border-primary transition-colors" data-type="${type}">
              <div class="text-4xl mb-2">${this.getWorkoutIcon(type as any)}</div>
              <div class="font-medium capitalize">${type}</div>
            </button>
          `).join('')}
        </div>

        <!-- Recent Workouts -->
        <div class="bg-card rounded-xl p-6 border border-border">
          <h2 class="text-lg font-bold mb-4">Recent Workouts</h2>
          ${this.workouts.length === 0 ? `
            <p class="text-muted text-center py-4">No workouts logged yet.</p>
          ` : `
            <div class="space-y-4">
              ${this.workouts.slice(-10).reverse().map(w => `
                <div class="flex items-center gap-4 p-4 bg-muted rounded-lg">
                  <div class="text-2xl">${this.getWorkoutIcon(w.type)}</div>
                  <div class="flex-1">
                    <div class="font-bold">${w.name}</div>
                    <div class="text-sm text-muted">${w.duration} min • ${w.calories} kcal • ${w.intensity || 'medium'}</div>
                  </div>
                  <button class="delete-workout text-muted hover:text-red-500" data-id="${w.id}">🗑️</button>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <!-- Navigation -->
        <div class="flex gap-2">
          <button class="nav-btn px-4 py-2 rounded-lg bg-muted" data-view="dashboard">← Back</button>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  private renderSleep(): void {
    const c = getColors();
    const recentSleep = this.sleepRecords.slice(-7);

    this.container.innerHTML = `
      <div class="health-sleep p-6 space-y-6" style="background: ${c.background}">
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-bold">😴 Sleep Tracker</h1>
          <button id="add-sleep" class="px-4 py-2 bg-primary text-white rounded-lg">+ Log Sleep</button>
        </div>

        <!-- Sleep Stats -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="bg-card rounded-xl p-6 border border-border text-center">
            <div class="text-4xl mb-2">🌙</div>
            <div class="text-3xl font-bold">${this.getAverageSleep().toFixed(1)}</div>
            <div class="text-muted">Avg Hours</div>
          </div>
          <div class="bg-card rounded-xl p-6 border border-border text-center">
            <div class="text-4xl mb-2">⭐</div>
            <div class="text-3xl font-bold">${this.getAverageSleepQuality().toFixed(1)}</div>
            <div class="text-muted">Avg Quality</div>
          </div>
          <div class="bg-card rounded-xl p-6 border border-border text-center">
            <div class="text-4xl mb-2">📉</div>
            <div class="text-3xl font-bold">${this.getLastNightSleep().toFixed(1)}</div>
            <div class="text-muted">Last Night</div>
          </div>
        </div>

        <!-- Sleep Chart (simple bar visualization) -->
        <div class="bg-card rounded-xl p-6 border border-border">
          <h2 class="text-lg font-bold mb-4">Last 7 Days</h2>
          <div class="flex items-end justify-around h-40 gap-2">
            ${recentSleep.map(record => {
              const height = (record.duration / 10) * 100;
              return `
                <div class="flex flex-col items-center gap-2">
                  <div class="w-8 bg-primary/20 rounded-t" style="height: ${height}%"></div>
                  <span class="text-xs text-muted">${this.getDayName(record.date)}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Navigation -->
        <div class="flex gap-2">
          <button class="nav-btn px-4 py-2 rounded-lg bg-muted" data-view="dashboard">← Back</button>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  private renderNutrition(): void {
    const c = getColors();
    const todayLog = this.getTodayNutrition();

    this.container.innerHTML = `
      <div class="health-nutrition p-6 space-y-6" style="background: ${c.background}">
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-bold">🍽️ Nutrition</h1>
          <button id="add-meal" class="px-4 py-2 bg-primary text-white rounded-lg">+ Log Meal</button>
        </div>

        <!-- Today's Macros -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="bg-card rounded-xl p-6 border border-border text-center">
            <div class="text-2xl mb-2">🔥</div>
            <div class="text-2xl font-bold">${todayLog.totalCalories}</div>
            <div class="text-sm text-muted">Calories</div>
            <div class="mt-2 h-2 bg-muted rounded-full overflow-hidden">
              <div class="h-full bg-orange-500 rounded-full" style="width: ${Math.min(100, (todayLog.totalCalories / 2000) * 100)}%"></div>
            </div>
          </div>
          <div class="bg-card rounded-xl p-6 border border-border text-center">
            <div class="text-2xl mb-2">💪</div>
            <div class="text-2xl font-bold">${todayLog.totalProtein}g</div>
            <div class="text-sm text-muted">Protein</div>
          </div>
          <div class="bg-card rounded-xl p-6 border border-border text-center">
            <div class="text-2xl mb-2">🍞</div>
            <div class="text-2xl font-bold">${todayLog.totalCarbs}g</div>
            <div class="text-sm text-muted">Carbs</div>
          </div>
          <div class="bg-card rounded-xl p-6 border border-border text-center">
            <div class="text-2xl mb-2">🥑</div>
            <div class="text-2xl font-bold">${todayLog.totalFat}g</div>
            <div class="text-sm text-muted">Fat</div>
          </div>
        </div>

        <!-- Water Tracking -->
        <div class="bg-card rounded-xl p-6 border border-border">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-bold">💧 Water</h2>
            <span>${todayLog.water} / 2000 ml</span>
          </div>
          <div class="flex gap-4">
            <button class="water-btn px-4 py-2 bg-blue-100 text-blue-600 rounded-lg" data-amount="250">+250ml</button>
            <button class="water-btn px-4 py-2 bg-blue-100 text-blue-600 rounded-lg" data-amount="500">+500ml</button>
            <button class="water-btn px-4 py-2 bg-blue-100 text-blue-600 rounded-lg" data-amount="1000">+1000ml</button>
          </div>
        </div>

        <!-- Meals -->
        <div class="bg-card rounded-xl p-6 border border-border">
          <h2 class="text-lg font-bold mb-4">Today's Meals</h2>
          ${todayLog.meals.length === 0 ? `
            <p class="text-muted text-center py-4">No meals logged yet.</p>
          ` : `
            <div class="space-y-4">
              ${todayLog.meals.map(meal => `
                <div class="flex items-center gap-4 p-4 bg-muted rounded-lg">
                  <div class="text-2xl">${this.getMealIcon(meal.type)}</div>
                  <div class="flex-1">
                    <div class="font-bold">${meal.name}</div>
                    <div class="text-sm text-muted">${meal.calories} kcal • ${meal.type}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <!-- Navigation -->
        <div class="flex gap-2">
          <button class="nav-btn px-4 py-2 rounded-lg bg-muted" data-view="dashboard">← Back</button>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  private renderSteps(): void {
    const c = getColors();
    const todaySteps = this.getTodaySteps();

    this.container.innerHTML = `
      <div class="health-steps p-6 space-y-6" style="background: ${c.background}">
        <h1 class="text-2xl font-bold">🚶 Step Counter</h1>

        <!-- Today's Progress -->
        <div class="bg-card rounded-xl p-8 border border-border text-center">
          <div class="text-6xl mb-4">🚶</div>
          <div class="text-5xl font-bold mb-2">${todaySteps.toLocaleString()}</div>
          <div class="text-muted mb-4">steps today</div>
          <div class="w-full h-4 bg-muted rounded-full overflow-hidden">
            <div class="h-full bg-green-500 rounded-full transition-all" style="width: ${Math.min(100, (todaySteps / 10000) * 100)}%"></div>
          </div>
          <div class="text-sm text-muted mt-2">Goal: 10,000 steps</div>
        </div>

        <!-- Add Steps -->
        <div class="bg-card rounded-xl p-6 border border-border">
          <h2 class="text-lg font-bold mb-4">Add Steps</h2>
          <div class="flex gap-4">
            <input type="number" id="step-input" placeholder="Enter steps" class="flex-1 px-4 py-3 rounded-lg border border-border">
            <button id="add-steps" class="px-6 py-3 bg-primary text-white rounded-lg">Add</button>
          </div>
        </div>

        <!-- Quick Add -->
        <div class="flex flex-wrap gap-2">
          <button class="quick-steps px-4 py-2 bg-muted rounded-lg" data-steps="1000">+1,000</button>
          <button class="quick-steps px-4 py-2 bg-muted rounded-lg" data-steps="2000">+2,000</button>
          <button class="quick-steps px-4 py-2 bg-muted rounded-lg" data-steps="5000">+5,000</button>
          <button class="quick-steps px-4 py-2 bg-muted rounded-lg" data-steps="10000">+10,000</button>
        </div>

        <!-- Weekly Chart -->
        <div class="bg-card rounded-xl p-6 border border-border">
          <h2 class="text-lg font-bold mb-4">This Week</h2>
          <div class="flex items-end justify-around h-48 gap-2">
            ${this.getWeeklySteps().map((steps, i) => {
              const day = new Date();
              day.setDate(day.getDate() - (6 - i));
              const height = (steps / 15000) * 100;
              return `
                <div class="flex flex-col items-center gap-2">
                  <div class="w-12 bg-green-500/20 rounded-t relative" style="height: ${height}%">
                    <div class="absolute bottom-0 w-full bg-green-500 rounded-t" style="height: ${(steps / 10000) * 100}%"></div>
                  </div>
                  <span class="text-xs text-muted">${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day.getDay()]}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Navigation -->
        <div class="flex gap-2">
          <button class="nav-btn px-4 py-2 rounded-lg bg-muted" data-view="dashboard">← Back</button>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  private renderHistory(): void {
    const c = getColors();

    this.container.innerHTML = `
      <div class="health-history p-6 space-y-6" style="background: ${c.background}">
        <h1 class="text-2xl font-bold">📊 History</h1>

        <!-- Activity History -->
        <div class="bg-card rounded-xl p-6 border border-border">
          <h2 class="text-lg font-bold mb-4">Workout History</h2>
          ${this.workouts.length === 0 ? `
            <p class="text-muted text-center py-4">No workout history.</p>
          ` : `
            <div class="space-y-4">
              ${this.workouts.slice().reverse().slice(0, 20).map(w => `
                <div class="flex items-center gap-4 p-4 bg-muted rounded-lg">
                  <div class="text-2xl">${this.getWorkoutIcon(w.type)}</div>
                  <div class="flex-1">
                    <div class="font-bold">${w.name}</div>
                    <div class="text-sm text-muted">${w.duration} min • ${w.calories} kcal</div>
                  </div>
                  <div class="text-sm text-muted">${this.formatDate(w.date)}</div>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <!-- Navigation -->
        <div class="flex gap-2">
          <button class="nav-btn px-4 py-2 rounded-lg bg-muted" data-view="dashboard">← Back</button>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================
  private attachEvents(): void {
    // Navigation
    this.container.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = (btn as HTMLElement).dataset.view as typeof this.currentView;
        this.setView(view);
      });
    });

    // Quick actions
    this.container.querySelectorAll('.quick-action').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = (btn as HTMLElement).dataset.action;
        if (action === 'steps') this.setView('steps');
        else if (action === 'water') this.setView('nutrition');
        else if (action === 'workout') this.setView('workout');
        else if (action === 'food') this.setView('nutrition');
      });
    });

    // Add steps
    this.container.querySelector('#add-steps')?.addEventListener('click', () => {
      const input = document.getElementById('step-input') as HTMLInputElement;
      const steps = parseInt(input.value);
      if (steps > 0) {
        this.addSteps(steps);
        input.value = '';
      }
    });

    this.container.querySelectorAll('.quick-steps').forEach(btn => {
      btn.addEventListener('click', () => {
        const steps = parseInt((btn as HTMLElement).dataset.steps || '0');
        this.addSteps(steps);
      });
    });

    // Water buttons
    this.container.querySelectorAll('.water-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const amount = parseInt((btn as HTMLElement).dataset.amount || '0');
        this.addWater(amount);
      });
    });
  }

  private getTodaySteps(): number {
    const today = new Date().setHours(0, 0, 0, 0);
    const todayRecord = this.stepRecords.find(r => r.date === today);
    return todayRecord?.steps || 0;
  }

  private getTodayCalories(): number {
    const today = new Date().setHours(0, 0, 0, 0);
    const todayRecord = this.stepRecords.find(r => r.date === today);
    return todayRecord?.calories || 0;
  }

  private getTodayWater(): number {
    const today = new Date().setHours(0, 0, 0, 0);
    const todayLog = this.nutritionLogs.find(l => l.date === today);
    return todayLog?.water || 0;
  }

  private getTodayActive(): number {
    const today = new Date().setHours(0, 0, 0, 0);
    const todayRecord = this.stepRecords.find(r => r.date === today);
    return todayRecord?.activeMinutes || 0;
  }

  private getTodayNutrition(): NutritionLog {
    const today = new Date().setHours(0, 0, 0, 0);
    return this.nutritionLogs.find(l => l.date === today) || {
      id: '', date: today, meals: [],
      totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0, water: 0
    };
  }

  private getMetricGoal(id: string): number {
    return this.metrics.get(id)?.goal || 100;
  }

  private getWeeklySteps(): number[] {
    const result: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const record = this.stepRecords.find(r => r.date === date.getTime());
      result.push(record?.steps || 0);
    }
    return result;
  }

  private getAverageSleep(): number {
    if (this.sleepRecords.length === 0) return 0;
    return this.sleepRecords.reduce((sum, r) => sum + r.duration, 0) / this.sleepRecords.length;
  }

  private getAverageSleepQuality(): number {
    if (this.sleepRecords.length === 0) return 0;
    return this.sleepRecords.reduce((sum, r) => sum + r.quality, 0) / this.sleepRecords.length;
  }

  private getLastNightSleep(): number {
    if (this.sleepRecords.length === 0) return 0;
    return this.sleepRecords[this.sleepRecords.length - 1].duration;
  }

  private getWorkoutIcon(type: string): string {
    const icons: Record<string, string> = {
      cardio: '🏃',
      strength: '🏋️',
      flexibility: '🧘',
      hiit: '⚡',
      other: '💪',
    };
    return icons[type] || '💪';
  }

  private getMealIcon(type: string): string {
    const icons: Record<string, string> = {
      breakfast: '🍳',
      lunch: '🥗',
      dinner: '🍽️',
      snack: '🍿',
    };
    return icons[type] || '🍽️';
  }

  private formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  private getDayName(timestamp: number): string {
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(timestamp).getDay()];
  }
}

// =============================================================================
// EXPORTS
// =============================================================================
export { HealthTracker, HealthMetric, Workout, Exercise, SleepRecord, NutritionLog, Meal, StepRecord };
export default HealthTracker;