const getSriLankaDateString = (date = new Date()) => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
  }).format(date);
};

const getDurationInSeconds = (start, end) => {
  if (!start || !end) {
    return 0;
  }

  return Math.max(0, Math.floor((new Date(end) - new Date(start)) / 1000));
};

const formatSecondsToTime = (seconds = 0) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return `${hrs}h ${mins}m ${secs}s`;
};

module.exports = {
  getSriLankaDateString,
  getDurationInSeconds,
  formatSecondsToTime,
};