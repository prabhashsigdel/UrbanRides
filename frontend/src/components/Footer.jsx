import { Link } from "react-router-dom";
import "./Footer.css";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <Link to="/" className="wordmark">
            Urban<span>Rides</span>
          </Link>
          <p>Cars and bikes for rent in Nepal, booked by the day.</p>
        </div>
        <nav className="footer-links" aria-label="Footer">
          <Link to="/cars">Cars</Link>
          <Link to="/bikes">Bikes</Link>
          <Link to="/about-us">About</Link>
          <Link to="/contact-us">Contact</Link>
        </nav>
      </div>
      <div className="container footer-base">
        <span>© {new Date().getFullYear()} UrbanRides</span>
      </div>
    </footer>
  );
}
