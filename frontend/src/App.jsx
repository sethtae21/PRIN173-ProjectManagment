
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

/* Public pages */
import LandingPage from "./pages/Shared Pages/LandingPage";
import ChooseRegistrationRolePage from "./pages/Shared Pages/ChooseRegistrationRolePage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import SellerSignupPage from "./pages/Seller/SellerSignupPage";

/* Guest pages */
import GuestPage from "./pages/GuestPage";

/* Shared shopper and guest pages */
import ChooseAvatarGenderPage from "./pages/ChooseAvatarGenderPage";
import FittingStudioPage from "./pages/FittingStudioPage";
import AvatarPresetPage from "./pages/AvatarPresetPage";
import CatalogPage from "./pages/CatalogPage";
import ProductDetailsPage from "./pages/ProductDetailsPage";

/* Shopper pages */
import ShopperDashboard from "./pages/ShopperDashboard";
import CartSelectedItems from "./pages/CartSelectedItems";
import EditAvatarPresetPage from "./pages/EditAvatarPresetPage";
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
import SellerDashboardPage from "./pages/Seller/SellerDashboardPage";
import SellerCatalogUploadPage from "./pages/Seller/SellerCatalogUploadPage";
import SellerProductListingsPage from "./pages/Seller/SellerProductListingsPage";
import SellerItemDetailsPage from "./pages/Seller/SellerItemDetailsPage";
import EditSellerListingPage from "./pages/Seller/EditSellerListingPage";
import SellerValidationReportPage from "./pages/Seller/SellerValidationReportPage";
import SellerStoreProfilePage from "./pages/Seller/SellerStoreProfilePage";

import "./App.css";

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
        {/* ===================================== */}
        {/* PUBLIC PAGES                          */}
        {/* ===================================== */}

        <Route
          path="/"
          element={<LandingPage />}
        />

        <Route
          path="/login"
          element={<LoginPage />}
        />

        <Route
          path="/signup"
          element={<ChooseRegistrationRolePage />}
        />

        <Route
          path="/signup/shopper"
          element={<SignupPage />}
        />

        <Route
          path="/signup/seller"
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

        {/* ===================================== */}
        {/* GUEST PAGES                           */}
        {/* ===================================== */}

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
            element={
              <CatalogPage isGuest={true} />
            }
          />

          {/* Guest Product Details */}
          <Route
            path="products/:productId"
            element={
              <ProductDetailsPage
                isGuest={true}
              />
            }
          />

          <Route
            path="fitting-studio"
            element={
              <ChooseAvatarGenderPage
                isGuest={true}
              />
            }
          />

          <Route
            path="fitting-studio/customize"
            element={
              <FittingStudioPage
                isGuest={true}
              />
            }
          />

          <Route
            path="avatar-presets"
            element={
              <AvatarPresetPage
                isGuest={true}
              />
            }
          />

          <Route
            path="*"
            element={
              <Navigate
                to="/guest"
                replace
              />
            }
          />
        </Route>

        {/* ===================================== */}
        {/* REGISTERED SHOPPER PAGES              */}
        {/* ===================================== */}

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
            element={
              <ChooseAvatarGenderPage />
            }
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
            element={
              <EditAvatarPresetPage />
            }
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
            element={<SavedOutfitsPage />}
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
            element={
              <OrderConfirmationPage />
            }
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

          <Route
            path="*"
            element={
              <Navigate
                to="/shopper/dashboard"
                replace
              />
            }
          />
        </Route>

        {/* ===================================== */}
        {/* SELLER PAGES                          */}
        {/* ===================================== */}

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
            element={<SellerDashboardPage />}
          />

          {/* Catalog Upload */}
          <Route
            path="catalog-upload"
            element={
              <SellerCatalogUploadPage />
            }
          />

          {/* Alias for an older upload path */}
          <Route
            path="upload-catalog"
            element={
              <Navigate
                to="/seller/catalog-upload"
                replace
              />
            }
          />

          {/* Product Listings */}
          <Route
            path="listings"
            element={
              <SellerProductListingsPage />
            }
          />

          {/* Seller Item Details */}
          <Route
            path="listings/:listingId"
            element={
              <SellerItemDetailsPage />
            }
          />

          <Route
            path="items/:itemId"
            element={
              <SellerItemDetailsPage />
            }
          />

          <Route
            path="products/:productId"
            element={
              <SellerItemDetailsPage />
            }
          />

          {/* Edit Seller Listing */}
          <Route
            path="listings/:listingId/edit"
            element={
              <EditSellerListingPage />
            }
          />

          <Route
            path="items/:itemId/edit"
            element={
              <EditSellerListingPage />
            }
          />

          <Route
            path="products/:productId/edit"
            element={
              <EditSellerListingPage />
            }
          />

          {/* Seller Report */}
          <Route
            path="report"
            element={
              <SellerValidationReportPage />
            }
          />

          {/* Compatibility with old Validation URL */}
          <Route
            path="validation"
            element={
              <Navigate
                to="/seller/report"
                replace
              />
            }
          />

          {/* Seller Store Profile */}
          <Route
            path="store-profile"
            element={
              <SellerStoreProfilePage />
            }
          />

          <Route
            path="profile"
            element={
              <Navigate
                to="/seller/store-profile"
                replace
              />
            }
          />

          <Route
            path="*"
            element={
              <Navigate
                to="/seller/dashboard"
                replace
              />
            }
          />
        </Route>

        {/* ===================================== */}
        {/* UNKNOWN URL                           */}
        {/* ===================================== */}

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
