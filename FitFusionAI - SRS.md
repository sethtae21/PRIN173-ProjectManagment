# **Software Requirements Specification (SRS)**

**Product Name:** FitFusion AI – Virtual Try-On & Outfit Simulation System  
 **Author(s):** Duclayan, Seth Martin D.; Lacia, Kahlil Alfonso A.; Tamo, Karol Dein A.; Yap, Carlos Jefferson S.  
 **Date:** 2026-09-21 | Version: 1.1

## **1\. Introduction**

### **1.1 Purpose**

This SRS defines the functional and non-functional requirements of the FitFusion AI Semester 1 Minimum Viable Product (MVP). Its intended audience includes the project manager, the academic panelists, the backend developers, the frontend developers, the QA/testers, and the end users of the system. It serves as the single source of truth for what the system shall and shall not do, eliminating ambiguity between the development team and the academic panel throughout the build and defense phases.

### **1.2 Scope**

FitFusion AI is a standalone virtual try-on and outfit simulation application with a mock e-commerce flow that allows users to visualize clothing on customized body avatars (male and female), receive personalized styling recommendations powered by a deterministic rule-based expert system, and complete a simulated purchase workflow through a standalone mock payment gateway. The catalog is managed by Sellers through a CSV-upload-based Catalog Admin Dashboard, where Sellers upload clothing items with three-view photographs (Front, Side, Rear) and associated metadata.

The business problem addressed by the MVP is pre-purchase uncertainty — shoppers cannot judge how a garment will look on their body type, skin tone, and personal style before purchase (Charter P1, P3), and retailers bear returns, complaints, and lost sales from uncertain purchases (Charter P4). The MVP addresses this by (a) multi-angle visualization of catalog garments on a personalized avatar and (b) explainable, rule-based style/color recommendations (Heuristic Expert System), thereby improving purchase-decision confidence and reducing return-intent. The MVP does not perform garment-fit prediction: it does not predict size or guarantee physical fit, because physical fit can only be confirmed by wearing the garment; the system reduces uncertainty and return-intent rather than predicting fit (the post-purchase fitting cost of Charter P1 is addressed indirectly via reduced return-intent, Charter OBJ-06).

**Out of Scope:** Real payment processing and merchant fulfillment; user-uploaded photos or clothing images; garment-fit prediction, size prediction, or fit guarantees; custom-trained machine learning, deep-learning, or generative-AI models and any black-box AI component (off-the-shelf image-processing utilities like Pillow and rembg are permitted as fixed preprocessing components for background removal and validation only; the in-scope recommendation component is a deterministic rule-based expert system, i.e., symbolic/heuristic AI, not ML); fully 3D rotatable avatars and WebGL rendering; multi-seller marketplace model; external API integrations with third-party fashion sites; body tracking or fabric simulation; and External cloud hosting (the application runs on the local staging host; only MongoDB Atlas remains cloud-hosted) — all excluded to keep the MVP deliverable within a single semester while preserving the option to extend in future phases.

### 

### 

### **1.3 Definitions, Acronyms, and Abbreviations**

| Term / Acronym | Definition |
| ----- | ----- |
| SRS | Software Requirements Specification |
| API | Application Programming Interface |
| RBAC | Role-Based Access Control |
| CRUD | Create, Read, Update, Delete – the four basic operations for data management |
| MVP | Minimum Viable Product – the deliverable version using 2D avatars, mock e-commerce, and a rule-based recommender |
| Virtual Try-On | The digital simulation of wearing clothing items on a body avatar, allowing users to visualize outfits before purchase without physically trying them on |
| CSV | Comma-Separated Values – the file format used by Sellers to upload catalog items in bulk |
| Expert System | A deterministic, rule-based approach (symbolic / heuristic AI) that encodes human fashion knowledge (color theory, style rules) into explicit rules and weighted tag scoring. It contains no machine-learning, deep-learning, or generative-AI models. In this document, the terms 'rule-based expert system', 'deterministic recommender', and 'heuristic expert system' refer to this same in-scope component |
| Fit visualization vs. fit prediction | Fit visualization \= showing how a catalog garment looks on a personalized avatar (in-scope). Fit prediction \= claiming a size or physical-fit outcome (out of scope). The MVP provides fit visualization only. |
| Symbolic / Heuristic AI | The branch of AI that uses explicit, human-readable rules and knowledge tables instead of trained statistical models; deterministic and fully auditable; the approach used by the in-scope recommendation engine. |
| Content-Based Filtering | A recommendation method that matches item metadata (tags) against the user's own profile |
| Guest Mode | Session-only access where visualization features are available but no persistent data (including cart or orders) is saved |
| PNG | Portable Network Graphics – image format with transparency, used for clothing overlays and avatar layers |
| JSON | JavaScript Object Notation – data format exchanged between frontend and backend |
| WCAG | Web Content Accessibility Guidelines |
| RPO / RTO | Recovery Point Objective / Recovery Time Objective – data-loss and downtime targets |
| Atlas | MongoDB Atlas – the cloud-hosted database service used by the system |
| rembg | An off-the-shelf Python library used to automatically remove image backgrounds and generate transparent PNGs without requiring custom-trained models. |

### **1.4 References**

* **Figma Wireframes:** [https://www.figma.com/design/Xf2GQEuKbp8JRts4rCkRrX/FitFusion-Wireframe?node-id=0-1\&t=nQa7sxoFwsRrDaT8-1](https://www.figma.com/design/Xf2GQEuKbp8JRts4rCkRrX/FitFusion-Wireframe?node-id=0-1&t=nQa7sxoFwsRrDaT8-1)  
*  FitFusion AI Entity-Relationship Diagram (ERD) — project GitHub repository: github.com/sethtae21/PRIN173-ProjectManagment (/docs).  
* IEEE Std 830-1998, *IEEE Recommended Practice for Software Requirements Specifications*.  
* ISO/IEC/IEEE 29148:2018, Systems and software engineering — Life cycle processes — Requirements engineering.  
* MongoDB Atlas Documentation (https://www.mongodb.com/docs/atlas).  
* Django Documentation (https://docs.djangoproject.com) and React Documentation (https://react.dev).

## **2\. Overall Description**

### **2.1 Product Perspective**

FitFusion AI is a standalone web application composed of three connected parts: a React frontend (avatar canvas, catalog browser, cart/checkout UI, Seller Dashboard), a Python/Django backend (business logic, recommendation rules, CSV validation, e-commerce logic, role management), and a MongoDB Atlas cloud database (catalog, metadata, avatar presets, user accounts, orders). The application is deployed on the local staging host (dedicated local staging server) for Semester 1 evaluation; only the database remains cloud-hosted (Charter §6.1.8). The system provides a complete virtual try-on experience with a standalone mock payment gateway that simulates the full checkout workflow without processing real money, serving as a foundation that can later be replaced with a real payment provider. The standalone architecture was chosen to eliminate external dependencies that could introduce integration risk, vendor lock-in, or approval delays during the semester timeline.

* React Frontend (Avatar Canvas, Catalog Browser, Cart/Checkout UI, Recommendation Panel, Seller Dashboard) ↔ Django Backend (JSON over HTTP/HTTPS)  
* Django Backend ↔ MongoDB Atlas (Catalog, Presets, Accounts, Orders, Seller Uploads)

### **2.2 User Classes and Characteristics**

* **Registered User:** Creates avatar presets (male or female), visualizes outfits, browses the catalog, receives rule-based recommendations, uses the shopping cart, completes mock checkout, and has progress persisted across sessions.  
* **Guest User:** Can use visualization features identical to a registered user — including avatar creation, virtual try-on, catalog browsing, and recommendations — but shall not have access to the shopping cart or checkout features and must register an account to place orders. All Guest progress and data are temporary and are permanently discarded once the browser tab or session is closed, a design choice that eliminates the need for anonymous data cleanup and keeps the database clean.  
* **Seller:** A user role with access to the Catalog Admin Dashboard, identified by their designated Store Name. The Seller uploads catalog items via CSV, manages their own listings, and receives validation reports for rejected uploads.

### **2.3 Operating Environment**

* **Deployment / Server Side:** The MVP application runs on the team's local staging host (dedicated local staging server) — minimum 4 GB RAM, x86\_64 — serving the Django backend, React build, image validation pipeline, and the MongoDB Atlas connection; only MongoDB Atlas remains cloud-hosted (Charter §6.1.8, §6.1.10). The 4 GB floor reflects the combined memory footprint of Django, the Pillow (PIL) and rembg image processing pipelines, and the MongoDB driver under normal MVP load.  
* **End User Side:** Any device capable of running a modern browser; no special GPU required, since the 2D overlay canvas is rendered via standard HTML/CSS/Canvas APIs.  
* **Software:** Python 3.13+ with Django 6.x backend; Node.js 20+ with React \+ Vite frontend; MongoDB Atlas cloud database; end users on modern Chrome, Edge, Firefox, or Safari browsers.

### 

### 

### **2.4 Design and Implementation Constraints**

* **Standalone system:** FitFusion AI operates as a standalone web application with no external service dependencies beyond the cloud database, eliminating vendor lock-in and third-party approval delays during the semester.  
* **Seller-managed catalog:** The catalog is maintained exclusively by Sellers through CSV upload via the Catalog Admin Dashboard, centralizing content ownership with the Seller and removing the need for a separate platform-admin role.  
* **Mock payment in MVP:** The MVP shall implement a standalone mock payment gateway that simulates checkout without real money or real transactions, avoiding the regulatory, financial, and security risks associated with real payment integration.  
* **Semester timeline:** The MVP must be demonstrable within this Semester; advanced features are excluded to prevent scope creep and ensure a fully functional, testable system by the defense date.  
* **Avatar-only visualization:** No user photo upload, body tracking, pose detection, or AI image generation is included, keeping the MVP deterministic and avoiding the privacy and compute costs associated with processing user photos.  
* **AI positioning:** The MVP contains no custom-trained machine-learning, deep-learning, or generative-AI models and no black-box AI component for recommendation, fit prediction, user profiling, or decision-making. The recommendation component is a deterministic, rule-based Heuristic Expert System (symbolic/heuristic AI) that encodes color theory and style rules into explicit rules and weighted tag scoring, so every recommendation is fully auditable and explainable to users and the panel. Off-the-shelf image utilities (rembg for background removal, Pillow for validation) are permitted as fixed preprocessing/image-processing components; they are not used for recommendation ranking, fit prediction, user profiling, or decision-making. Terminology alignment: when the team states "AI is not part of the MVP", it refers to ML/black-box AI; the deterministic Heuristic Expert System is an in-scope, non-ML component (Charter §4.1, §4.2, §6.1.11).  
* **No 3D in any scope:** Fully 3D rotatable avatars, dynamic cloth physics, and WebGL rendering are out of scope; the system uses photo-based 2D visualization only, since 3D rendering demands GPU resources and specialized asset pipelines that exceed a single-semester undergraduate build.  
* **Body-data limitation:** Height, weight, and body proportion inputs are used solely for avatar layer selection and shall not be used for medical, health, or body assessment purposes, preventing accidental medical claims and associated regulatory exposure.  
* **Cloud free-tier dependency:** The database runs on MongoDB Atlas free tier, limiting storage and connection counts; this is acceptable for MVP-scale load and eliminates infrastructure cost during development. The application itself runs on the local staging host (dedicated local staging server); only the database remains cloud-hosted (Charter §6.1.8).  
* **Privacy regulation:** The system shall comply with the Data Privacy Act of 2012 (RA 10173\) for all stored user and seller data, a non-negotiable legal baseline for any production-deployable academic project.

## 

## 

## **3\. Functional Requirements**

### **3.1 User Authentication & Account Management**

* **FR-1.1 (Registration with Role Assignment):** The system shall allow users to create an account using a username, email address, and password. During the registration process, the system shall capture the role selection (User or Seller) from the end device. If the Seller role is selected, the system shall require the user to provide a Store Name to identify their business. The backend shall determine and assign the appropriate user role based on this selection, which shall be reflected in the database to establish entity membership and govern access permissions throughout the session.  
* **FR-1.2 (Account Information):** The system shall allow registered users and Sellers to read and view their account information including email address, username, assigned role, and Store Name (for Sellers).  
* **FR-1.3 (Account Updates):** The system shall allow registered users and Sellers to update their account information including password and profile details.  
* **FR-1.4 (Account Deletion):** The system shall allow registered users and Sellers to delete their accounts and all associated data permanently upon request, satisfying the user's right to data erasure under RA 10173\.  
* **FR-1.5 (Password Enforcement):** The system shall enforce passwords of at least 8 characters including one uppercase letter, one lowercase letter, one number, and one special character.  
* **FR-1.6 (Login / Logout):** The system shall authenticate registered users and Sellers, maintain secure sessions, and allow logout.  
* **FR-1.7 (RBAC):** The system shall enforce Role-Based Access Control separating Registered User, Guest, and Seller permissions, with the backend verifying the assigned user role on every protected request so that the frontend cannot bypass restrictions.  
* **FR-1.8 (Guest Access):** The system shall allow Guests to use visualization features (avatar creation, virtual try-on, catalog browsing, recommendations) without creating an account, except for adding items to the shopping cart and placing orders, which require registration.  
* **FR-1.9 (Guest Data Ephemerality):** The system shall discard all Guest progress and data permanently when the browser tab or session is closed, ensuring no orphaned anonymous records accumulate in the database.

### **3.2 Avatar Creation & Management**

* **FR-2.1 (Gender Selection):** The system shall allow users to create an avatar by selecting the avatar gender (Male or Female), which determines the available body-proportion options.  
* **FR-2.2 (Preset Avatars):** The system shall allow users to read and select from pre-set 2D body avatars.  
* **FR-2.3 (Custom Avatar):** The system shall allow users to create a custom avatar preset by entering height and weight, which shall be mapped to a suitable avatar body type.  
* **FR-2.4 (Skin Tone and Undertone):** The system shall allow users to select and update a skin-tone shade for their avatar, with an undertone category (warm, cool, or neutral) that is either selected by the user or derived deterministically from the selected shade.  
* **FR-2.5 (Persistent Preset):** The system shall read and reload the registered user's avatar preset across sessions.  
* **FR-2.6 (View Switching):** The system shall allow users to update the avatar visualization by toggling between Front, Side, and Rear views, instantly updating the avatar and all equipped clothing to the corresponding 2D assets.  
* **FR-2.7 (Body Proportions):** The system shall allow users to update the following body proportions, each dynamically swapping the underlying base body layers to ensure clothing aligns correctly:  
  * Shoulder width (narrow / average / broad)  
  * Waist (slim / average / curvy)  
  * Hip (slim / average / wide)  
  * Cup size for female avatars only (A / B / C / D)  
  * Thigh (slim / average / thick)  
* **FR-2.8 (List Presets):** The system shall allow registered users to read and view a list of all their saved avatar presets.  
* **FR-2.9 (Edit Preset):** The system shall allow registered users to update an existing saved avatar preset by modifying its parameters (height, weight, skin tone, body proportions).  
* **FR-2.10 (Delete Preset):** The system shall allow registered users to delete saved avatar presets permanently.

### **3.3 Clothing Catalog & Filtering**

* **FR-3.1 (Catalog):** The system shall read and maintain a catalog of clothing items organized into categories: Tops, Bottoms, Dresses/One-Piece Outfits, Outerwear, and Footwear.  
* **FR-3.2 (Metadata):** The system shall read and store metadata per item: name, description, store name, category, size, color, color description, color family, price, style tags, season/occasion tags, compatible color-palette tags, and three 2D image assets (Front, Side, Rear), ensuring users can always identify which Seller provided the item. The compatible color-palette tags (color\_palette\_tags) are system-derived: upon successful validation and publishing, the backend generates them from the item's color\_family value(s) using the encoded color-theory knowledge table (FR-7.1), so Sellers are not required to supply them in the CSV template (stored as CATALOG\_ITEMS.color\_palette\_tags per the project ERD).  
* **FR-3.3 (Filtering):** The system shall allow users to read, filter, and browse items by category, size, color, style, and store, including a per-seller Store page that lists all items published by that Seller.  
* **FR-3.4 (User Upload Restriction):** The system shall not permit regular users or Guests to upload their own clothing images, keeping catalog integrity and content moderation within the Seller's responsibility.

### 

### **3.4 Seller Catalog Management (CSV Upload)**

* **FR-4.1 (CSV Template Download):** The system shall allow Sellers to read and download a CSV template containing all required columns: *name, description, category, size, color, color\_description, color\_family, price, style\_tags, occasion\_tags, front\_image\_filename, side\_image\_filename, rear\_image\_filename.* The template shall include a header row of example values and an instruction sheet explaining the image-filename convention and the requirement that each clothing item must be photographed from three angles — **Front view, Side view, and Rear view** — with the garment laid flat or on a mannequin. Sellers are not required to manually remove backgrounds before uploading.  
* **FR-4.2 (CSV \+ Image Upload):** The system shall allow Sellers to create new catalog items by uploading a completed CSV file together with the corresponding standard image files (three photos per item). The backend shall automatically process these images using the rembg library to remove backgrounds and generate transparent PNGs. The Seller Dashboard shall present three clearly labeled drop zones — Front View, Side View, Rear View — so the Seller knows which image belongs to which angle. The backend shall automatically associate all uploaded items with the Seller's registered Store Name, eliminating the need for the Seller to type it repeatedly in the CSV. Upon successful validation and publishing, the backend shall likewise automatically derive each item's color\_palette\_tags from its color\_family value(s) using the encoded color-theory knowledge table (FR-7.1); Sellers are not required to provide color\_palette\_tags in the CSV template, and the derived field is stored in the catalog schema (CATALOG\_ITEMS.color\_palette\_tags per the project ERD).  
* **FR-4.3 (List Own Listings):** The system shall allow Sellers to read and view a list of all items they have uploaded, including item name, category, upload date, and status (active/rejected).  
* **FR-4.4 (View Item Details):** The system shall allow Sellers to read and view the full details of any item they have uploaded, including all metadata fields and associated images.  
* **FR-4.5 (Update Listings):** The system shall allow Sellers to update the metadata and images of items they previously uploaded, including replacing images or modifying tags, descriptions, and categories.  
* **FR-4.6 (Delete Listings):** The system shall allow Sellers to delete items they previously uploaded permanently from the catalog.  
* **FR-4.7 (Validation Algorithm):** The system shall validate each uploaded item against a rule set and reject non-conforming items with a descriptive error report. The rule set shall include: (a) all required fields are present, (b) image files exist and are at least 800 x 800 pixels and do not exceed 5 MB per file, (c) the automatically generated transparent PNGs have valid alpha channels, (d) the three view filenames in the CSV match the uploaded image files, and (e) a basic image-text alignment check to detect obvious mismatches (e.g., a "red" item with a blue-dominant image). The algorithm relies on deterministic file-mapping (CSV filename to uploaded file) and dominant-color hex extraction via the Pillow library, avoiding any machine-learning classification.  
* **FR-4.8 (Validation Report):** The system shall read, generate, and display a validation report listing accepted items and rejected items with specific reasons for each rejection.

### 

### **3.5 Virtual Try-On Visualization**

* **FR-5.1 (Canvas Display):** The system shall read and display a multi-angle 2D overlay canvas that layers transparent PNG clothing items over the selected or generated avatar, supporting Front, Side, and Rear views.  
* **FR-5.2 (Item Switching):** The system shall allow users to update the equipped items by switching items per category (one top, one bottom, one dress/one-piece outfit, one footwear, etc.) on the canvas. A Dress/One-Piece Outfit shall replace both the Top and Bottom slots.  
* **FR-5.3 (View Switching):** The system shall update the canvas instantly without reloading the page when items are changed or the view angle is switched.  
* **FR-5.4 (Save Outfit):** The system shall allow registered users to create and save named outfit combinations from their current try-on session.  
* **FR-5.5 (List Outfits):** The system shall allow registered users to read and view a list of all their saved outfit combinations.  
* **FR-5.6 (Load Outfit):** The system shall allow registered users to read and load a saved outfit combination onto the avatar, automatically equipping all items in that outfit.  
* **FR-5.7 (Edit Outfit):** The system shall allow registered users to update an existing saved outfit by modifying its items, colors, or name.  
* **FR-5.8 (Delete Outfit):** The system shall allow registered users to delete saved outfit combinations permanently.

### **3.6 E-Commerce with Mock Payment**

* **FR-6.1 (Shopping Cart):** The system shall allow Registered Users to create a shopping cart by adding the clothes, with the cart persisting across sessions. Guest Users shall not have access to the shopping cart feature and must register an account before adding items to a cart or proceeding to checkout; this restriction ensures that every cart and order is tied to a persistent identity, eliminating orphaned anonymous transactions and simplifying order history retrieval.  
* **FR-6.2 (View Cart):** The system shall allow Registered Users to read and view their cart contents including item names, store names, quantities, prices, and total amount.  
* **FR-6.3 (Cart Management):** The system shall allow Registered Users to update cart contents by modifying quantities of existing items.  
* **FR-6.4 (Remove Items):** The system shall allow Registered Users to delete items from the cart individually or clear the entire cart.  
* **FR-6.5 (Mock Checkout):** The system shall create a checkout transaction by presenting a full checkout UI (shipping address, payment method selection, order summary) and processing it through a standalone mock payment gateway that simulates payment approval without real transactions.  
* **FR-6.6 (Order Record):** The system shall create and store an order record for Registered Users after mock checkout completion, containing all order details, items, shipping address, and timestamp.  
* **FR-6.7 (Order History):** The system shall allow Registered Users to read and view their order history, including order dates, items purchased, and order status.  
* **FR-6.8 (Order Details):** The system shall allow Registered Users to read and view the full details of any specific order from their order history, including the store name associated with each purchased item.  
* **FR-6.9 (No Merchant Role):** FitFusion shall never act as the merchant or fulfill real orders.

### **3.7 Color Palette Matching & Recommendations**

The recommendation engine is a deterministic, knowledge-based Heuristic Expert System (rule-based / symbolic AI). It encodes human fashion knowledge (color theory and style rules) into explicit rules and weighted tag scoring. No machine-learning models are used, which ensures every recommendation is fully auditable and explainable to both the user and the panel.

* **FR-7.1 (Profile Match):** The system shall read the user's selected skin tone and undertone, and retrieve catalog items whose color-family tags are listed in the encoded color-theory knowledge table as compatible with that undertone.  
* **FR-7.2 (Generate Recommendations):** The system shall create and rank recommended items using deterministic weighted metadata tag scoring (content-based filtering): color compatibility (+3), height-appropriate contrast (+2), proportion-appropriate shading (+1), and style/occasion tag match (+1).   
  Basis of weights: The weights encode the relative visual salience of each factor in human outfit evaluation, drawn from classical color theory and seasonal color-analysis practice encoded in the knowledge table: color harmony dominates first impressions (+3), silhouette/height-appropriate contrast is next most salient (+2), proportion-appropriate shading refines perceived fit (+1), and style/occasion context is least visually salient (+1). The values are expert-encoded from color-theory/styling rules (Charter \[R18\]), not learned from data.  
  Validation & testing of weights: (a) deterministic unit/regression tests of the scoring function with fixed tag combinations and expected rankings; (b) sensitivity checks — perturbing each weight by ±1 shall not invert the top-1 ranking for canonical avatar profiles; (c) UAT in-app recommendation rating (Charter OBJ-05: ≥80% approval); (d) pre/post UAT confidence and return-intent ratings (Charter OBJ-06); (e) adviser/expert review of the knowledge table and weights at the M2 and M4 gates. Tests (a)–(b) are executed within Validation Algorithm Testing (WBS 1.4.2). If recommendations are judged poor or implausible during testing or UAT, the weights may be tuned in code as a normal development activity, with each tuned value and its rationale recorded in the weights-basis memo; only weight changes after the baseline freeze are baselined changes processed via the CCB (Charter §8).  
* **FR-7.3 (Display Recommendations):** The system shall read and display the top-ranked items in the Recommendation Panel together with the specific tags and scores that produced each recommendation.  
* **FR-7.4 (Recommendation Details):** The system shall allow users to read detailed match reasons for any recommended item, showing which rules fired and the points awarded.  
* **FR-7.5 (Optional In-App Rating):** The system shall provide an optional in-app rating (like/dislike or 1–5) for recommended items and for the fit visualization, captured during UAT sessions to feed the user-based success measures (Charter OBJ-01, OBJ-05). When a Guest clicks the rating control, the system shall display a sign-up/login prompt; ratings shall be persisted only for Registered Users, and Guest ratings shall be aggregated anonymously per session and discarded with the session per FR-1.9. The rating shall never be required to complete core flows.

## **4\. Non-Functional Requirements (NFRs)**

### **4.1 Performance Requirements**

* **Response Time:** 95% of catalog, filtering, recommendation, and e-commerce API requests must return within 500 milliseconds under normal load, the accepted threshold for a "feels instant" user experience.  
* **Canvas Rendering:** Overlay changes (switching a clothing item or view angle) shall render within 1 second on a mid-range laptop, keeping the virtual try-on experience fluid and avoiding perceived lag.  
* **Page Load:** The initial application load shall complete within 3 seconds on a standard campus Wi-Fi connection, aligning with industry benchmarks that show users abandon pages that load beyond 3 seconds.  
* **CSV Upload:** The system shall process a CSV upload of up to 10 items within 60 seconds, including automated background removal, validation, and image processing, keeping the Seller workflow snappy while 10 items represents a realistic bulk-upload size for an MVP catalog.

### **4.2 Security Requirements**

* All sensitive data in transit must be encrypted using TLS 1.2 or higher (TLS 1.3 preferred); MongoDB Atlas connections shall always use TLS, since TLS 1.0 and 1.1 are deprecated due to known vulnerabilities.  
* All passwords must be hashed using an industry-standard algorithm (Argon2id or Django's default PBKDF2) before storage; plaintext passwords shall never be stored, as Argon2id and PBKDF2 are memory-hard and resist GPU-based cracking.  
* Password input shall be validated in real time against the policy in FR-1.5, and registration shall be blocked until the policy is satisfied, providing immediate feedback that prevents failed registration attempts.  
* Write endpoints shall be protected by RBAC and require a valid authentication token; read-only endpoints may be accessed by Guests. Seller endpoints shall verify the Seller role on the backend, since server-side RBAC is the only trustworthy enforcement — client-side checks can be bypassed.  
* Guest sessions shall store data only in temporary memory/session storage and shall never write guest data to the persistent database, enforcing the Guest ephemerality rule at the storage layer rather than only in the frontend.

### **4.3 Reliability & Availability**

* **Uptime:** The application must maintain at least 95% availability during the semester evaluation period on the local staging host (excluding scheduled maintenance, local host downtime, and MongoDB Atlas free-tier limitations), a target achievable on Atlas free tier and sufficient for evaluation demos.  
* **Data Recovery:** The system shall rely on manual database exports (via mongodump or Atlas JSON export) performed weekly by the development team prior to major milestones, since automated snapshots are restricted to paid tiers on the MongoDB Atlas Free Tier (M0).

### **4.4 Usability & Accessibility**

* The web interface shall aim to comply with WCAG 2.1 Level AA accessibility standards (color contrast, keyboard navigation, alt text for catalog items), the widely accepted baseline for academic and government web projects.  
* The application UI must fully adapt to screen sizes ranging from 320px (mobile) to 4K desktop views, required because panelists and evaluators may demo on any device.  
* A Guest User shall be able to enter the app and start a virtual try-on session immediately, without being forced to register, maximizing engagement by removing the friction of account creation.  
* A first-time user shall be able to create an avatar preset and complete one virtual try-on within 2 minutes without training, a standard measure for consumer-app onboarding success.

## **5\. External Interface Requirements**

### **5.1 User Interfaces (UI)**

High-level screens (details and layouts in the Figma wireframes – see Section 1.4): Login/Registration screen with role selection (User/Seller), Store Name input (for Sellers), and "Continue as Guest" option; Account Management screen (view/edit profile, delete account); Avatar Creator (gender, height, weight, skin-tone, undertone, body proportion inputs); Avatar Preset Management (list, edit, delete presets); Virtual Try-On Canvas with category switchers and Front/Side/Rear view toggle buttons; Outfit Management (list, load, edit, delete saved outfits); Catalog Browser with filters; per-seller Store page listing all items published by that Seller; Recommendation Panel (with visible match reasons per item); Shopping Cart (Registered Users only); Checkout UI with mock payment gateway; Order History (list and detail views); Seller Dashboard (CSV template download, CSV upload with labeled Front/Side/Rear image drop zones, listings management with edit/delete options, validation reports).

### **5.2 Software Interfaces**

* **MongoDB Atlas:** persistent storage for registered users, Sellers (including Store Names), avatar presets, catalog items, metadata tags, saved outfits, cart state, and order history, accessed through the Django backend.  
* **Django REST API:** serves JSON data to the React frontend for all feature areas (catalog, recommendations, cart/checkout, account services, seller operations) with full CRUD endpoints for authenticated users and Sellers.

### **5.3 Communication Protocols**

Web communications must use HTTPS in production; for the Semester 1 local staging deployment, TLS is provided via a local CA (e.g., mkcert) for the staging demonstration URL; plain HTTP on 127.0.0.1 (loopback) is permitted only for local development and testing, not for the demonstration URL (Charter §6.1.8). MongoDB Atlas connections shall always use TLS. All client–server data exchange shall use JSON over REST, the simplest and most widely supported client–server protocol for a React \+ Django stack. Since FitFusion AI is a single-user application with no real-time collaboration, persistent real-time connections such as WebSockets are not required.

