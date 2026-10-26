const data = {"airports": [{"code": "AMD", "name": "Ahmedabad", "timezone": "Asia/Kolkata"}, {"code": "BLR", "name": "Bengaluru", "timezone": "Asia/Kolkata"}, {"code": "BOM", "name": "Mumbai", "timezone": "Asia/Kolkata"}, {"code": "CCU", "name": "Kolkata", "timezone": "Asia/Kolkata"}, {"code": "COK", "name": "Kochi", "timezone": "Asia/Kolkata"}, {"code": "DEL", "name": "Delhi", "timezone": "Asia/Kolkata"}, {"code": "GAU", "name": "Guwahati", "timezone": "Asia/Kolkata"}, {"code": "GOI", "name": "Goa", "timezone": "Asia/Kolkata"}, {"code": "HYD", "name": "Hyderabad", "timezone": "Asia/Kolkata"}, {"code": "LKO", "name": "Lucknow", "timezone": "Asia/Kolkata"}, {"code": "MAA", "name": "Chennai", "timezone": "Asia/Kolkata"}, {"code": "PAT", "name": "Patna", "timezone": "Asia/Kolkata"}, {"code": "PNQ", "name": "Pune", "timezone": "Asia/Kolkata"}, {"code": "SXR", "name": "Srinagar", "timezone": "Asia/Kolkata"}], "airlines": [{"code": "6E", "name": "IndiGo"}, {"code": "AI", "name": "Air India"}, {"code": "IX", "name": "Air India Express"}, {"code": "QP", "name": "Akasa Air"}, {"code": "SG", "name": "SpiceJet"}]};
export const names = Object.fromEntries(
  data.airports.map((a) => [a.code, a.name]),
);
export const airlineNames = Object.fromEntries(
  data.airlines.map((a) => [a.code, a.name]),
);
export const initialFilters = Object.freeze({
  stops: "direct",
  airline: [],
  band: "",
  budget: 150000,
  duration: 12,
  bag: false,
  refund: false,
  rating: 0,
});
