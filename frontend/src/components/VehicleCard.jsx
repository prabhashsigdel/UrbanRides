import { Link } from "react-router-dom";
import { Bike, CarFront } from "lucide-react";
import { imageUrl } from "../lib/api";
import { formatRs, typeLabel } from "../lib/format";
import "./VehicleCard.css";

export function VehiclePhoto({ vehicle, className = "" }) {
  const src = imageUrl(vehicle.image);
  const Icon = vehicle.type === "bike" ? Bike : CarFront;
  return (
    <div className={`vehicle-photo ${className}`}>
      {src ? (
        <img src={src} alt={vehicle.model} loading="lazy" decoding="async" />
      ) : (
        <div className="vehicle-photo-empty" role="img" aria-label={`No photo of ${vehicle.model} yet`}>
          <Icon size={40} strokeWidth={1.5} aria-hidden="true" />
        </div>
      )}
    </div>
  );
}

/** One vehicle in the fleet grid. `search` carries chosen dates into the booking page. */
export default function VehicleCard({ vehicle, search = "" }) {
  const isAvailable = vehicle.available !== false;
  const body = (
    <>
      <VehiclePhoto vehicle={vehicle} />
      <div className="vehicle-meta">
        <div className="vehicle-heading">
          <h3>{vehicle.model}</h3>
          <span className="vehicle-type">{typeLabel(vehicle.type)}</span>
        </div>
        <p className="vehicle-price tabular">
          <strong>{formatRs(vehicle.pricePerDay)}</strong> per day
        </p>
        {!isAvailable && <p className="vehicle-unavailable">Not available right now</p>}
      </div>
    </>
  );

  return (
    <li className="vehicle-card" data-available={isAvailable}>
      {isAvailable ? (
        <Link
          to={`/book-vehicle/${vehicle._id}${search}`}
          aria-label={`Book ${vehicle.model}, ${formatRs(vehicle.pricePerDay)} per day`}
        >
          {body}
        </Link>
      ) : (
        <div aria-disabled="true">{body}</div>
      )}
    </li>
  );
}
