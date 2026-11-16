export const SORTS = [
  { value: "", label: "Recommended" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "name", label: "Name: A to Z" },
];

/** A known sort value, or "" (Recommended) for anything else, e.g. from the URL. */
export function parseSort(value) {
  return SORTS.some((s) => s.value === value) ? value : "";
}

const isAvailable = (v) => v.available !== false;

/** Available vehicles first, then by the chosen order. */
export function sortVehicles(list, sort) {
  const byAvailability = (a, b) => Number(isAvailable(b)) - Number(isAvailable(a));
  const comparators = {
    "price-asc": (a, b) => Number(a.pricePerDay) - Number(b.pricePerDay),
    "price-desc": (a, b) => Number(b.pricePerDay) - Number(a.pricePerDay),
    name: (a, b) => a.model.localeCompare(b.model),
  };
  const compare = comparators[sort];
  return [...list].sort((a, b) => byAvailability(a, b) || (compare ? compare(a, b) : 0));
}
