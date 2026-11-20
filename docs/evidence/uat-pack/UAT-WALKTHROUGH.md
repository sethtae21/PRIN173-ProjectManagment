# UAT Walkthrough Pack — UAT-01 … UAT-07

**Project:** FitFusion AI — Virtual Try-On & Outfit Simulation System
**Plan reference:** Software Testing & QA Plan v1.0 (2026-10-23), §5 (UAT Standard)
**Jira:** KAN-87 (UAT), KAN-88 (walkthroughs), KAN-89 (in-app rating/prompt logs and KPI logging)
**Evidence date:** 2026-11-20 (UTC)

> **Execution model (plan §1.2 and §5.2):** Semester 1 UAT is executed by the
> development team as functional error-checking; the panel observes and signs
> off at the defense. No participant names, signatures, times, ratings or
> survey responses are recorded in this pack. Statistical approval / confidence
> / return-intent KPIs for Criteria 9–11 are **post-deployment** measurements
> per plan §1.2/§5.2 and are not claimed here.

---

## UAT-01 — First-time Guest try-on ≤ 2 minutes

**User story / requirement:** As a first-time Guest, I want to complete one try-on within 2 minutes without training (FR-1.8, §4.4; Criterion 6 / OBJ-02).

**Steps**
1. Start at the landing page with no account and a clean Guest session.
2. Continue as Guest; create an avatar (gender, height/Body Build, skin tone, undertone, proportions).
3. Equip a Top; toggle Front/Rear.
4. Observer records elapsed time from landing to equipped item and checks that no photo upload or registration prompt blocks the flow.

**Business expectation:** Session completes in ≤ 2:00 with zero photo uploads, no registration gate, and no Guest write to persistent storage.

**Linked functional evidence:** MOM-04 (`../method-of-measurement/MOM-04/measurement.json`, 2.40 s, zero uploads); MOM SUMMARY §1/§4 (Criterion 6 PASS).

**Execution note:** Executed by dev team; panel observes at defense. Timing reproduced live at the defense using the staged build.

**Sign-off:** Panel observer: ____________________  Date: __________

---

## UAT-02 — Fit-accuracy comparison and rating control

**User story / requirement:** As a Registered User, I want confidence that the fit visualization suits me (Criterion 9 / OBJ-01).

**Steps**
1. Physically try the sampled catalog garment.
2. Compare real drape, coverage and colour against the Front/Rear avatar overlay.
3. Complete mock checkout, then submit a 1–5 star Fit-Accuracy Rating.
4. Log any deviation with item ID, view and avatar parameters; confirm Guest rating click is blocked with a sign-up prompt and no Guest DB write.

**Business expectation:** Rating and prompt controls function per FR-7.5; Guest ephemerality preserved; "approval" = 4–5 stars only (1–3 never count) recorded for the post-deployment KPI. Physical fit-accuracy comparison log is a panel-observation artifact; no aggregate approval % is claimed in Semester 1.

**Linked functional evidence:** EC-006 (`../ecommerce-tests/EC-006/`), MOM-08 (`../method-of-measurement/MOM-08/`); MOM SUMMARY §3/§4 (Criterion 9: functional PASS, KPI deferred).

**Execution note:** Executed by dev team; panel observes at defense.

**Sign-off:** Panel observer: ____________________  Date: __________

---

## UAT-03 — Recommendation match reasons and rating control

**User story / requirement:** As a shopper, I want style recommendations I can trust (Criterion 10 / OBJ-05).

**Steps**
1. Open the Recommendation Panel with a configured avatar.
2. Review the four-rule score breakdown and match reasons on ranked items.
3. As Registered User, give a 4-star recommendation rating; confirm persistence after reload.
4. As Guest, click a rating control; confirm sign-up/login pop-up and no rating written or cached.

**Business expectation:** Match reasons visible and logically sound (FR-7.3/7.4); rating control functions per FR-7.5; approval aggregates are directional only until deployment.

**Linked functional evidence:** REC-002, REC-004, REC-005 (`../rec-tests/`); MOM SUMMARY §3/§4 (Criterion 10: functional PASS, KPI deferred).

**Execution note:** Executed by dev team; panel observes at defense.

**Sign-off:** Panel observer: ____________________  Date: __________

---

## UAT-04 — Purchase-decision confidence prompts

**User story / requirement:** As a shopper, I want confidence in my purchase decision (Criterion 11 / OBJ-06).

**Steps**
1. Complete the mock checkout for a selected item.
2. Verify the optional pre/post confidence and stated return-intent prompts capture responses in-app (pre-purchase, on-avatar only).
3. Confirm no post-delivery or physical-fit data is collected.

**Business expectation:** Checkout completes (Criterion 8); prompts store pre/post values in-app; KPI statistics for confidence/return intent are deferred to post-deployment.

**Linked functional evidence:** EC-006, EC-007 (`../ecommerce-tests/`), MOM-08 (`../method-of-measurement/MOM-08/`); MOM SUMMARY §3/§4 (Criterion 11: functional PASS, KPI deferred).

**Execution note:** Executed by dev team; panel observes at defense.

**Sign-off:** Panel observer: ____________________  Date: __________

---

## UAT-05 — Seller CSV upload without assistance

**User story / requirement:** As a Seller, I want to upload my catalog using the template and instruction sheet without help (FR-4.1–4.8; Criterion 5 / OBJ-09).

**Steps**
1. Download the template and instruction sheet.
2. Upload 10 items with Front/Rear images, unassisted.
3. Read the validation report; note any rejection reasons.

**Business expectation:** ≥ 80% of items publish without manual correction and report reasons are understood.

**Linked functional evidence:** SEL-014 (pipeline timing), SEL-015 (acceptance rate) (`../seller-tests/`), MOM-06/MOM-07 (`../method-of-measurement/`); MOM SUMMARY §1/§4 (Criteria 4–5 PASS).

**Execution note:** Executed by dev team; panel observes at defense.

**Sign-off:** Panel observer: ____________________  Date: __________

---

## UAT-06 — End-to-end mock purchase

**User story / requirement:** As a Registered User, I want to complete a mock purchase end-to-end (FR-6.1–6.9; Criterion 8 / OBJ-07).

**Steps**
1. Build a cart with two active items and update a quantity.
2. Check out through the mock payment gateway (approve and decline paths).
3. Verify the order-history entry and that the cart is cleared on approval.

**Business expectation:** ≥ 70% of created carts complete the simulated checkout; the Semester 1 pack evidences functional completion only — the population ratio requires deployed UAT sessions.

**Linked functional evidence:** EC-006 (`../ecommerce-tests/EC-006/`), MOM-08 (`../method-of-measurement/MOM-08/`); MOM SUMMARY §1/§4 (Criterion 8: functional PASS; population KPI deferred).

**Execution note:** Executed by dev team; panel observes at defense.

**Sign-off:** Panel observer: ____________________  Date: __________

---

## UAT-07 — Security and privacy walkthrough

**User story / requirement:** As a user, I want my data protected (FR-1.4–1.9; Criterion 7 / OBJ-04).

**Steps**
1. Walk through password policy enforcement and login/JWT behaviour.
2. Verify Guest ephemerality (no persistent Guest writes).
3. Request account deletion; confirm stage 1 deactivation blocks login immediately.
4. Trigger/observe stage 2 cold archival; verify active collections are clear of PII and archived records are pseudonymized under restricted access.

**Business expectation:** Checklist 100% pass; two-stage deletion deactivates immediately and archives under restricted access with direct identifiers pseudonymized (FR-1.4), with no active access remaining.

**Linked functional evidence:** AM-010 … AM-015 (`../account-tests/`), MOM-05 (`../method-of-measurement/MOM-05/`); MOM SUMMARY §1/§4 (Criterion 7 PASS).

**Execution note:** Executed by dev team; panel observes at defense.

**Sign-off:** Panel observer: ____________________  Date: __________

---

## Deferred KPIs (do not sign as attained in Semester 1)

| Criterion | Functional evidence | Statistical KPI | Disposition |
|---|---|---|---|
| 9 — Fit/style confidence | REC-006, EC-006, MOM-02 | ≥ 80% approval (4–5 stars) from deployed users | Post-deployment per plan §1.2/§5.2 |
| 10 — Recommendation approval | REC-002/004/005 | ≥ 80% approval (4–5 stars) from deployed users | Post-deployment per plan §1.2/§5.2 |
| 11 — Purchase-decision confidence | MOM-08, EC-006/015 | Confidence / return-intent KPI | Post-deployment per plan §1.2/§5.2 |

No panel participant data, signature, rating or session count has been fabricated in this pack.
