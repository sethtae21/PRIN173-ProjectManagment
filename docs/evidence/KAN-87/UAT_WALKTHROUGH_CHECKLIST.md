# FitFusion AI — User Acceptance Testing (UAT) Walkthrough Checklist

**Document Version:** 1.0  
**Project:** FitFusion AI MVP  
**Scope Baseline Reference:** Acceptance Criteria 6, 9, 10, 11; SRS §4.4, FR-7.5; WBS 1.4.3  
**Target Roles:** Guest, Registered Shopper, Seller  

---

## 1. Environment & Setup Checklist

- [ ] Local staging server running at `http://127.0.0.1:8000` (Django) and `http://localhost:5173` / `https://localhost:8443` (Vite)
- [ ] MongoDB Atlas M0 cluster connected with green health check (`/health/`)
- [ ] Sample catalog seeded with approved items
- [ ] Test accounts prepared (Shopper, Seller)
- [ ] Blank participant response forms & survey links ready

---

## 2. Role Walkthroughs

### 2.1 Guest Role Walkthrough (Timed — Acceptance Criterion 6)
*Target: ≤ 2 minutes, 0 photo uploads, 0 registration wall.*

| Step | Action | Expected Outcome | Pass/Fail | Notes / Time |
|------|--------|------------------|-----------|--------------|
| G-01 | Navigate to Landing Page | Clean homepage loads with "Continue as Guest" CTA | [ ] | |
| G-02 | Click "Continue as Guest" | Guest session initialized; ephemerality notice shown | [ ] | |
| G-03 | Open Avatar Creator | Sliders and selectors responsive; 0 photo upload required | [ ] | |
| G-04 | Adjust Height/Proportions | Avatar canvas deforms deterministically in < 1s | [ ] | |
| G-05 | Equip Clothing Item | Garment overlays registered to avatar correctly | [ ] | |
| G-06 | Toggle Front/Rear View | View flips instantly without page reload | [ ] | |
| G-07 | Click Rating Control | Sign-up / Login modal prompts guest to register | [ ] | |
| G-08 | Close Tab & Reopen | Ephemeral guest data discarded; clean state | [ ] | |

**Guest Try-On Duration:** _______ seconds (Pass if ≤ 120s)  
**Photo Uploads Required:** [ ] None (Pass) / [ ] Yes (Fail)  

---

### 2.2 Registered Shopper Walkthrough
*Target: Full lifecycle: Account -> Avatar -> Try-On -> Recommendations -> Cart -> Checkout -> Order History.*

| Step | Action | Expected Outcome | Pass/Fail | Notes |
|------|--------|------------------|-----------|-------|
| U-01 | Register Account | Enforces password policy (8+ chars, upper, lower, digit, special) | [ ] | |
| U-02 | Log In | JWT issued, shopper redirected to catalog / fitting studio | [ ] | |
| U-03 | Save Avatar Preset | Custom avatar configuration saved and listed under My Presets | [ ] | |
| U-04 | Load / Edit Preset | Preset reloads across sessions; edits persist | [ ] | |
| U-05 | Virtual Try-On Canvas | Equip top, bottom, outerwear; Dress replaces Top+Bottom | [ ] | |
| U-06 | Save Outfit | Outfit saved with custom name; accessible in Saved Outfits | [ ] | |
| U-07 | View Recommendations | Ranked items displayed with match reasons and rule scores | [ ] | |
| U-08 | Submit Star Rating | 1–5 star rating submitted and persisted for recommendation | [ ] | |
| U-09 | Add Item to Cart | Item added to persistent cart; badge updates | [ ] | |
| U-10 | Mock Checkout | Mock payment gateway approves; order created with snapshot | [ ] | |
| U-11 | Order History | Order listed with date, store name, items, and status | [ ] | |

---

### 2.3 Seller Role Walkthrough
*Target: Catalog publishing & validation pipeline.*

| Step | Action | Expected Outcome | Pass/Fail | Notes |
|------|--------|------------------|-----------|-------|
| S-01 | Log in as Seller | Seller Dashboard loaded with metrics and listings | [ ] | |
| S-02 | Download Template Package | ZIP containing CSV template & 2-view instruction sheet downloaded | [ ] | |
| S-03 | Upload CSV + Images | Drop zones accept CSV and Front/Rear PNGs | [ ] | |
| S-04 | Background Removal | Automated rembg removes background if needed | [ ] | |
| S-05 | Validation Report | Report displays status: Published vs. Rejected with reasons | [ ] | |
| S-06 | Manage Listings | Seller can edit price/metadata or delete item | [ ] | |
| S-07 | Store Page Verification | Public store page displays seller's active items | [ ] | |

---

## 3. Post-Session Survey Instrument (Criteria 9–11)

### Survey Questions (Likert 1–5 Stars)
1. **Fit/Style Confidence (Criterion 9):**  
   *"How confident are you that the visualized garments match your desired fit and style?"*  
   - Threshold: ≥ 80% rating 4 or 5 stars.
2. **Recommendation Approval (Criterion 10):**  
   *"Did the rule-based recommendations provide relevant, well-coordinated outfit suggestions?"*  
   - Threshold: ≥ 80% rating 4 or 5 stars.
3. **Purchase Decision Confidence & Return-Intent (Criterion 11):**  
   *"Did the virtual try-on and recommendations increase your confidence to purchase and lower return intent?"*  
   - Threshold: ≥ 80% rating 4 or 5 stars.

---

## 4. Sign-Off & Verification

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Participant / Evaluator | ____________________ | ____________________ | ________ |
| QA Lead | Carlos Jefferson S. Yap | ____________________ | ________ |
| Project Manager | Seth Martin Duclayan | ____________________ | ________ |
