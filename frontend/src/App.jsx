import { useEffect } from "react";

import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

/* Layouts */
import ShopperLayout from "./layouts/ShopperLayout";
import GuestLayout from "./layouts/GuestLayout";
import SellerLayout from "./layouts/SellerLayout";

/* Shared Pages */
import LandingPage from "./pages/Shared Pages/LandingPage";
import ChooseRegistrationRolePage from "./pages/Shared Pages/ChooseRegistrationRolePage";

/* Authentication Pages */
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import GuestPage from "./pages/GuestPage";

/* Shopper Pages */
import ShopperDashboard from "./pages/ShopperDashboard";
import ChooseAvatarGenderPage from "./pages/ChooseAvatarGenderPage";
import FittingStudioPage from "./pages/FittingStudioPage";
import CartSelectedItems from "./pages/CartSelectedItems";

import AvatarPresetPage from "./pages/AvatarPresetPage";
import EditAvatarPresetPage from "./pages/EditAvatarPresetPage";

import CatalogPage from "./pages/CatalogPage";
import ProductDetailsPage from "./pages/ProductDetailsPage";
import SellerStorePage from "./pages/SellerStorePage";

import SavedOutfitsPage from "./pages/SavedOutfitsPage";
import EditSavedOutfitPage from "./pages/EditSavedOutfitPage";

import ShoppingCartPage from "./pages/ShoppingCartPage";
import CheckoutPage from "./pages/CheckoutPage";

import OrderConfirmationPage from "./pages/OrderConfirmationPage";
import OrderHistoryPage from "./pages/OrderHistoryPage";
import OrderDetailsPage from "./pages/OrderDetailsPage";

import AccountManagementPage from "./pages/AccountManagementPage";
import EditAccountPage from "./pages/EditAccountPage";

/* Seller Pages */
import SellerSignupPage from "./pages/Seller/SellerSignupPage";
import SellerDashboardPage from "./pages/Seller/SellerDashboardPage";
import SellerCatalogUploadPage from "./pages/Seller/SellerCatalogUploadPage";
import SellerCsvTemplatePage from "./pages/Seller/SellerCsvTemplatePage";
import SellerProductListingsPage from "./pages/Seller/SellerProductListingsPage";
import SellerItemDetailsPage from "./pages/Seller/SellerItemDetailsPage";
import EditSellerListingPage from "./pages/Seller/EditSellerListingPage";
import SellerValidationReportPage from "./pages/Seller/SellerValidationReportPage";
import SellerStoreProfilePage from "./pages/Seller/SellerStoreProfilePage";

import "./App.css";

/*
 * Scrolls to the top whenever the route changes.
 */
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });
  }, [pathname]);

  return null;
}

/*
 * Used for unfinished pages.
 */
function TemporaryPage({
  title,
  message,
  returnTo = "/",
  returnLabel = "Return to Home",
}) {
  return (
    <main className="temporary-page">
      <div>
        <h1>{title}</h1>

        <p>{message}</p>

        <Link to={returnTo}>
          {returnLabel}
        </Link>
      </div>
    </main>
  );
}

function App() {
  return (
    <>
      <ScrollToTop />

      <Routes>
        {/* ======================================== */}
        {/* LANDING PAGE                             */}
        {/* ======================================== */}

        <Route
          path="/"
          element={<LandingPage />}
        />

        {/* ======================================== */}
        {/* AUTHENTICATION                           */}
        {/* ======================================== */}

        <Route
          path="/login"
          element={<LoginPage />}
        />

        <Route
          path="/signup"
          element={
            <ChooseRegistrationRolePage />
          }
        />

        <Route
          path="/signup/shopper"
          element={<SignupPage />}
        />

        <Route
          path="/seller/signup"
          element={<SellerSignupPage />}
        />

        <Route
          path="/forgot-password"
          element={
            <TemporaryPage
              title="Forgot Password"
              message="Password recovery will be added next."
              returnTo="/login"
              returnLabel="Return to Login"
            />
          }
        />

        {/* ======================================== */}
        {/* GUEST PAGES                              */}
        {/* ======================================== */}

        <Route
          path="/guest"
          element={<GuestLayout />}
        >
          {/* Guest Dashboard */}
          <Route
            index
            element={<GuestPage />}
          />

          {/* Guest Catalog */}
          <Route
            path="catalog"
            element={<CatalogPage isGuest />}
          />

          {/* Guest Product Details */}
          <Route
            path="products/:productId"
            element={
              <ProductDetailsPage isGuest />
            }
          />

          {/* Guest Seller Store */}
          <Route
            path="sellers/:sellerId"
            element={
              <SellerStorePage isGuest />
            }
          />

          <Route
            path="store/:sellerId"
            element={
              <SellerStorePage isGuest />
            }
          />

          {/* Guest Fitting Studio */}
          <Route
            path="fitting-studio"
            element={
              <ChooseAvatarGenderPage
                isGuest
              />
            }
          />

          <Route
            path="fitting-studio/customize"
            element={
              <FittingStudioPage isGuest />
            }
          />

          {/* Guest Avatar Presets */}
          <Route
            path="avatar-presets"
            element={
              <AvatarPresetPage isGuest />
            }
          />
        </Route>

        {/* ======================================== */}
        {/* REGISTERED SHOPPER PAGES                 */}
        {/* ======================================== */}

        <Route
          path="/shopper"
          element={<ShopperLayout />}
        >
          <Route
            index
            element={
              <Navigate
                to="dashboard"
                replace
              />
            }
          />

          {/* Shopper Dashboard */}
          <Route
            path="dashboard"
            element={<ShopperDashboard />}
          />

          {/* Fitting Studio */}
          <Route
            path="fitting-studio"
            element={
              <ChooseAvatarGenderPage />
            }
          />

          <Route
            path="fitting-studio/customize"
            element={
              <FittingStudioPage />
            }
          />

          <Route
            path="fitting-studio/select-items"
            element={
              <CartSelectedItems />
            }
          />

          {/* Avatar Presets */}
          <Route
            path="avatar-presets"
            element={<AvatarPresetPage />}
          />

          <Route
            path="avatar-presets/:presetId/edit"
            element={
              <EditAvatarPresetPage />
            }
          />

          {/* Catalog */}
          <Route
            path="catalog"
            element={<CatalogPage />}
          />

          {/* Product Details */}
          <Route
            path="products/:productId"
            element={
              <ProductDetailsPage />
            }
          />

          {/* Seller Store */}
          <Route
            path="sellers/:sellerId"
            element={<SellerStorePage />}
          />

          <Route
            path="store/:sellerId"
            element={<SellerStorePage />}
          />

          {/* Saved Outfits */}
          <Route
            path="saved-outfits"
            element={
              <SavedOutfitsPage />
            }
          />

          <Route
            path="saved-outfits/:outfitId/edit"
            element={
              <EditSavedOutfitPage />
            }
          />

          {/* Shopping Cart */}
          <Route
            path="cart"
            element={
              <ShoppingCartPage />
            }
          />

          {/* Checkout */}
          <Route
            path="checkout"
            element={<CheckoutPage />}
          />

          {/* Order Confirmation */}
          <Route
            path="order-confirmation"
            element={
              <OrderConfirmationPage />
            }
          />

          {/* Order History */}
          <Route
            path="orders"
            element={
              <OrderHistoryPage />
            }
          />

          {/* Order Details */}
          <Route
            path="orders/:orderId"
            element={
              <OrderDetailsPage />
            }
          />

          {/* Account Management */}
          <Route
            path="account"
            element={
              <AccountManagementPage />
            }
          />

          <Route
            path="account/edit"
            element={<EditAccountPage />}
          />
        </Route>

        {/* ======================================== */}
        {/* SELLER PAGES                             */}
        {/* ======================================== */}

        <Route
          path="/seller"
          element={<SellerLayout />}
        >
          <Route
            index
            element={
              <Navigate
                to="dashboard"
                replace
              />
            }
          />

          {/* Seller Dashboard */}
          <Route
            path="dashboard"
            element={
              <SellerDashboardPage />
            }
          />

          {/* Upload Catalog */}
          <Route
            path="products/upload"
            element={
              <SellerCatalogUploadPage />
            }
          />

          {/* CSV Template */}
          <Route
            path="products/upload/template"
            element={
              <SellerCsvTemplatePage />
            }
          />

          {/* Product Listings */}
          <Route
            path="products"
            element={
              <SellerProductListingsPage />
            }
          />

          {/* Seller Item Details */}
          <Route
            path="products/:productId"
            element={
              <SellerItemDetailsPage />
            }
          />

          {/* Edit Seller Listing */}
          <Route
            path="products/:productId/edit"
            element={
              <EditSellerListingPage />
            }
          />

          {/* Validation Report */}
          <Route
            path="validation-report"
            element={
              <SellerValidationReportPage />
            }
          />

          {/* Seller Store Profile */}
          <Route
            path="account"
            element={
              <SellerStoreProfilePage />
            }
          />
        </Route>

        {/* ======================================== */}
        {/* UNKNOWN URL                              */}
        {/* ======================================== */}

        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />
      </Routes>
    </>
  );
}

export default App;