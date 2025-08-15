import { useState } from "react";
import { addMonths, format, isToday, isSameMonth, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameDay } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Calendar({ events, onSelectDate, selectedDate }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const firstDayCurrentMonth = startOfMonth(currentMonth);
  const lastDayCurrentMonth = endOfMonth(currentMonth);

  const days = eachDayOfInterval({
    start: startOfWeek(firstDayCurrentMonth, { weekStartsOn: 0 }),
    end: endOfWeek(lastDayCurrentMonth, { weekStartsOn: 0 }),
  });

  const handlePrevMonth = () => {
    setCurrentMonth(addMonths(currentMonth, -1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  return (
    <div className="p-4 card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={handlePrevMonth} className="p-2 hover:bg-black/5 rounded-lg">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold">{format(currentMonth, "MMMM yyyy")}</h2>
        <button onClick={handleNextMonth} className="p-2 hover:bg-black/5 rounded-lg">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 text-center text-sm font-medium text-black/60 mb-2">
        <div>Sun</div>
        <div>Mon</div>
        <div>Tue</div>
        <div>Wed</div>
        <div>Thu</div>
        <div>Fri</div>
        <div>Sat</div>
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dayEvents = events.filter((ev) =>
            isSameDay(new Date(ev.date), day)
          );
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isOtherMonth = !isSameMonth(day, currentMonth);

          return (
            <button
              key={day.toString()}
              onClick={() => onSelectDate(day)}
              className={
                "aspect-square rounded-lg p-1 text-sm text-left relative transition " +
                (dayEvents.length > 0 && !isSelected
                  ? "bg-blue-200/40 hover:bg-blue-200/60 "
                  : "") +
                (isSelected
                  ? "bg-brand-heron text-white"
                  : isToday(day)
                  ? "bg-brand.water/20 text-brand-heron"
                  : isOtherMonth
                  ? "text-black/40 hover:bg-black/5"
                  : "hover:bg-black/5")
              }
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}