<template>
  <div class="card">
    <div class="card-frame">
    <!-- ================= HEADER ================= -->
    <div class="header">
      <div class="brand">
        <img src="../../assets/logo.png" class="logo" alt="Bashe Dairy Farm" />
      </div>

      <div class="title">
        <h1>BULL CARD</h1>
        <div class="divider">
          <i></i>
          <svg width="26" height="16" viewBox="0 0 24 15" fill="#0d4a2a" aria-hidden="true"><path d="M1 1c1 3 3 4 5 4h1l1 2h8l1-2h1c2 0 4-1 5-4-1 1-3 2-5 2H17l-1-1H8L7 3H6C4 3 2 2 1 1zM8 7h8v4H8zM9 11h2v3H9zm4 0h2v3h-2z"/></svg>
          <i></i>
        </div>
      </div>

      <div class="head-right">
        <div class="qr">
          <img v-if="qrDataUrl" :src="qrDataUrl" alt="Scan for full record" class="qr-img" />
        </div>
        <div class="animal-id">
          <div class="top">ANIMAL ID (BDF)</div>
          <div class="id">{{ animalId(props.cow) }}</div>
          <div class="bot">Scan QR for full record</div>
        </div>
      </div>
    </div>

    <div class="body">
      <!-- Bull Photos + Red Flags -->
      <div class="gallery-row">
        <div class="panel gallery">
          <div class="panel-h bg-green">Bull Photos</div>
        <div class="slots">
          <label class="slot" :data-slot="1">
            <img v-if="props.cow.front_image_url && !slotFailed.front" :src="props.cow.front_image_url" class="slot-img" alt="Front View" @error="slotFailed.front = true" />
            <div v-if="!props.cow.front_image_url || slotFailed.front" class="hint">Front View</div>
            <span class="lbl">Front View</span>
          </label>
          <label class="slot" :data-slot="2">
            <img v-if="props.cow.rear_image_url && !slotFailed.rear" :src="props.cow.rear_image_url" class="slot-img" alt="Rear View" @error="slotFailed.rear = true" />
            <div v-if="!props.cow.rear_image_url || slotFailed.rear" class="hint">Rear View</div>
            <span class="lbl">Rear View</span>
          </label>
          <label class="slot" :data-slot="3">
            <img v-if="props.cow.side_image_url && !slotFailed.side" :src="props.cow.side_image_url" class="slot-img" alt="Side View" @error="slotFailed.side = true" />
            <div v-if="!props.cow.side_image_url || slotFailed.side" class="hint">Side View</div>
            <span class="lbl">Side View</span>
          </label>
          <label class="slot" :data-slot="4">
            <img v-if="props.cow.head_image_url && !slotFailed.top" :src="props.cow.head_image_url" class="slot-img" alt="Top View" @error="slotFailed.top = true" />
            <div v-if="!props.cow.head_image_url || slotFailed.top" class="hint">Top View</div>
            <span class="lbl">Top View</span>
          </label>
          </div>
        </div>

        <div class="panel flags">
          <div class="panel-h bg-red">Red Flags</div>
          <div class="empty">No alerts</div>
        </div>
      </div>

      <div class="grid3">
        <!-- Identification -->
        <div class="panel">
          <div class="panel-h bg-green">Identification</div>
          <table class="kv">
            <tr><td>Card Number</td><td>{{ props.cow.id_no || '—' }}</td></tr>
            <tr><td>Tag No.</td><td>{{ props.cow.tag || '—' }}</td></tr>
            <tr><td>Collar No.</td><td>{{ props.cow.collar_no || '—' }}</td></tr>
            <tr><td>Date of Birth</td><td>{{ formatDate(props.cow.birth_date) || '—' }}</td></tr>
            <tr><td>Age</td><td>{{ age }}</td></tr>
            <tr><td>Registration No.</td><td>—</td></tr>
          </table>
        </div>

        <!-- Animal Information -->
        <div class="panel">
          <div class="panel-h bg-green">Animal Information</div>
          <table class="kv">
            <tr><td>Breed / Type</td><td>{{ props.cow.breed || '—' }}</td></tr>
            <tr><td>Colour</td><td>{{ props.cow.colour || '—' }}</td></tr>
            <tr><td>Sire ID</td><td>{{ props.cow.sire_id || '—' }}</td></tr>
            <tr><td>Sire Breed</td><td>{{ props.cow.sire_breed || '—' }}</td></tr>
            <tr><td>Dam ID</td><td>{{ props.cow.dam_id || '—' }}</td></tr>
            <tr><td>Dam Breed</td><td>{{ props.cow.dam_breed || '—' }}</td></tr>
          </table>
        </div>

        <!-- Management -->
        <div class="panel">
          <div class="panel-h bg-brown">Management</div>
          <table class="kv">
            <tr><td>Feeding Group</td><td>{{ props.cow.feeding_group || '—' }}</td></tr>
            <tr><td>Breeding Group</td><td>{{ props.cow.milking_group || '—' }}</td></tr>
            <tr><td>Barn / Pen Name</td><td>{{ props.cow.barn_name || '—' }}</td></tr>
            <tr><td>Housing</td><td>{{ props.cow.housing || '—' }}</td></tr>
            <tr><td>Cull Status</td><td>{{ props.cow.cull_status || '—' }}</td></tr>
            <tr><td>Remarks / Notes</td><td>{{ props.cow.remarks || '—' }}</td></tr>
          </table>
        </div>
      </div>

      <div class="lower-grid">
        <div class="lower-main">
          <div class="grid3 middle-row">
            <!-- Weight & Performance -->
            <div class="panel">
              <div class="panel-h bg-blue">Weight &amp; Performance</div>
              <table class="kv">
                <tr><td>Current Weight</td><td>{{ props.cow.weight_kg ? props.cow.weight_kg + ' kg' : '—' }}</td></tr>
                <tr><td>Birth Weight</td><td>—</td></tr>
                <tr><td>Weaning Weight</td><td>—</td></tr>
                <tr><td>Avg. Daily Gain (ADG)</td><td>{{ props.cow.average_daily_gain ? props.cow.average_daily_gain + ' kg/day' : '—' }}</td></tr>
                <tr><td>Height at Withers</td><td>—</td></tr>
                <tr><td>Scrotal Circumference</td><td>—</td></tr>
                <tr><td>Body Condition Score (BCS)</td><td>{{ props.cow.body_condition_score ? props.cow.body_condition_score + ' / 5' : '—' }}</td></tr>
                <tr><td>Last Weigh Date</td><td>—</td></tr>
              </table>
            </div>

            <!-- Breeding & Fertility -->
            <div class="panel">
              <div class="panel-h bg-green">Breeding &amp; Fertility</div>
              <table class="kv">
                <tr><td>Breeding Status</td><td><span class="badge">—</span></td></tr>
                <tr><td>Breeding Soundness (BSE)</td><td>—</td></tr>
                <tr><td>Last BSE Date</td><td>—</td></tr>
                <tr><td>Libido Score</td><td>—</td></tr>
                <tr><td>Semen Quality</td><td>—</td></tr>
                <tr><td>Semen Collection Start</td><td>—</td></tr>
                <tr><td>Total Services / Matings</td><td>—</td></tr>
                <tr><td>Conception Rate (%)</td><td>—</td></tr>
              </table>
            </div>

            <!-- Health Record -->
            <div class="panel">
              <div class="panel-h bg-red">Health Record</div>
              <table class="kv">
                <tr><td>Medical Records</td><td>{{ props.cow.medical_records || '—' }}</td></tr>
                <tr><td>Doctor Recommendations</td><td>{{ props.cow.vet_recommendations || '—' }}</td></tr>
                <tr><td>Vaccination</td><td>{{ props.cow.vaccinations || '—' }}</td></tr>
                <tr><td>Deworming</td><td>{{ props.cow.deworming_dates || '—' }}</td></tr>
                <tr><td>Injuries / Lameness</td><td>—</td></tr>
                <tr><td>Last Health Check</td><td>{{ props.cow.last_checkup_date || '—' }}</td></tr>
              </table>
              <div class="sound">
                <div class="t">SOUNDNESS CHECK</div>
                <div class="g">
                  <div>Testes<span>—</span></div>
                  <div>Prepuce / Penis<span>—</span></div>
                  <div>Feet &amp; Legs<span>—</span></div>
                  <div>Eyes<span>—</span></div>
                </div>
              </div>
            </div>
          </div>

          <div class="bottom">
            <!-- Service History -->
            <div class="panel">
              <div class="panel-h bg-green">Service History (Summary)</div>
              <table class="grid">
                <tr>
                  <th>Service No.</th>
                  <th>Date</th>
                  <th>Cow ID</th>
                  <th>Method</th>
                  <th>Outcome</th>
                  <th style="border-right:none">Remarks</th>
                </tr>
                <tr><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td></td></tr>
              </table>
            </div>

            <!-- Dates + Issued -->
            <div class="panel dates">
              <div class="panel-h bg-green">Dates</div>
              <table class="kv">
                <tr><td>Last Service</td><td>{{ props.cow.ai_service_date || '—' }}</td></tr>
                <tr><td>Last BSE</td><td>{{ props.cow.pd_date || '—' }}</td></tr>
                <tr><td>Next BSE (Due)</td><td>—</td></tr>
                <tr><td>Last Checkup</td><td>{{ props.cow.last_checkup_date || '—' }}</td></tr>
              </table>
              <div class="issued-mini">
                <div class="r"><span>Card Issued</span><span>{{ props.cow.issued_date || '—' }}</span></div>
                <div class="r"><span>Card Updated</span><span>{{ props.cow.updated_at || '—' }}</span></div>
                <div class="by"><small>By</small><b>{{ props.cow.issued_by || '—' }}</b></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Full Animal Photo -->
        <div class="panel photo-panel">
          <div class="panel-h bg-green photo-panel-title">Full Animal Photo</div>
          <div class="full-photo">
            <img v-if="fullBodyPhoto && !photoFailed" :src="fullBodyPhoto" alt="Full animal photo" class="full-photo-img" @error="onPhotoError" />
            <div v-else class="full-photo-empty">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 9h-2V7c0-1.1-.9-2-2-2h-3V4c0-1.1-.9-2-2-2h-2C7.9 2 7 2.9 7 4v1H4c-1.1 0-2 .9-2 2v2H0v2h2v5c0 1.1.9 2 2 2h1v3h2v-3h10v3h2v-3h1c1.1 0 2-.9 2-2v-5h2V9h-2z"/></svg>
              <span>[Full Animal Photo]</span>
              <small>Upload a side-profile photo</small>
            </div>
          </div>
          <div class="photo-meta">
            <div class="photo-meta-main">
              <b>{{ props.cow.breed || 'Bull' }}</b>
              <span>{{ props.cow.colour || '—' }}</span>
            </div>
            <div class="photo-meta-id">{{ animalId(props.cow) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ================= FOOTER ================= -->
    <div class="footer">
      <div class="addr">
        <svg viewBox="0 0 24 24" style="width:18px;height:18px"><path d="M12 2a7 7 0 0 0-7 7c0 5.200 7 13 7 13s7-7.800 7-13a7 7 0 0 0-7-7zm0 9.500A2.500 2.500 0 1 1 12 6.500a2.500 2.500 0 0 1 0 5z"/></svg>
        <div><b>{{ FARM.name }}</b><span>{{ FARM.address }}</span></div>
      </div>
      <div class="contacts">
        <div><svg viewBox="0 0 24 24"><path d="M6.600 10.800a15 15 0 0 0 6.600 6.600l2.200-2.200a1 1 0 0 1 1-.25 11 11 0 0 0 3.600.6 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.500a1 1 0 0 1 1 1c0 1.300.2 2.500.6 3.600a1 1 0 0 1-.25 1l-2.250 2.200z"/></svg>{{ FARM.phone }}</div>
        <div><svg viewBox="0 0 24 24"><path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm9 7l8-5H4l8 5zm0 2L4 9v8h16V9l-8 5z"/></svg>{{ FARM.email }}</div>
        <div><svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1 17.900A8 8 0 0 1 4.100 13H8v2l3 1v3.900zM18.900 16A8 8 0 0 1 13 19.900V16l-2-2H7v-2l3-1V8h3l1-2h2.500A8 8 0 0 1 20 12a8 8 0 0 1-1.100 4z"/></svg>{{ FARM.website }}</div>
      </div>
      <div class="thanks">
        <span>Thank you for<br>caring for our animals!</span>
        <svg viewBox="0 0 24 24"><path d="M12 21s-8-5.300-8-11a4.500 4.500 0 0 1 8-2.800A4.500 4.500 0 0 1 20 10c0 5.700-8 11-8 11z"/></svg>
      </div>
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatDate, calculateAge } from '../../utils/age'
import { computed, ref } from 'vue'
import { FARM, animalId } from '../../config/farm'
import type { Cow } from '../../types'

const props = defineProps<{ cow: Cow; qrDataUrl?: string }>()

const photoFailed = ref(false)
const slotFailed = ref({ front: false, rear: false, side: false, top: false })
const fullBodyPhoto = computed(() => props.cow.side_image_url || props.cow.image_url || '')

function onPhotoError() {
  photoFailed.value = true
}

const age = computed(() => {
  if (!props.cow.birth_date) return '—'
  return calculateAge(props.cow.birth_date) || '—'
})
</script>

<style scoped>
*{box-sizing:border-box;margin:0;padding:0}
.card{
  --green:#0d4a2a;
  --green-2:#14633a;
  --blue:#0b5a8a;
  --brown:#8a5a2b;
  --red:#b83232;
  --line:#d9dde3;
  --label-bg:#f4f5f8;
  --text:#222;
  --muted:#666;
  width:1680px;
  height:1188px;
  margin:0 auto;
  padding:60px;
  box-sizing:border-box;
  font-family:Arial,Helvetica,sans-serif;
  color:var(--text);
  font-size:13px;
  background:#fff;
}
.card-frame{
  width:100%;
  height:100%;
  border:2px solid var(--green);
  border-radius:12px;
  overflow:hidden;
  background:#fff;
  display:flex;
  flex-direction:column;
}

/* ---------- header ---------- */
.header{
  display:grid;
  grid-template-columns:1fr auto 1fr;
  align-items:center;
  padding:10px 18px;
  border-bottom:1px solid #d5d8dd;
  height:96px;
  flex:none;
}
.brand{display:flex;align-items:center;gap:10px}
.logo{height:62px;width:auto;max-width:220px;object-fit:contain}
.title{text-align:center}
.title h1{font-size:44px;font-weight:500;letter-spacing:3px;color:var(--green)}
.title .divider{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:4px}
.title .divider i{display:block;width:44px;height:2px;background:var(--green)}
.head-right{display:flex;justify-content:flex-end;align-items:center;gap:12px}
.qr{width:72px;height:72px;border:2px solid #111;border-radius:6px;padding:3px;background:#fff}
.qr-img{width:100%;height:100%;object-fit:contain;display:block}
.animal-id{
  width:178px;border:1px solid var(--green);border-radius:6px;overflow:hidden;text-align:center;
}
.animal-id .top{background:var(--green);color:#fff;font-size:9.5px;letter-spacing:2px;padding:4px 0}
.animal-id .id{font-size:21px;letter-spacing:1.5px;padding:6px 0 5px;color:#111;font-weight:500}
.animal-id .bot{font-size:9px;padding:3px 0 4px;color:#222;border-top:1px solid #ccc}

/* ---------- body ---------- */
.body{padding:6px 12px 0;flex:1;display:flex;flex-direction:column;min-height:0}
.panel{border:1px solid var(--line);border-radius:6px;overflow:hidden;background:#fff}
.panel-h{color:#fff;font-weight:600;font-size:13px;letter-spacing:.3px;padding:0 14px;height:28px;display:flex;align-items:center;gap:8px;text-transform:uppercase}
.bg-green{background:var(--green)}.bg-blue{background:var(--blue)}.bg-brown{background:var(--brown)}.bg-red{background:var(--red)}
table.kv{width:100%;border-collapse:collapse}
table.kv td{border-bottom:1px solid var(--line);padding:0 12px;font-size:12.5px;vertical-align:middle;height:19px}
table.kv td:first-child{background:var(--label-bg);border-right:1px solid var(--line);width:46%}
table.kv tr:last-child td{border-bottom:none}

/* Photo gallery */
.gallery-row{display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:12px;align-items:stretch}
.gallery .slots{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding:10px}
.gallery-row .flags{display:flex;flex-direction:column}
.gallery-row .flags .empty{flex:1;height:auto}
.slot{position:relative;aspect-ratio:1/1;border:2px dashed #9ab88a;border-radius:6px;background:#eef5e8 center/cover no-repeat;cursor:pointer;overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#4f7a3a;font-size:12px;gap:6px}
.slot.filled{border:1px solid #5a9526}
.slot.filled .hint{display:none}
.slot svg{width:34px;height:34px;fill:#4f7a3a;opacity:.7}
.slot .lbl{position:absolute;left:0;right:0;bottom:0;background:rgba(13,74,42,.88);color:#fff;font-size:12px;letter-spacing:.5px;padding:5px 10px;text-transform:uppercase}
.slot .chip{position:absolute;top:8px;left:10px;background:#f3c315;color:#222;font-size:11px;padding:2px 7px;border-radius:3px;transform:rotate(-6deg)}
.slot input{display:none}
.slot-img{width:100%;height:100%;object-fit:cover}

/* ---------- grids ---------- */
.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:10px;align-items:start}
.middle-row{margin-top:0}
.badge{display:inline-block;background:#e8eaee;color:#555;font-size:10px;font-weight:600;padding:2px 9px;border-radius:10px}
.sound{border-top:1px solid var(--line);padding:6px 12px 8px;background:#fff}
.sound .t{font-size:11px;letter-spacing:.4px;text-align:center;margin-bottom:8px}
.sound .g{display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;font-size:11.5px}
.sound .g div{display:flex;justify-content:space-between;border-bottom:1px dashed var(--line);padding-bottom:4px}
.sound .ok{text-align:center;margin-top:8px;font-size:12.5px;color:#888}

/* ---------- bottom row ---------- */
.bottom{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:12px;margin-top:0;align-items:stretch}
table.grid{width:100%;border-collapse:collapse;font-size:11.5px}
table.grid th{background:var(--label-bg);font-weight:400;border-right:1px solid var(--line);border-bottom:1px solid var(--line);padding:6px 4px;text-align:center;line-height:1.25}
table.grid td{text-align:center;padding:10px 4px;font-size:12px;color:#444}
.flags .empty{display:flex;align-items:center;justify-content:center;color:#888;font-style:italic;font-size:12px;height:90px}
.dates table.kv td{height:21px}
.issued-mini{border-top:1px solid var(--line);padding:7px 10px;font-size:11.5px;background:#fafbfc}
.issued-mini .r{display:flex;justify-content:space-between;margin-bottom:3px;gap:8px}
.issued-mini .by{display:flex;justify-content:space-between;align-items:flex-end;border-top:1px solid #d5d8dd;padding-top:4px;margin-top:4px}
.issued-mini .by small{font-size:10px;color:#666;text-transform:uppercase;letter-spacing:.5px}
.issued-mini .by b{font-weight:600;font-size:12px;color:#333}

/* ---------- lower layout + full animal photo ---------- */
.lower-grid{display:grid;grid-template-columns:minmax(0,1fr) 342px;gap:12px;margin-top:10px;align-items:stretch}
.lower-main{display:flex;flex-direction:column;gap:10px;min-width:0}
.photo-panel{display:flex;flex-direction:column;min-height:0}
.photo-panel-title{height:30px;font-size:13px;letter-spacing:1px}
.full-photo{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;background:#f3f4f6;border-top:1px solid var(--line);border-bottom:1px solid var(--line);overflow:hidden}
.full-photo-img{max-width:100%;max-height:100%;width:auto;height:auto;display:block}
.full-photo-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:#8a9a8f;text-align:center;padding:20px}
.full-photo-empty svg{width:64px;height:64px;fill:#b7c4ba}
.full-photo-empty span{font-size:16px;font-weight:700;letter-spacing:.5px}
.full-photo-empty small{font-size:11px;color:#9aa8a0}
.photo-meta{display:flex;justify-content:space-between;align-items:center;padding:7px 10px;gap:10px}
.photo-meta-main{display:flex;flex-direction:column;line-height:1.3}
.photo-meta-main b{font-size:12px;color:#222}
.photo-meta-main span{font-size:10.5px;color:#777}
.photo-meta-id{font-size:10px;font-weight:700;color:var(--green);letter-spacing:.5px;text-align:right}

/* ---------- footer ---------- */
.footer{
  margin-top:6px;background:var(--green);color:#fff;
  display:flex;align-items:center;justify-content:space-between;
  padding:0 20px;height:46px;flex:none;
}
.footer .addr{display:flex;align-items:center;gap:12px}
.footer .addr b{display:block;font-size:13px}
.footer .addr span{font-size:11px;opacity:.9}
.footer .contacts{display:flex;gap:26px;font-size:11.5px}
.footer .contacts div{display:flex;align-items:center;gap:7px}
.footer svg{width:14px;height:14px;fill:#fff;flex:none}
.footer .thanks{display:flex;align-items:center;gap:6px;font-style:italic;font-size:11.5px;text-align:right;line-height:1.25}
.footer .thanks svg{width:20px;height:20px;fill:none;stroke:#fff;stroke-width:1.5}

@media print{
  body{background:#fff;padding:0}
  .card{box-shadow:none}
}
</style>