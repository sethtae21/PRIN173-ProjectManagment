import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ShopperDashboard from "./pages/ShopperDashboard";
import GuestPage from "./pages/GuestPage";
import CatalogPage from "./pages/CatalogPage";

import "./App.css";

function TemporaryPage({
  title,
  message,
  returnTo = "/login",
  returnLabel = "Return to Login",
}) {
  return (
    <main className="temporary-page">
      <div>
        <h1>{title}</h1>

        <p>{message}</p>

        <a href={returnTo}>
          {returnLabel}
        </a>
      </div>
    </main>
  );
}

function App() {
  return (
    <Routes>
      {/* Default page */}
      <Route
        path="/"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />

      {/* Authentication */}
      <Route
        path="/login"
        element={<LoginPage />}
      />

      <Route
        path="/signup"
        element={<SignupPage />}
      />

      <Route
        path="/forgot-password"
        element={
          <TemporaryPage
            title="Forgot Password"
            message="Password recovery will be added next."
          />
        }
      />

      {/* Guest pages */}
      <Route
        path="/guest"
        element={<GuestPage />}
      />

      <Route
        path="/guest/fitting-studio"
        element={
          <TemporaryPage
            title="Guest Fitting Studio"
            message="Avatar customization is temporarily available during this guest session."
            returnTo="/guest"
            returnLabel="Return to Guest Dashboard"
          />
        }
      />

      <Route
        path="/guest/avatar-presets"
        element={
          <TemporaryPage
            title="Guest Avatar Presets"
            message="One premade avatar is available for temporary use."
            returnTo="/guest"
            returnLabel="Return to Guest Dashboard"
          />
        }
      />

      <Route
        path="/guest/catalog"
        element={
          <TemporaryPage
            title="Guest Catalog"
            message="You may browse products and recommendations, but saving and purchasing are locked."
            returnTo="/guest"
            returnLabel="Return to Guest Dashboard"
          />
        }
      />

      {/* Registered shopper pages */}
      <Route
        path="/shopper/dashboard"
        element={<ShopperDashboard />}
      />

      <Route
        path="/shopper/fitting-studio"
        element={
          <TemporaryPage
            title="Fitting Studio"
            message="Male and Female avatar customization will be added here."
            returnTo="/shopper/dashboard"
            returnLabel="Return to Shopper Dashboard"
          />
        }
      />

      <Route
        path="/shopper/avatar-presets"
        element={
          <TemporaryPage
            title="Avatar Presets"
            message="One premade avatar preset is available."
            returnTo="/shopper/dashboard"
            returnLabel="Return to Shopper Dashboard"
          />
        }
      />

      {/* Functional registered shopper catalog */}
      <Route
        path="/shopper/catalog"
        element={<CatalogPage />}
      />

      {/* Temporary destination when View Details is clicked */}
      <Route
        path="/shopper/products/:productId"
        element={
          <TemporaryPage
            title="Product Details"
            message="The complete product information, seller details, ratings, reviews, sizes, and purchasing options will appear here."
            returnTo="/shopper/catalog"
            returnLabel="Return to Catalog"
          />
        }
      />

      <Route
        path="/shopper/saved-outfits"
        element={
          <TemporaryPage
            title="Saved Outfits"
            message="You have no saved outfits yet."
            returnTo="/shopper/dashboard"
            returnLabel="Return to Shopper Dashboard"
          />
        }
      />

      <Route
        path="/shopper/cart"
        element={
          <TemporaryPage
            title="Shopping Cart"
            message="Your shopping cart is currently empty."
            returnTo="/shopper/catalog"
            returnLabel="Continue Shopping"
          />
        }
      />

      <Route
        path="/shopper/account"
        element={
          <TemporaryPage
            title="Account Management"
            message="Your account management options will appear here."
            returnTo="/shopper/dashboard"
            returnLabel="Return to Shopper Dashboard"
          />
        }
      />

      {/* Seller pages */}
      <Route
        path="/seller/dashboard"
        element={
          <TemporaryPage
            title="Seller Dashboard"
            message="Seller management tools will be added here."
          />
        }
      />

      {/* Unknown URLs return to login */}
      <Route
        path="*"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />
    </Routes>
  );
}

export default App;