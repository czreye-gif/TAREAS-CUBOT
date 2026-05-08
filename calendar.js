// ============================================================
// calendar.js — Calendario mensual con indicadores y navegación
// ============================================================

const Calendar = {

  currentYear: new Date().getFullYear(),
  currentMonth: new Date().getMonth(),

  init() {
    document.getElementById('cal-prev').onclick = () => this.prevMonth();
    document.getElementById('cal-next').onclick = () => this.nextMonth();
    document.getElementById('cal-today-btn').onclick = () => this.goToToday();
    this.render();
  },

  render() {
    this.renderTitle();
    this.renderDays();
  },

  renderTitle() {
    const title = document.getElementById('cal-month-title');
    if (title) {
      title.textContent = UI.formatMonthYear(this.currentYear, this.currentMonth);
    }
  },

  renderDays() {
    const grid = document.getElementById('cal-days');
    if (!grid) return;

    const year = this.currentYear;
    const month = this.currentMonth;
    const today = storage._todayStr();

    // First day of month (Monday = 0)
    const firstDay = new Date(year, month, 1);
    let startDow = firstDay.getDay() - 1; // Monday-based
    if (startDow < 0) startDow = 6;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    // Task counts for the month
    const taskCounts = storage.getTaskCountByDay(year, month);

    let html = '';

    // Previous month padding
    for (let i = startDow - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      html += `<div class="cal-day-cell other-month" data-date="${dateStr}"><span class="cal-day-num">${day}</span></div>`;
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isToday = dateStr === today;
      const isSelected = dateStr === app.selectedDate;
      const counts = taskCounts[day];
      let indicatorHTML = '';
      let statusClass = '';

      if (counts) {
        if (counts.pending > 0 && counts.completed > 0) {
          statusClass = 'has-mixed';
        } else if (counts.completed > 0) {
          statusClass = 'has-completed';
        } else if (counts.pending > 0) {
          statusClass = 'has-pending';
        }
        indicatorHTML = `
          <div class="cal-day-indicator">
            <span class="cal-task-count">${counts.total}</span>
          </div>
        `;
      }

      html += `
        <div class="cal-day-cell ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${statusClass}"
             data-date="${dateStr}" onclick="Calendar.selectDay('${dateStr}')">
          <span class="cal-day-num">${day}</span>
          ${indicatorHTML}
        </div>
      `;
    }

    // Next month padding
    const totalCells = startDow + daysInMonth;
    const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 1; i <= remaining; i++) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      html += `<div class="cal-day-cell other-month" data-date="${dateStr}"><span class="cal-day-num">${i}</span></div>`;
    }

    grid.innerHTML = html;
  },

  selectDay(dateStr) {
    app.selectedDate = dateStr;
    app.navigate('day');
  },

  prevMonth() {
    this.currentMonth--;
    if (this.currentMonth < 0) {
      this.currentMonth = 11;
      this.currentYear--;
    }
    this.render();
  },

  nextMonth() {
    this.currentMonth++;
    if (this.currentMonth > 11) {
      this.currentMonth = 0;
      this.currentYear++;
    }
    this.render();
  },

  goToToday() {
    const now = new Date();
    this.currentYear = now.getFullYear();
    this.currentMonth = now.getMonth();
    this.render();
  },

  goToDate(dateStr) {
    const d = new Date(dateStr + 'T12:00:00');
    this.currentYear = d.getFullYear();
    this.currentMonth = d.getMonth();
    this.render();
  }
};
