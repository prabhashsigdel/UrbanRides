import { FUELS, TRANSMISSIONS } from "../../lib/specs";

/** Optional specs in the fleet form. Anything left blank simply doesn't show on the site. */
export default function SpecFields({ form, errors, onChange }) {
  const isElectric = form.fuel === "electric";

  return (
    <fieldset className="spec-fields">
      <legend className="field-label">
        Specs <span className="field-hint">optional, shown to customers</span>
      </legend>

      <div className="field">
        <label className="field-label" htmlFor="seats">Seats</label>
        <input
          id="seats"
          className="input tabular"
          type="number"
          min="1"
          max="15"
          step="1"
          inputMode="numeric"
          placeholder={form.type === "bike" ? "e.g. 2" : "e.g. 5"}
          value={form.seats}
          onChange={(e) => onChange("seats", e.target.value)}
          aria-invalid={Boolean(errors.seats)}
        />
        {errors.seats && <span className="field-error">{errors.seats}</span>}
      </div>

      <div className="field">
        <label className="field-label" htmlFor="transmission">Gearbox</label>
        <select id="transmission" className="input" value={form.transmission} onChange={(e) => onChange("transmission", e.target.value)}>
          <option value="">Not set</option>
          {TRANSMISSIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="fuel">Fuel</label>
        <select id="fuel" className="input" value={form.fuel} onChange={(e) => onChange("fuel", e.target.value)}>
          <option value="">Not set</option>
          {FUELS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="mileage">{isElectric ? "Range (km per charge)" : "Mileage (km/l)"}</label>
        <input
          id="mileage"
          className="input tabular"
          type="number"
          min="1"
          max="1000"
          step="1"
          inputMode="numeric"
          placeholder={isElectric ? "e.g. 180" : form.type === "bike" ? "e.g. 45" : "e.g. 20"}
          value={form.mileage}
          onChange={(e) => onChange("mileage", e.target.value)}
          aria-invalid={Boolean(errors.mileage)}
        />
        {errors.mileage && <span className="field-error">{errors.mileage}</span>}
      </div>
    </fieldset>
  );
}
