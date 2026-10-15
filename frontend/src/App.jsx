
import { useEffect } from "react";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

/* LAYOUTS */
import ShopperLayout from "./layouts/ShopperLayout";
import GuestLayout from "./layouts/GuestLayout";
import SellerLayout from "./layouts/SellerLayout";

/* PUBLIC PAGES */
import LandingPage from "./pages/Shared Pages/LandingPage";
import ChooseRegistrationRolePage from "./pages/Shared Pages/ChooseRegistrationRolePage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import SellerSignupPage from "./pages/Seller/SellerSignupPage";
import FemaleAvatarCanvasTest from "./pages/Shopper/FemaleAvatarCanvasTest";

/* GUEST PAGES */
import GuestPage from "./pages/GuestPage";

/* SHARED SHOPPER AND GUEST PAGES */
import ChooseAvatarGenderPage from "./pages/ChooseAvatarGenderPage";
import FittingStudioPage from "./pages/FittingStudioPage";
import AvatarPresetPage from "./pages/AvatarPresetPage";
import CatalogPage from "./pages/CatalogPage";
import ProductDetailsPage from "./pages/ProductDetailsPage";

/* SHOPPER PAGES */
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


/* SELLER PAGES */
import SellerDashboardPage from "./pages/Seller/SellerDashboardPage";
import SellerCatalogUploadPage from "./pages/Seller/SellerCatalogUploadPage";
import SellerProductListingsPage from "./pages/Seller/SellerProductListingsPage";
import SellerItemDetailsPage from "./pages/Seller/SellerItemDetailsPage";
import EditSellerListingPage from "./pages/Seller/EditSellerListingPage";
import SellerValidationReportPage from "./pages/Seller/SellerValidationReportPage";
import SellerStoreProfilePage from "./pages/Seller/SellerStoreProfilePage";

/* NEW SELLER EDIT ACCOUNT PAGE */
import SellerEditAccountPage from "./pages/Seller/SellerEditAccountPage";

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
        <Link to={returnTo}>{returnLabel}</Link>
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
            PUBLIC PAGES
        ===================================== */}

        <Route path="/" element={<LandingPage />} />

        <Route
  path="/avatar-c-test"
  element={<FemaleAvatarCanvasTest />}
/>

        <Route path="/login" element={<LoginPage />} />

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

        {/* =====================================
            GUEST ROUTES
        ===================================== */}

        <Route path="/guest" element={<GuestLayout />}>
          <Route index element={<GuestPage />} />

          <Route
            path="catalog"
            element={<CatalogPage isGuest={true} />}
          />

          <Route
            path="products/:productId"
            element={
              <ProductDetailsPage isGuest={true} />
            }
          />

          <Route
            path="fitting-studio"
            element={
              <ChooseAvatarGenderPage isGuest={true} />
            }
          />

          <Route
            path="fitting-studio/customize"
            element={
              <FittingStudioPage isGuest={true} />
            }
          />

          <Route
            path="avatar-presets"
            element={
              <AvatarPresetPage isGuest={true} />
            }
          />

          <Route
            path="*"
            element={<Navigate to="/guest" replace />}
          />
        </Route>

        {/* =====================================
            REGISTERED SHOPPER ROUTES
        ===================================== */}

        <Route
          path="/shopper"
          element={<ShopperLayout />}
        >
          <Route
            index
            element={<Navigate to="dashboard" replace />}
          />

          {/* DASHBOARD */}
          <Route
            path="dashboard"
            element={<ShopperDashboard />}
          />

          {/* FITTING STUDIO */}
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

          {/* AVATAR PRESETS */}
          <Route
            path="avatar-presets"
            element={<AvatarPresetPage />}
          />

          <Route
            path="avatar-presets/:presetId/edit"
            element={<EditAvatarPresetPage />}
          />

          {/* CATALOG */}
          <Route
            path="catalog"
            element={<CatalogPage />}
          />

          <Route
            path="products/:productId"
            element={<ProductDetailsPage />}
          />

          {/* SELLER STORE */}
          <Route
            path="sellers/:sellerId"
            element={<SellerStorePage />}
          />

          <Route
            path="store/:sellerId"
            element={<SellerStorePage />}
          />

          {/* SAVED OUTFITS */}
          <Route
            path="saved-outfits"
            element={<SavedOutfitsPage />}
          />

          <Route
            path="saved-outfits/:outfitId/edit"
            element={<EditSavedOutfitPage />}
          />

          {/* CART */}
          <Route
            path="cart"
            element={<ShoppingCartPage />}
          />

          {/* CHECKOUT */}
          <Route
            path="checkout"
            element={<CheckoutPage />}
          />

          {/* ORDER CONFIRMATION */}
          <Route
            path="order-confirmation"
            element={<OrderConfirmationPage />}
          />

          {/* ORDER HISTORY */}
          <Route
            path="orders"
            element={<OrderHistoryPage />}
          />

          <Route
            path="orders/:orderId"
            element={<OrderDetailsPage />}
          />

          {/* SHOPPER ACCOUNT MANAGEMENT */}
          <Route
            path="account"
            element={<AccountManagementPage />}
          />

          <Route
            path="account/edit"
            element={<EditAccountPage />}
          />

          {/* UNKNOWN SHOPPER ROUTE */}
          <Route
            path="*"
            element={
              <Navigate to="/shopper/dashboard" replace />
            }
          />
        </Route>

        {/* =====================================
            SELLER ROUTES
        ===================================== */}

        <Route
          path="/seller"
          element={<SellerLayout />}
        >
          <Route
            index
            element={<Navigate to="dashboard" replace />}
          />

          {/* SELLER DASHBOARD */}
          <Route
            path="dashboard"
            element={<SellerDashboardPage />}
          />

          {/* CATALOG UPLOAD */}
          <Route
            path="catalog-upload"
            element={<SellerCatalogUploadPage />}
          />

          <Route
            path="upload-catalog"
            element={
              <Navigate
                to="/seller/catalog-upload"
                replace
              />
            }
          />

          {/* PRODUCT LISTINGS */}
          <Route
            path="listings"
            element={<SellerProductListingsPage />}
          />

          {/* SELLER ITEM DETAILS */}
          <Route
            path="listings/:listingId"
            element={<SellerItemDetailsPage />}
          />

          <Route
            path="items/:itemId"
            element={<SellerItemDetailsPage />}
          />

          <Route
            path="products/:productId"
            element={<SellerItemDetailsPage />}
          />

          {/* EDIT PRODUCT LISTINGS */}
          <Route
            path="listings/:listingId/edit"
            element={<EditSellerListingPage />}
          />

          <Route
            path="items/:itemId/edit"
            element={<EditSellerListingPage />}
          />

          <Route
            path="products/:productId/edit"
            element={<EditSellerListingPage />}
          />

          {/* SELLER VALIDATION REPORT */}
          <Route
            path="report"
            element={<SellerValidationReportPage />}
          />

          <Route
            path="validation"
            element={
              <Navigate to="/seller/report" replace />
            }
          />

          {/* SELLER STORE PROFILE */}
          <Route
            path="store-profile"
            element={<SellerStoreProfilePage />}
          />

          {/* OLD STORE PROFILE URL */}
          <Route
            path="profile"
            element={
              <Navigate
                to="/seller/store-profile"
                replace
              />
            }
          />

          {/* =====================================
              NEW: SELLER EDIT ACCOUNT ROUTE

              /seller/account/edit#profile
              /seller/account/edit#password
          ===================================== */}

          <Route
            path="account/edit"
            element={<SellerEditAccountPage />}
          />

          {/* UNKNOWN SELLER ROUTE */}
          <Route
            path="*"
            element={
              <Navigate to="/seller/dashboard" replace />
            }
          />
        </Route>

        {/* =====================================
            UNKNOWN WEBSITE ROUTES
        ===================================== */}

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Routes>
    </>
  );
}

export default App;
