==================================================
PATIENT SIDE
PATIENT FRONTEND BUGS
==================================================

Dashboard — Active Queue Card Not Clickable
Priority: Medium
Type: Frontend
Status: CONFIRMED IN CODE

Problem:
TokenCard component on the Dashboard renders as a plain div with no onClick, no Link, and no navigate() call. It is currently not clickable at all.

File: src/pages/dashboard/DashboardPage.jsx (TokenCard component)

Expected:
Clicking the active queue/token card should navigate to My Queue (or My Tokens, depending on which card).
Ideally the specific active queue should be highlighted/opened on arrival.

Backend dependency:
None. Data is already available, this is a pure frontend wiring fix.

--------------------------------------------------

Queue Browse — Location Filter Not Wired to Backend
Priority: High
Type: Frontend (backend already supports this)
Status: CONFIRMED IN CODE

Problem:
BrowseQueuesPage.jsx never sends city or state to the API. Only the search term is sent. The backend endpoint (GET /queues/browse) already accepts city, state, search, page, and limit as query params and filters correctly, the frontend just isn't using them.

File: src/pages/patient/BrowseQueuesPage.jsx

Expected:
Patient selects a location.
Frontend sends city/state as query params to GET /queues/browse.
Backend already returns filtered results, no backend change needed.

Backend dependency:
None, backend confirmed working (getQueuesBrowse in queueController.js already handles city/state/search).

--------------------------------------------------

Queue Browse — Pagination Not Implemented
Priority: High
Type: Frontend (backend already supports this)
Status: CONFIRMED IN CODE

Problem:
BrowseQueuesPage.jsx hardcodes page: 1, limit: 20 permanently. There is no page-state, no next/prev controls, and the page value is never changed.

File: src/pages/patient/BrowseQueuesPage.jsx

Expected:
Backend already returns count, page, limit alongside data (confirmed in getQueuesBrowse), so total pages can be computed as Math.ceil(count / limit).
Frontend needs to:
- Track current page in state
- Send page/limit to the API
- Render Previous / Next / page number controls
- Combine correctly with the location filter above (same request, both params)

Backend dependency:
None, backend confirmed already returning the metadata needed.

--------------------------------------------------

My Queue — UI and Queue Details View Missing
Priority: High
Type: Frontend + Backend
Status: FEATURE GAP, not a regression

Problem:
My Queue page has no details view. Clicking a queue card does nothing beyond what's already on the card.

Expected queue details on click:
- Queue name, service, location
- Patient's token number
- Current running token
- Number of people ahead
- Estimated waiting time
- Queue status, queue date
- Location info (address/phone)

Frontend responsibility:
- Card UI improvement
- Details view/modal/page

Backend responsibility:
- GET /queues/:id/eta already exists and returns wait estimate data, confirm it returns everything listed above, extend if fields are missing (e.g. location address/phone may need to be joined in).

--------------------------------------------------

My Tokens — UI and Token Details View Missing
Priority: High
Type: Frontend + Backend
Status: FEATURE GAP, not a regression

Problem:
Same gap as My Queue. Additionally, MyTokensPage.jsx has zero socket.io references, so it will not live-update even after Phase 1 real-time work is done elsewhere, unless this page specifically gets a socket listener added.

File: src/pages/patient/MyTokensPage.jsx

Expected token details on click:
- Token number, queue, service, location
- Queue status, token status
- Current position, people ahead
- Estimated wait time
- Issued time, called time, served time

Frontend:
- Card/UI improvement
- Details view
- Add socket listener for "queue_updated" event (currently missing)

Backend:
- Confirm all listed fields are returned by whichever endpoint feeds this page.

==================================================
PATIENT BACKEND BUGS
==================================================

Queue Lifecycle — Queues Never Expire
Priority: CRITICAL
Type: Backend
Status: CONFIRMED MISSING (no cron/scheduler exists anywhere in the backend)

Problem:
A queue has no concept of expiring at end-of-day. It stays queryable/joinable indefinitely.

Expected:
Queue status should move to something like expired/closed once its queue_date has passed.
Do NOT delete the row, keep it for staff/admin reporting history.
Patients should not be able to join a queue whose date has passed.

Note: this needs a schema/status-value decision before implementation (e.g. add expired as a valid queues.status value, add a WHERE queue_date = CURRENT_DATE AND status = 'active' check on the join route).

--------------------------------------------------

Automatic Next-Day Queue Creation
Priority: CRITICAL
Type: Backend
Status: CONFIRMED MISSING, no cron/scheduler exists

Problem:
There is no mechanism that creates tomorrow's queue instance for a recurring service.

Expected:
Today: Queue ID 101, date 2026-08-11, 37 tokens.
Tomorrow: Queue ID 102 (new row, not reused), date 2026-08-12, 0 tokens, same service/location config, no carried-over tokens.

Backend options (pick one):
- Scheduled job/cron (recommended for production, e.g. node-cron running nightly)
- Create-on-demand when the current day's queue is queried and no queue exists for today
- Hybrid

Note: this and the item above are the same underlying feature (queue lifecycle), recommend building them together rather than as two separate tickets.

--------------------------------------------------

Service Page — Average Wait Time Needs Verification
Priority: Medium (downgraded from your CRITICAL, see note)
Type: Backend + Frontend
Status: PARTIALLY CONFIRMED, needs your input

Problem:
In PatientServices.jsx, avg wait time is already computed from real data client-side (averages service.avg_service_time across all services), it is not a hardcoded dummy number in that file.
The more likely real problem: avg_service_time on individual service rows in the DB may itself be null/placeholder/never-updated, since I found no backend job that recalculates it from actual completed-token history (issued_at to served_at), it's a static column staff presumably sets manually when creating a service.

Expected (matches your original spec):
Backend should calculate average wait from real completed tokens:
avg = AVG(served_at - issued_at) over recent completed tokens per service/queue
...and either write it back to avg_service_time periodically, or expose a live-calculated value via an endpoint, rather than relying on a manually-entered static field.

Frontend:
Display whatever the backend returns, no changes needed if backend starts returning a real calculated value at the same field name.

Backend:
Build the real calculation (this overlaps with the timeEstimation.js helper that already exists for token-level ETA, likely reusable).

==================================================
PATIENT SERVICE PAGE
==================================================

Locations List Appears Limited to 2
Priority: Medium
Type: Frontend + Backend
Status: NOT YET CONFIRMED IN CODE, needs repro

Problem:
You're seeing only 2 locations displayed even when more exist for a service. I checked PatientServices.jsx and LocationServicesPage.jsx and did not find a hardcoded slice(0, 2) or similar limit, backend getServices also doesn't cap results at 2.

Expected:
UI shows all locations tied to a service, or a "N locations" count with a way to view them.
Do not hardcode a location count anywhere.

Next step: send me the exact page/component this happens on (or a screenshot) so I can find the actual line, current evidence doesn't point to a specific cause yet.

==================================================
STAFF SIDE
STAFF FRONTEND BUGS
==================================================

Staff Location Page — Newly Added Location Not Rendered
Priority: High
Type: Frontend (backend confirmed correct)
Status: CONFIRMED ROOT CAUSE FOUND

Problem:
ManageLocations.jsx parses the API response incorrectly:
  Array.isArray(r.data) ? r.data : r.data?.locations || []
Backend actually returns { success: true, count, data: [...] }, there is no locations key anywhere in the response. This line always falls through to an empty array, so the list looks empty/stale every time it's fetched, including immediately after a successful create.

File: src/pages/staff/ManageLocations.jsx

Expected fix:
Change r.data?.locations to r.data?.data (or destructure { data } properly from the axios response).

Backend dependency:
None. handleSave() already correctly calls fetchLocations() after create, and locationController.js already returns the new row correctly. The bug is entirely in how the frontend reads the response shape.

--------------------------------------------------

Staff Location Page — Pagination
Priority: Medium
Type: Frontend + Backend
Status: NOT YET VERIFIED whether locationsAPI.getAll supports page/limit params, backend team should confirm/add if missing (services and queues/browse already support this pattern, locations should mirror it)

Expected:
GET /locations?page=1&limit=10 returning { data, count, page, totalPages }.
Frontend renders pagination controls and changes pages correctly.

--------------------------------------------------

Staff Services Page — Newly Added Service Not Rendered
Priority: High
Type: Frontend
Status: LIKELY SAME ROOT CAUSE AS LOCATION BUG ABOVE

Problem:
ManageServices.jsx uses the identical broken parsing pattern for its locations fetch: Array.isArray(lRes.data) ? lRes.data : lRes.data?.locations || []. If services listing uses a similar pattern (not fully confirmed for the services fetch itself, only confirmed for its locations fetch), it would explain new services not appearing too.

Expected:
Newly created service appears immediately, pagination updates correctly.

Next step: fix the locations parsing bug first (same file), then re-test whether the service list itself has its own separate parsing issue.

--------------------------------------------------

Staff Service Page — Locations Dropdown Appears Broken
Priority: High
Type: Frontend
Status: LIKELY SAME ROOT CAUSE, code itself is correctly built

Problem:
The dropdown in ManageServices.jsx is a real <select> element with a working "All Locations" option plus locations.map(...) generating one option per location, it is not hardcoded plain text. But it reads from the same broken locations parsing line described above. If that returns [], the dropdown would only ever show "All Locations" with nothing else, which matches what you're describing.

Expected:
Once the parsing bug is fixed, dropdown should show All Locations plus every real location, selectable, and filtering the service list correctly (matchLoc logic already exists and looks correct).

Next step: retest this specific bug after fixing the locations parsing issue, don't file as separate work yet.

==================================================
STAFF MANAGE QUEUE
==================================================

Manage Queue — Current Running Token Display
Priority: High
Type: Frontend
Status: PARTIALLY BUILT

Problem:
currentToken (first token with status "serving") is already computed in ManageQueues.jsx and displayed. What's missing is the started-at timestamp shown clearly next to it.

Expected:
CURRENT TOKEN #24, status SERVING, started 10:42 AM.

Backend dependency:
None, called_at is already stored and available on the token object.

--------------------------------------------------

Manage Queue — Live Serving Duration Not Shown
Priority: High
Type: Frontend
Status: CONFIRMED MISSING

Problem:
No setInterval, timer, or elapsed-time calculation exists anywhere in ManageQueues.jsx.

File: src/pages/staff/ManageQueues.jsx

Expected:
Token #24, started 10:42 AM, current time 10:57 AM, serving duration 15 minutes, updating continuously without a page refresh.

Backend:
No change needed, called_at already exists and is sufficient. Frontend computes Date.now() - called_at on an interval.

--------------------------------------------------

Manage Queue — Call Next Should Auto-Complete Previous Token
Priority: High
Type: Backend
Status: NOT A BUG, this is current backend behavior working as designed, contradicts what you want

Problem:
callNextToken in queueController.js explicitly checks for an existing status = 'serving' token on that queue first, and if one exists, returns a 400 error: "current token must be completed first". It deliberately refuses to advance until staff manually completes the current token. This is intentional code, not broken code, it's just not the flow you want.

Expected (your spec):
Call Next should, in one action:
- Mark the current serving token as completed, set served_at = NOW()
- Pull the next waiting token, set it to serving, set called_at = NOW()
- Do this atomically (single transaction, both succeed or both roll back)
- Emit queue_updated once, with the new state

This needs a real backend logic change, not a bug fix, recommend writing it as: "change Call Next from require-manual-complete-first to auto-complete-then-advance", so whoever picks it up knows the current behavior is intentional and being replaced, not broken.

--------------------------------------------------

Manage Queue — Prevent Multiple Serving Tokens
Priority: CRITICAL
Type: Backend
Status: ALREADY ENFORCED, not currently a bug

Problem:
You asked to make sure this can never happen via repeated clicking. Backend already guards against it, the same serving-token check described above in the Call Next item returns a 400 and refuses to create a second serving token, this is enforced server-side already, not just via a disabled frontend button.

Note: if you implement the auto-complete-then-advance change above, make sure the new transaction-based version keeps this same guarantee (only one serving token per queue at a time), don't accidentally remove the safety check while changing the flow.