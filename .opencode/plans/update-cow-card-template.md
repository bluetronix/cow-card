# Cow Card Template Update Plan

## Goal
Update the cow card PDF template and add missing database fields to match the provided HTML template.

## Files to Modify

### 1. `src/types/index.ts`
Add 12 new fields to the `Cow` interface:
- `rfid_no: string` — after `collar_no`
- `pd_group: string` — after `pd_date`
- `ai_service_date: string` — after `pregnancy_result`
- `fat_percent: number` — after `total_lactation_yield`
- `protein_percent: number` — after `fat_percent`
- `projected_305d_milk_yield: number` — after `protein_percent`
- `feeding_group: string` — after `medical_records`
- `milking_group: string` — after `feeding_group`
- `pen_barn_no: string` — after `milking_group`
- `housing: string` — after `pen_barn_no`
- `remarks: string` — after `housing`
- `quarter_teat_status: string` — after `dead_qtr_teat`

### 2. `schema.sql`
Add matching columns to `cows` table.

### 3. `src/views/CowFormPage.vue`
- Add `rfid_no` field to Step 1 (Identity)
- Add `pd_group`, `ai_service_date` fields to Step 2 (Breeding, female only)
- Add `fat_percent`, `protein_percent`, `projected_305d_milk_yield` to Step 4 (Milk Production, female only)
- Add `feeding_group`, `milking_group`, `pen_barn_no`, `housing`, `quarter_teat_status`, `remarks` to Step 5 (Issuance & Scoring)
- Update `emptyCow()` with defaults for all new fields

### 4. `src/views/CowDetailPage.vue`
- Display new fields in the appropriate card sections on-screen

### 5. `src/utils/pdf.ts` — Major Rewrite
Redesign `generateSummaryCard()` to match the HTML template layout:

**Header:**
- Green bar (#00563b) spanning full width
- Left: "BASHE DAIRY FARM" + tagline "Healthy Cows, Quality Milk, Better Future"
- Center: "COW CARD" in large text
- Right: Animal ID box with "ANIMAL ID (BDF)" and "BDF-2026-0001" + QR code placeholder

**Body (4-column grid):**

Row 1:
- Col 1: Cow photo (image or placeholder)
- Col 2: **IDENTIFICATION** section (blue header #00563b)
  - ID No, Tag No, Collar No, RFID No, Date of Birth, Age
- Col 3: **ANIMAL INFORMATION** section (blue header #00563b)
  - Breed/Type, Colour, Sire, Dam, Origin
- Col 4: **REPRODUCTION** section (blue header #00563b)
  - Calving Date, Lactation No, Days in Milk, PD Group, Pregnancy Status, AI/Service Date, Expected Calving

Row 2:
- Col 1: **MILK PRODUCTION** section (blue header #005b9f)
  - Current Daily, Peak Yield, Total Lactation, 305d Projected, Fat%, Protein%
- Col 2: **MANAGEMENT** section (orange header #a05a2c)
  - Feeding Group, Milking Group, Pen/Barn No, Housing, BCS, Remarks
- Col 3-4: **HEALTH RECORD** section (red header #c9302c) — spans 2 columns
  - Mastitis History, Vaccination, Deworming, Last Health Check
  - Right side: Quarter/Teat Status with "All OK" indicator

**Footer:**
- Green bar (#00563b) with farm contact: 📍 Bashe Dairy Farm, P.O. Box 123 | 📞 +254 700 123 456 | ✉️ info@bashedairyfarm.com | 🌐 www.bashedairyfarm.com

**Implementation approach:**
Since jsPDF uses absolute positioning, I'll:
- Use `doc.rect()` for colored header/footer bars
- Use `doc.addImage()` for the QR placeholder (or draw a gray box)
- Use positioned `doc.text()` calls for each field
- Calculate column widths as `(pageWidth - 2*margin - 3*gap) / 4`
- Draw section headers with colored fill, then list fields below in a 2-column layout within each section

## Verification
- `npm run build` to ensure TypeScript types compile correctly
- Check that `emptyCow()` includes all new fields
- Verify form renders all new inputs
- Verify PDF generates without errors
