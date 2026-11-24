export const displayLocale = "en-MY";
export const displayTimeZone = "Asia/Kuala_Lumpur";

export const dateFormat = new Intl.DateTimeFormat(displayLocale, {
  dateStyle: "medium",
  timeZone: displayTimeZone,
});
