const moment = require("moment");

class WorkingHours {
  constructor(db) {
    this.db = db;
    this.leisureDays = [];
    this.mrfWorkingHours = [];
    this.leisureDaysByDate = {};
    this.workingHoursByMrf = {};
  }

  isWorkingHours(datetime_started, mrf_id) {
    if (!datetime_started) return null;

    const workingHours = this.workingHoursByMrf[mrf_id];

    const started = moment(datetime_started).utc();

    const nextDay = started.clone().add(1, "day");

    const startedDateStr = started.format("YYYY-MM-DD");
    const nextDayDateStr = nextDay.format("YYYY-MM-DD");

    if (this.leisureDaysByDate[startedDateStr]) return false;

    const startedStartHours = started
      .clone()
      .hour(workingHours.startHours)
      .minute(workingHours.startMinutes)
      .startOf("minute");

    const startedEndHours = started
      .clone()
      .hour(workingHours.endHours)
      .minute(workingHours.endMinutes)
      .startOf("minute");

    let shift = 0;
    const nextLeisureDay = this.leisureDaysByDate[nextDayDateStr];
    if (nextLeisureDay) {
      if (started.day() === 5) {
        shift = workingHours.friday_hours_shift;
        if (nextLeisureDay.is_holiday) {
          if (
            workingHours.holiday_hours_shift < workingHours.friday_hours_shift
          ) {
            shift = workingHours.holiday_hours_shift;
          }
        }
      } else if (nextLeisureDay.is_holiday) {
        shift = workingHours.holiday_hours_shift;
      }
    }

    startedEndHours.add(shift, "minutes");

    return (
      started.isSameOrAfter(startedStartHours) &&
      started.isSameOrBefore(startedEndHours)
    );
  }

  async init() {
    const leisureDaysSql = "SELECT * FROM case_leisure_days";
    const workingHoursSql = "SELECT * FROM case_working_hours";

    this.leisureDays = (await this.db.raw(leisureDaysSql))[0];
    this.leisureDays.forEach(day => {
      const dateStr = day.date.toISOString().split("T")[0];
      this.leisureDaysByDate[dateStr] = day;
    });
    this.mrfWorkingHours = (await this.db.raw(workingHoursSql))[0];

    this.mrfWorkingHours.forEach(workingHours => {
      const startTimeParts = workingHours.start.split(":");
      const endTimeParts = workingHours.end.split(":");

      workingHours.startHours = parseInt(startTimeParts[0]);
      workingHours.startMinutes = parseInt(startTimeParts[1]);

      workingHours.endHours = parseInt(endTimeParts[0]);
      workingHours.endMinutes = parseInt(endTimeParts[1]);

      this.workingHoursByMrf[workingHours.mrf_id] = workingHours;
    });
  }
}

module.exports = WorkingHours;
