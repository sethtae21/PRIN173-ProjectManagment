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

/* Shared and authentication pages */
import LandingPage from "./pages/Shared Pages/LandingPage";
import ChooseRegistrationRolePage from "./pages/Shared Pages/ChooseRegistrationRolePage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import GuestPage from "./pages/GuestPage";

/* Shopper pages */
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

/* Seller pages */
import SellerSignupPage from "./pages/Seller/SellerSignupPage";
import SellerDashboardPage from "./pages/Seller/SellerDashboardPage";
import SellerCatalogUploadPage from "./pages/Seller/SellerCatalogUploadPage";
import SellerProductListingsPage from "./pages/Seller/SellerProductListingsPage";
import SellerItemDetailsPage from "./pages/Seller/SellerItemDetailsPage";
import EditSellerListingPage from "./pages/Seller/EditSellerListingPage";
import SellerValidationReportPage from "./pages/Seller/SellerValidationReportPage";
import SellerStoreProfilePage from "./pages/Seller/SellerStoreProfilePage";

import "./App.css";

/* Scroll to the top whenever the URL changes */
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

/* Temporary page for features that are not finished yet */
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
        {/* =====================================
            LANDING PAGE
        ====================================== */}

        <Route
          path="/"
          element={<LandingPage />}
        />

        {/* =====================================
            AUTHENTICATION AND REGISTRATION
        ====================================== */}

        <Route
          path="/login"
          element={<LoginPage />}
        />

        {/* Choose between Shopper and Seller */}
        <Route
          path="/signup"
          element={<ChooseRegistrationRolePage />}
        />

        <Route
          path="/register"
          element={<ChooseRegistrationRolePage />}
        />

        {/* Shopper registration */}
        <Route
          path="/signup/shopper"
          element={<SignupPage />}
        />

        <Route
          path="/shopper/signup"
          element={<SignupPage />}
        />

        {/* Seller registration */}
        <Route
          path="/signup/seller"
          element={<SellerSignupPage />}
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

        {/* =====================================
            GUEST PAGES
        ====================================== */}

        <Route
          path="/guest"
          element={<GuestLayout />}
        >
          <Route
            index
            element={<GuestPage />}
          />

          <Route
            path="catalog"
            element={<CatalogPage isGuest />}
          />

          <Route
            path="products/:productId"
            element={<ProductDetailsPage isGuest />}
          />

          <Route
            path="sellers/:sellerId"
            element={<SellerStorePage isGuest />}
          />

          <Route
            path="store/:sellerId"
            element={<SellerStorePage isGuest />}
          />

          <Route
            path="fitting-studio"
            element={<ChooseAvatarGenderPage isGuest />}
          />

          <Route
            path="fitting-studio/customize"
            element={<FittingStudioPage isGuest />}
          />

          <Route
            path="avatar-presets"
            element={<AvatarPresetPage isGuest />}
          />
        </Route>

        {/* =====================================
            REGISTERED SHOPPER PAGES
        ====================================== */}

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

          {/* Dashboard */}
          <Route
            path="dashboard"
            element={<ShopperDashboard />}
          />

          {/* Fitting Studio */}
          <Route
            path="fitting-studio"
            element={<ChooseAvatarGenderPage />}
          />

          <Route
            path="fitting-studio/customize"
            element={<FittingStudioPage />}
          />

          <Route
            path="fitting-studio/select-items"
            element={<CartSelectedItems />}
          />

          {/* Avatar Presets */}
          <Route
            path="avatar-presets"
            element={<AvatarPresetPage />}
          />

          <Route
            path="avatar-presets/:presetId/edit"
            element={<EditAvatarPresetPage />}
          />

          {/* Catalog */}
          <Route
            path="catalog"
            element={<CatalogPage />}
          />

          <Route
            path="products/:productId"
            element={<ProductDetailsPage />}
          />

          {/* Seller Store viewed by shoppers */}
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
            element={<SavedOutfitsPage />}
          />

          <Route
            path="saved-outfits/:outfitId/edit"
            element={<EditSavedOutfitPage />}
          />

          {/* Shopping Cart */}
          <Route
            path="cart"
            element={<ShoppingCartPage />}
          />

          {/* Checkout */}
          <Route
            path="checkout"
            element={<CheckoutPage />}
          />

          {/* Order Confirmation */}
          <Route
            path="order-confirmation"
            element={<OrderConfirmationPage />}
          />

          {/* Order History */}
          <Route
            path="orders"
            element={<OrderHistoryPage />}
          />

          <Route
            path="orders/:orderId"
            element={<OrderDetailsPage />}
          />

          {/* Account */}
          <Route
            path="account"
            element={<AccountManagementPage />}
          />

          <Route
            path="account/edit"
            element={<EditAccountPage />}
          />
        </Route>

        {/* =====================================
            SELLER PAGES
        ====================================== */}

        <Route
          path="/seller"
          element={<SellerLayout />}
        >
          {/* Opening /seller redirects to dashboard */}
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
            element={<SellerDashboardPage />}
          />

          {/* Upload Catalog */}
          <Route
            path="upload-catalog"
            element={<SellerCatalogUploadPage />}
          />

          {/* Alternative upload URL */}
          <Route
            path="catalog-upload"
            element={<SellerCatalogUploadPage />}
          />

          {/* Product Listings */}
          <Route
            path="listings"
            element={<SellerProductListingsPage />}
          />

          {/* Seller Item Details */}
          <Route
            path="listings/:productId"
            element={<SellerItemDetailsPage />}
          />

          {/* Alternative product details URL */}
          <Route
            path="products/:productId"
            element={<SellerItemDetailsPage />}
          />

          {/* Edit or re-upload listing */}
          <Route
            path="listings/:productId/edit"
            element={<EditSellerListingPage />}
          />

          <Route
            path="products/:productId/edit"
            element={<EditSellerListingPage />}
          />

          {/* Validation Report */}
          <Route
            path="validation"
            element={<SellerValidationReportPage />}
          />

          <Route
            path="validation-report"
            element={<SellerValidationReportPage />}
          />

          {/* Seller Store Profile */}
          <Route
            path="store-profile"
            element={<SellerStoreProfilePage />}
          />
        </Route>

        {/* =====================================
            UNKNOWN URL
        ====================================== */}

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