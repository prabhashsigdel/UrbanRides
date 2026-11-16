import { useState } from "react";
import { Search } from "lucide-react";
import { addDaysInput, todayInput } from "../lib/format";
import "./SearchBar.css";

const TYPE_OPTIONS = [
  { value: "", label: "All" },
  { value: "car", label: "Cars" },
  { value: "bike", label: "Bikes" },
];

/**
 * Vehicle type + pickup/return dates. Calls onSearch({ type, from, to }).
 * Dates are optional; when given, return can’t be before pickup.
 * showType={false} gives the dates-only version used on the listing pages.
 */
export default function SearchBar({ initial = {}, onSearch, showType = true }) {
  const [type, setType] = useState(initial.type ?? "");
  const [from, setFrom] = useState(initial.from ?? "");
  const [to, setTo] = useState(initial.to ?? "");
  const today = todayInput();

  const handleFromChange = (value) => {
    setFrom(value);
    if (value && (!to || to < value)) setTo(addDaysInput(value, 1));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSearch({ type, from, to: from ? to : "" });
  };

  return (
    <form className="searchbar" data-dates-only={!showType} onSubmit={handleSubmit} role="search" aria-label="Find a vehicle">
      {showType && (
        <fieldset className="searchbar-type">
          <legend className="visually-hidden">Vehicle type</legend>
          {TYPE_OPTIONS.map((option) => (
            <label key={option.value || "all"} className="type-chip" data-active={type === option.value}>
              <input
                type="radio"
                name="vehicle-type"
                value={option.value}
                checked={type === option.value}
                onChange={() => setType(option.value)}
              />
              {option.label}
            </label>
          ))}
        </fieldset>
      )}

      <label className="searchbar-field">
        <span>Pickup</span>
        <input type="date" value={from} min={today} onChange={(e) => handleFromChange(e.target.value)} />
      </label>

      <label className="searchbar-field">
        <span>Return</span>
        <input type="date" value={to} min={from || today} disabled={!from} onChange={(e) => setTo(e.target.value)} />
      </label>

      <button type="submit" className="btn btn-primary searchbar-submit">
        <Search size={18} aria-hidden="true" />
        Search
      </button>
    </form>
  );
}
