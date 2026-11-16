import { useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, CarFront, RefreshCw } from "lucide-react";
import SearchBar from "../components/SearchBar";
import VehicleGrid from "../components/VehicleGrid";
import StateBlock from "../components/StateBlock";
import SortControl from "../components/SortControl";
import { sortVehicles } from "../lib/sort";
import { useVehicles } from "../hooks/useVehicles";
import { EASE_OUT, gsap, prefersReducedMotion, useGSAP } from "../lib/motion";
import "./Home.css";

const PREVIEW_COUNT = 8;

function buildQuery({ type, from, to }) {
  const params = new URLSearchParams();
  if (type) params.set("type", type);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export default function Home() {
  const navigate = useNavigate();
  const heroRef = useRef(null);
  const gridRef = useRef(null);
  const { vehicles, status, error, reload } = useVehicles();
  const [sort, setSort] = useState("");

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from("[data-hero-item]", {
        y: 24,
        opacity: 0,
        duration: 0.9,
        ease: EASE_OUT,
        stagger: 0.08,
        clearProps: "transform,opacity",
      });
    },
    { scope: heroRef },
  );

  const shown = useMemo(() => sortVehicles(vehicles, sort).slice(0, PREVIEW_COUNT), [vehicles, sort]);

  const handleSortChange = (next) => {
    gridRef.current?.captureLayout();
    setSort(next);
  };

  return (
    <main className="home">
      <section className="hero container" ref={heroRef}>
        <h1 data-hero-item>
          Rent a car or bike in Nepal,
          <br /> by the day.
        </h1>
        <p className="hero-lede" data-hero-item>
          Choose your dates, pick a vehicle and book online. Every price is shown in rupees per day.
        </p>
        <div data-hero-item>
          <SearchBar onSearch={(values) => navigate(`/vehicles${buildQuery(values)}`)} />
        </div>
      </section>

      <section className="fleet container" aria-labelledby="fleet-heading">
        <div className="fleet-header">
          <h2 id="fleet-heading">Browse the fleet</h2>
          <SortControl value={sort} onChange={handleSortChange} />
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
            className="vehicle-grid-preview"
            vehicles={shown}
            status={status}
            empty={
              <StateBlock icon={CarFront} title="No vehicles listed yet">
                Check back soon, the fleet is being added.
              </StateBlock>
            }
          />
        )}

        {status === "ready" && vehicles.length > 0 && (
          <div className="fleet-footer">
            <Link to={`/vehicles${sort ? `?sort=${sort}` : ""}`} className="btn btn-secondary">
              See all vehicles <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
