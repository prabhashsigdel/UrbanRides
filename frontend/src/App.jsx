import { useEffect } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import RequireAuth from "./auth/RequireAuth";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Vehicles from "./pages/Vehicles";
import Booking from "./pages/Booking";
import Orders from "./pages/Orders";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import Account from "./pages/Account";
import { About, Contact } from "./pages/Info";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

/** Admins land on their dashboard; everyone else gets the browse page. Cars and Bikes stay open to admins. */
function HomeOrDashboard() {
  const { isAdmin } = useAuth();
  return isAdmin ? <Navigate to="/admin" replace /> : <Home />;
}

function NotFound() {
  return (
    <main className="page container">
      <h1 className="page-title">Page not found</h1>
      <p className="page-lede">That page doesn’t exist or has moved.</p>
      <p style={{ marginTop: "var(--space-5)" }}>
        <Link to="/" className="btn btn-primary">Go to the home page</Link>
      </p>
    </main>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Navbar />
        <Routes>
          <Route path="/" element={<HomeOrDashboard />} />
          <Route path="/vehicles" element={<Vehicles />} />
          <Route path="/cars" element={<Vehicles fixedType="car" />} />
          <Route path="/bikes" element={<Vehicles fixedType="bike" />} />
          <Route path="/about-us" element={<About />} />
          <Route path="/contact-us" element={<Contact />} />
          <Route path="/log-in" element={<Auth mode="login" />} />
          <Route path="/sign-up" element={<Auth mode="signup" />} />
          <Route
            path="/book-vehicle/:vehicleId"
            element={
              <RequireAuth>
                <Booking />
              </RequireAuth>
            }
          />
          <Route
            path="/my-orders"
            element={
              <RequireAuth>
                <Orders />
              </RequireAuth>
            }
          />
          <Route
            path="/account"
            element={
              <RequireAuth>
                <Account />
              </RequireAuth>
            }
          />
          <Route
            path="/admin"
            element={
              <RequireAuth adminOnly>
                <Admin />
              </RequireAuth>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Footer />
        <ToastContainer position="bottom-center" autoClose={3500} hideProgressBar newestOnTop closeOnClick theme="light" />
      </BrowserRouter>
    </AuthProvider>
  );
}
