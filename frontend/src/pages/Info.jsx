import { Link } from "react-router-dom";
import { ArrowRight, Mail, Phone } from "lucide-react";
import "./Info.css";

// Placeholder contact details: replace before launch.
const CONTACT = {
  phone: "+977-98XXXXXXXX",
  email: "hello@urbanrides.example",
};

export function About() {
  return (
    <main className="page">
      <article className="container info">
        <h1 className="info-title">Your own wheels, booked online.</h1>
        <div className="info-body">
          <p>
            UrbanRides rents out cars and bikes in Nepal by the day. You can see every vehicle we have, what it costs
            per day in rupees, and book the dates you need online.
          </p>
          <p>
            Pick a car for a family trip out of the valley, or a bike for getting around town. Choose where to collect
            it and where to drop it off, and we’ll call you on your number to confirm.
          </p>
        </div>
        <div className="info-links">
          <Link to="/cars" className="info-link">
            Browse cars <ArrowRight size={18} aria-hidden="true" />
          </Link>
          <Link to="/bikes" className="info-link">
            Browse bikes <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </article>
    </main>
  );
}

export function Contact() {
  return (
    <main className="page">
      <div className="container info">
        <h1 className="info-title">Contact us</h1>
        <p className="info-body">
          Questions about a booking, a vehicle or a pickup point? Call or email us and we’ll help.
        </p>
        <dl className="contact-list">
          <div>
            <dt><Phone size={20} aria-hidden="true" /> Phone</dt>
            <dd><a href={`tel:${CONTACT.phone.replace(/[^+\d]/g, "")}`} className="tabular">{CONTACT.phone}</a></dd>
          </div>
          <div>
            <dt><Mail size={20} aria-hidden="true" /> Email</dt>
            <dd><a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a></dd>
          </div>
        </dl>
      </div>
    </main>
  );
}
