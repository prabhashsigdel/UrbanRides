import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { ImagePlus, Pencil, RefreshCw, Trash2, Warehouse } from "lucide-react";
import StateBlock from "../../components/StateBlock";
import { VehiclePhoto } from "../../components/VehicleCard";
import { useVehicles } from "../../hooks/useVehicles";
import { api, errorMessage, imageUrl } from "../../lib/api";
import { formatRs, typeLabel } from "../../lib/format";
import { validateSpecs } from "../../lib/specs";
import SpecFields from "./SpecFields";

const SPEC_KEYS = ["seats", "transmission", "fuel", "mileage"];
const EMPTY_FORM = {
  type: "car",
  model: "",
  pricePerDay: "",
  available: true,
  image: null,
  existingImage: null,
  seats: "",
  transmission: "",
  fuel: "",
  mileage: "",
};
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function validate(form) {
  const errors = {};
  if (!form.model.trim()) errors.model = "Enter the vehicle's make and model.";
  const price = Number(form.pricePerDay);
  if (!form.pricePerDay || !Number.isFinite(price) || price <= 0) errors.pricePerDay = "Enter a daily price above 0.";
  return { ...errors, ...validateSpecs(form) };
}

function ImagePicker({ file, existing, onChange }) {
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : imageUrl(existing)), [file, existing]);
  useEffect(() => () => file && URL.revokeObjectURL(preview), [file, preview]);

  const handleFile = (event) => {
    const picked = event.target.files?.[0];
    event.target.value = "";
    if (!picked) return;
    if (!picked.type.startsWith("image/")) return toast.error("Choose an image file (JPG, PNG or WebP).");
    if (picked.size > MAX_IMAGE_BYTES) return toast.error("That image is over 5 MB. Choose a smaller one.");
    onChange(picked);
  };

  return (
    <label className="image-picker" data-has-image={Boolean(preview)}>
      <input type="file" accept="image/*" onChange={handleFile} />
      {preview ? (
        <>
          <img src={preview} alt="Selected vehicle" />
          <span className="image-picker-change">Change photo</span>
        </>
      ) : (
        <span className="image-picker-empty">
          <ImagePlus size={28} strokeWidth={1.5} aria-hidden="true" />
          <strong>Add a photo</strong>
          <span>JPG, PNG or WebP, up to 5 MB</span>
        </span>
      )}
    </label>
  );
}

function FleetRow({ vehicle, onEdit, onDelete, onToggle, isEditing }) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isAvailable = vehicle.available !== false && vehicle.available !== "false";

  const handleDelete = async () => {
    setIsDeleting(true);
    const ok = await onDelete(vehicle._id);
    if (!ok) {
      setIsDeleting(false);
      setIsConfirming(false);
    }
  };

  return (
    <li className="fleet-row" data-editing={isEditing}>
      <VehiclePhoto vehicle={vehicle} className="fleet-thumb" />
      <div className="fleet-info">
        <strong>{vehicle.model}</strong>
        <span>
          {typeLabel(vehicle.type)} · <span className="tabular">{formatRs(vehicle.pricePerDay)}</span> per day
        </span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={isAvailable}
        aria-label={`${vehicle.model} available to book`}
        className="fleet-status"
        data-available={isAvailable}
        onClick={() => onToggle(vehicle)}
      >
        <span className="fleet-status-track" aria-hidden="true" />
        {isAvailable ? "Available" : "Off the road"}
      </button>
      <div className="fleet-actions">
        {isConfirming ? (
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setIsConfirming(false)} disabled={isDeleting}>
              Keep
            </button>
            <button type="button" className="btn btn-danger btn-sm" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting…" : "Delete"}
            </button>
          </>
        ) : (
          <>
            <button type="button" className="icon-btn" onClick={() => onEdit(vehicle)} aria-label={`Edit ${vehicle.model}`}>
              <Pencil size={18} />
            </button>
            <button type="button" className="icon-btn" onClick={() => setIsConfirming(true)} aria-label={`Delete ${vehicle.model}`}>
              <Trash2 size={18} />
            </button>
          </>
        )}
      </div>
    </li>
  );
}

export default function FleetPanel({ onChange }) {
  const { vehicles, setVehicles, status, error, reload } = useVehicles();
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const formRef = useRef(null);

  const set = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setErrors({});
  };

  const startEdit = (vehicle) => {
    setEditingId(vehicle._id);
    setErrors({});
    setForm({
      type: vehicle.type,
      model: vehicle.model,
      pricePerDay: String(vehicle.pricePerDay),
      available: vehicle.available !== false && vehicle.available !== "false",
      image: null,
      existingImage: vehicle.image || null,
      ...Object.fromEntries(SPEC_KEYS.map((key) => [key, vehicle[key] == null ? "" : String(vehicle[key])])),
    });
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const data = new FormData();
    data.append("type", form.type);
    data.append("model", form.model.trim());
    data.append("pricePerDay", String(Number(form.pricePerDay)));
    data.append("available", String(form.available));
    // Blank specs are sent too, so clearing one in the form clears it on the vehicle.
    SPEC_KEYS.forEach((key) => data.append(key, form[key]));
    if (form.image) data.append("image", form.image);

    setIsSaving(true);
    try {
      if (editingId) {
        const { data: saved } = await api.put(`/api/vehicles/${editingId}`, data);
        setVehicles((prev) => prev.map((v) => (v._id === saved._id ? saved : v)));
        toast.success(`${saved.model} updated.`);
      } else {
        const { data: saved } = await api.post("/api/vehicles", data);
        setVehicles((prev) => [...prev, saved]);
        toast.success(`${saved.model} added to the fleet.`);
      }
      resetForm();
      onChange?.();
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't save the vehicle. Please try again."));
    } finally {
      setIsSaving(false);
    }
  };

  /** Flips availability straight away, then saves; puts it back if the save fails. */
  const toggleAvailable = async (vehicle) => {
    const available = !(vehicle.available !== false && vehicle.available !== "false");
    const setAvailable = (value) => {
      setVehicles((prev) => prev.map((v) => (v._id === vehicle._id ? { ...v, available: value } : v)));
      if (editingId === vehicle._id) setForm((prev) => ({ ...prev, available: value }));
    };
    setAvailable(available);
    try {
      await api.put(`/api/vehicles/${vehicle._id}`, { available });
      toast.success(available ? `${vehicle.model} is back on the road.` : `${vehicle.model} is off the road.`);
      onChange?.();
    } catch (err) {
      setAvailable(!available);
      toast.error(errorMessage(err, "Couldn't change availability. Please try again."));
    }
  };

  const deleteVehicle = async (id) => {
    try {
      await api.delete(`/api/vehicles/${id}`);
      setVehicles((prev) => prev.filter((v) => v._id !== id));
      if (editingId === id) resetForm();
      toast.success("Vehicle removed.");
      onChange?.();
      return true;
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't delete the vehicle."));
      return false;
    }
  };

  return (
    <div className="admin-layout">
      <form className="panel admin-form" onSubmit={handleSubmit} noValidate ref={formRef}>
        <h2>{editingId ? "Edit vehicle" : "Add a vehicle"}</h2>

        <fieldset className="field segmented-field">
          <legend className="field-label">Type</legend>
          <div className="segmented">
            {["car", "bike"].map((t) => (
              <label key={t} data-active={form.type === t}>
                <input type="radio" name="type" value={t} checked={form.type === t} onChange={() => set("type", t)} />
                {typeLabel(t)}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="field">
          <label className="field-label" htmlFor="model">Make and model</label>
          <input
            id="model"
            className="input"
            value={form.model}
            onChange={(e) => set("model", e.target.value)}
            placeholder={form.type === "bike" ? "e.g. Honda Dio" : "e.g. Hyundai Creta"}
            aria-invalid={Boolean(errors.model)}
          />
          {errors.model && <span className="field-error">{errors.model}</span>}
        </div>

        <div className="field">
          <label className="field-label" htmlFor="pricePerDay">Price per day (Rs)</label>
          <input
            id="pricePerDay"
            className="input tabular"
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={form.pricePerDay}
            onChange={(e) => set("pricePerDay", e.target.value)}
            aria-invalid={Boolean(errors.pricePerDay)}
          />
          {errors.pricePerDay && <span className="field-error">{errors.pricePerDay}</span>}
        </div>

        <label className="switch">
          <input type="checkbox" checked={form.available} onChange={(e) => set("available", e.target.checked)} />
          <span className="switch-track" aria-hidden="true" />
          <span>
            <strong>Available to book</strong>
            <span className="field-hint">Turn this off while it’s being serviced.</span>
          </span>
        </label>

        <SpecFields form={form} errors={errors} onChange={set} />

        <div className="field">
          <span className="field-label">Photo</span>
          <ImagePicker file={form.image} existing={form.existingImage} onChange={(file) => set("image", file)} />
        </div>

        <div className="admin-form-actions">
          {editingId && (
            <button type="button" className="btn btn-secondary" onClick={resetForm} disabled={isSaving}>
              Cancel
            </button>
          )}
          <button type="submit" className="btn btn-primary" disabled={isSaving}>
            {isSaving ? "Saving…" : editingId ? "Save changes" : "Add vehicle"}
          </button>
        </div>
      </form>

      <section className="fleet-list" aria-label="Vehicles in the fleet">
        {status === "loading" && <p className="loading-text">Loading fleet…</p>}
        {status === "error" && (
          <StateBlock
            icon={RefreshCw}
            title="The fleet didn’t load"
            action={<button type="button" className="btn btn-secondary" onClick={reload}>Try again</button>}
          >
            {error}
          </StateBlock>
        )}
        {status === "ready" && vehicles.length === 0 && (
          <StateBlock icon={Warehouse} title="No vehicles yet">
            Add your first car or bike with the form. It appears on the site straight away.
          </StateBlock>
        )}
        {status === "ready" && vehicles.length > 0 && (
          <ul className="fleet-rows">
            {vehicles.map((v) => (
              <FleetRow
                key={v._id}
                vehicle={v}
                onEdit={startEdit}
                onDelete={deleteVehicle}
                onToggle={toggleAvailable}
                isEditing={editingId === v._id}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
