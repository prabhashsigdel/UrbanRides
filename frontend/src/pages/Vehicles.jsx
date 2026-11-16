import { useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CarFront, RefreshCw } from "lucide-react";
import SearchBar from "../components/SearchBar";
import VehicleGrid from "../components/VehicleGrid";
import StateBlock from "../components/StateBlock";
import SortControl from "../components/SortControl";
import { parseSort, sortVehicles } from "../lib/sort";
import { useVehicles } from "../hooks/useVehicles";
import { formatDate, rentalDays } from "../lib/format";
import "./Vehicles.css";

const TITLES = { car: "Cars for rent", bike: "Bikes for rent", "": "All vehicles" };
const PATHS = { car: "/cars", bike: "/bikes", "": "/vehicles" };

/** Fleet listing. `fixedType` comes from the /cars and /bikes routes; otherwise ?type= decides. */
export default function Vehicles({ fixedType }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const gridRef = useRef(null);
  const { vehicles, status, error, reload } = useVehicles();

  const type = fixedType ?? params.get("type") ?? "";
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const sort = parseSort(params.get("sort"));
  const days = rentalDays(from, to);

  // Dates travel on to the booking page; sort only matters here.
  const dateQuery = useMemo(() => {
    const q = new URLSearchParams();
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    const s = q.toString();
    return s ? `?${s}` : "";
  }, [from, to]);

  const shown = useMemo(
    () => sortVehicles(vehicles.filter((v) => !type || v.type === type), sort),
    [vehicles, type, sort],
  );

  const navigateWith = ({ nextFrom = from, nextTo = to, nextSort = sort }) => {
    const q = new URLSearchParams();
    if (!fixedType && type) q.set("type", type);
    if (nextFrom) q.set("from", nextFrom);
    if (nextTo) q.set("to", nextTo);
    if (nextSort) q.set("sort", nextSort);
    const s = q.toString();
    gridRef.current?.captureLayout();
    navigate(`${PATHS[type] ?? "/vehicles"}${s ? `?${s}` : ""}`, { replace: true });
  };

  const countLabel = status === "ready" ? `${shown.length} ${shown.length === 1 ? "vehicle" : "vehicles"}` : "";

  return (
    <main className="page vehicles-page">
      <div className="container">
        <div className="vehicles-search">
          <SearchBar
            key={`${type}|${from}|${to}`}
            initial={{ type, from, to }}
            showType={false}
            onSearch={({ from: f, to: t }) => navigateWith({ nextFrom: f, nextTo: t })}
          />
        </div>

        <div className="page-header listing-header">
          <div>
            <h1 className="page-title">{TITLES[type] ?? TITLES[""]}</h1>
            <p className="page-lede tabular">
              {days > 0
                ? `${formatDate(from, { short: true })} to ${formatDate(to, { short: true })}, ${days} ${days === 1 ? "day" : "days"}. ${countLabel}`
                : countLabel || " "}
            </p>
          </div>
          <SortControl value={sort} onChange={(nextSort) => navigateWith({ nextSort })} />
        </div>

        {status === "error" ? (
          <StateBlock
            icon={RefreshCw}
            title="Vehicles didn’t load"
            action={
              <button type="button" className="btn btn-secondary" onClick={reload}>
                Try again
              </button>
            }
          >
            {error}
          </StateBlock>
        ) : (
          <VehicleGrid
            ref={gridRef}
            vehicles={shown}
            status={status}
            search={dateQuery}
            empty={
              <StateBlock icon={CarFront} title={type ? `No ${type === "car" ? "cars" : "bikes"} listed yet` : "No vehicles listed yet"}>
                Check back soon.
              </StateBlock>
            }
          />
        )}
      </div>
    </main>
  );
}
