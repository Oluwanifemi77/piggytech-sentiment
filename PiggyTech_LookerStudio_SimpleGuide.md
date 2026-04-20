# How to Rebuild Your PiggyTech Dashboard in Looker Studio
### A simple, step-by-step guide — no experience needed

---

## PART 1 — Get Your Data Ready

Your dashboard runs on a file called `labelled_tweets_gemini.csv` inside your project folder.

**Step 1: Upload the CSV to Google Sheets**

1. Go to **sheets.google.com** (sign in with your Google account)
2. Click the big **+** button (bottom right) to create a new spreadsheet
3. At the top, click **File → Import**
4. Click **Upload** → drag your `labelled_tweets_gemini.csv` file in (it's in your `piggytech-sentiment/public/` folder)
5. A popup will appear — make sure **"Replace spreadsheet"** is selected, then click **Import data**
6. Your data will load. You should see columns like `tweet_text`, `overall_sentiment`, `intent`, etc.
7. Rename the spreadsheet at the top: call it **PiggyTech Tweets**

---

## PART 2 — Create a New Report in Looker Studio

**Step 2: Open Looker Studio**

1. Go to **lookerstudio.google.com**
2. Click **+ Create** (top left) → then click **Report**

**Step 3: Connect your data**

1. A panel will appear on the right asking you to pick a data source
2. Click **Google Sheets**
3. Find and click on **PiggyTech Tweets** (the spreadsheet you just made)
4. Click **Add** → then click **Add to report** in the popup

You now have a blank report connected to your data. 

---

## PART 3 — Set the Look & Feel (Dark Theme)

**Step 4: Set the background colour**

1. Click **Theme and layout** in the top toolbar (it looks like a paint palette icon)
2. Click the **Customise** tab
3. Under **Report background**, click the colour box and type in: `#0A1628` (this is the dark navy colour your site uses)
4. Click **Done**

---

## PART 4 — Build the Top Filter Bar

This replaces the navbar filters on your website (Product, Intent, Date).

**Step 5: Add a Date Range filter**

1. Click **Insert** (top menu) → **Date range control**
2. Click and drag to draw it somewhere at the top of the page
3. In the panel on the right, set **Default date range** to: **Custom** → Jan 1 2026 to Mar 31 2026

**Step 6: Add a Product filter**

1. Click **Insert → Drop-down list**
2. Draw it next to the date control
3. In the right panel, under **Control field**, click and select **products_detected**
4. Change the label to say: `Filter by Product`

**Step 7: Add an Intent filter**

1. Click **Insert → Drop-down list** again
2. Draw it next to the Product filter
3. Under **Control field**, select **intent**
4. Change the label to: `Filter by Intent`

---

## PART 5 — Add the 4 Scorecards (The Big Number Cards)

These are the 4 boxes at the top of your dashboard showing tweet counts.

**Step 8: "Tweets Analysed" card**

1. Click **Insert → Scorecard**
2. Draw a box on your page
3. In the right panel:
   - **Metric:** make sure it says `Record Count`
   - **Label:** type `Tweets Analysed`
4. Click the **Style** tab on the right:
   - Background colour: `#0D1F3C`
   - Font colour: White
   - Value font size: 34

**Step 9: "Negative Tweets" card**

1. Click **Insert → Scorecard**, draw another box next to the first
2. In the right panel:
   - **Metric:** `Record Count`
   - **Label:** `Negative Tweets`
3. Now you need to add a filter so it only counts negative tweets:
   - Click **Add a filter** (in the right panel under the metric)
   - Click **Create a filter**
   - Set it to: `overall_sentiment` **Contains** `negative`
   - Click **Save**
4. Style tab → background `#0D1F3C`, font white, value size 34

**Step 10: "Positive Tweets" card**

1. **Insert → Scorecard**, draw a third box
2. Same setup as Step 9, but the filter is:
   - `overall_sentiment` **Contains** `positive`
3. Label: `Positive Tweets`
4. Same dark background styling

**Step 11: "Very Negative" card**

1. **Insert → Scorecard**, draw a fourth box
2. Filter:
   - `overall_sentiment` **Equals** `very_negative`
3. Label: `Very Negative`
4. Same dark background styling

---

## PART 6 — Sentiment Pie Chart (Donut)

This is the circular chart showing how many tweets are positive, negative, neutral, etc.

**Step 12: Add the pie chart**

1. Click **Insert → Pie chart**
2. Draw it on the left side of your page (roughly half width)
3. In the right panel (**Setup tab**):
   - **Dimension:** click the field and select `overall_sentiment`
   - **Metric:** `Record Count`
4. Click the **Style tab**:
   - Under **Pie chart**, change the type to **Donut**
   - Set hole size to about 50%
   - Background colour: `#0D1F3C`
5. To colour each slice:
   - Scroll down in the Style tab — you'll see a list of slice colours
   - Set them manually:
     - `very_negative` → `#C0392B` (dark red)
     - `slightly_negative` → `#E67E73` (light red/orange)
     - `neutral` → `#378ADD` (blue)
     - `slightly_positive` → `#58D68D` (light green)
     - `very_positive` → `#2ECC71` (green)
6. Turn on **Show legend** and position it on the right

---

## PART 7 — Top Aspects Bar Chart

This shows which topics (aspects) are mentioned most, as horizontal bars.

**Step 13: Add the bar chart**

1. Click **Insert → Bar chart**
2. Draw it on the right side of the page (next to the pie chart)
3. In the **Setup tab**:
   - **Dimension:** `aspect`
   - **Metric:** `Record Count`
   - **Sort:** `Record Count` → **Descending**
   - **Rows shown:** 7
4. In the **Style tab**:
   - Orientation: **Horizontal bars**
   - Bar colour: `#378ADD` (blue)
   - Background: `#0D1F3C`
5. **To make it interactive** (clicking a bar filters everything else):
   - In the Setup tab, scroll down to **Interactions**
   - Turn on **Apply filter** ✓

---

## PART 8 — Sentiment by Product (Stacked Bar)

This shows for each product (PiggyVest, Pocket, etc.) how the sentiment breaks down.

**Step 14: Add the stacked bar chart**

1. Click **Insert → Bar chart**
2. Draw it below the pie and aspect charts (full width)
3. In the **Setup tab**:
   - **Dimension:** `aspect_product`
   - **Breakdown dimension:** `overall_sentiment`
   - **Metric:** `Record Count`
4. In the **Style tab**:
   - Turn on **Stacked bars**
   - Orientation: **Horizontal**
   - Background: `#0D1F3C`
   - Colour the breakdown slices the same way as the pie chart above

---

## PART 9 — Tweet Table

This is the list of tweets at the bottom of the dashboard.

**Step 15: Add the table**

1. Click **Insert → Table**
2. Draw a wide box at the bottom of the page
3. In the **Setup tab**, add these **Dimensions** (click + Add dimension for each):
   - `tweet_text`
   - `author_username`
   - `overall_sentiment`
   - `intent`
   - `aspect`
   - `aspect_product`
4. **Sort:** `overall_sentiment` descending
5. **Rows per page:** 15
6. In the **Style tab**:
   - Header background: `#132035`
   - Header font: white, bold
   - Row background: `#0D1F3C`
   - Font colour: `#B8CCE0`

**Step 16: Colour-code the sentiment column**

1. Click the table to select it
2. In the Setup tab, find the `overall_sentiment` dimension and click the **pencil/edit icon** next to it
3. Click **Conditional formatting**
4. Add a rule for each sentiment:

   | Condition | Background | Text colour |
   |-----------|-----------|-------------|
   | Equals `very_negative` | `#2D1515` | `#E74C3C` |
   | Equals `slightly_negative` | `#2D1A1A` | `#E67E73` |
   | Equals `neutral` | `#0D2240` | `#378ADD` |
   | Equals `slightly_positive` | `#0D2A1A` | `#58D68D` |
   | Equals `very_positive` | `#0A2218` | `#2ECC71` |

---

## PART 10 — Make the Filters Apply to Everything

Right now your filters might only affect some charts. This step makes them control the whole page.

**Step 17: Make filters report-level**

1. Click on your **Date Range control**
2. Right-click → **Make report-level control**
3. Do the same for your **Product** filter
4. Do the same for your **Intent** filter

Now when you change a filter, every chart on the page updates at once — just like your website!

---

## PART 11 — Add Page 2 (Tweet Browser)

**Step 18: Add a second page**

1. At the bottom of the screen, click **+ Add page**
2. Name it: `Tweet Browser`

**Step 19: Add filters on Page 2**

Repeat Steps 5–7 (date, product, intent filters) on this new page. Also add:
- A **Text input** control → field: `tweet_text` (for searching tweets by keyword)
- A **Drop-down** → field: `overall_sentiment`
- A **Drop-down** → field: `aspect`

**Step 20: Add the tweet table on Page 2**

Same as Steps 15–16 above, but set **Rows per page** to **20**.

---

## PART 12 — Share Your Report

**Step 21: Publish and share**

1. Click the **Share** button (top right)
2. Click **Manage access**
3. Change access to **Anyone with the link → Viewer**
4. Copy the link and share it with your team!

---

## You're done! 🎉

Your Looker Studio report will have:
- ✅ 4 scorecards (tweet counts)
- ✅ Sentiment donut chart
- ✅ Top aspects bar chart (clickable!)
- ✅ Sentiment by product stacked bar
- ✅ Paginated tweet table with colour badges
- ✅ Date, product, and intent filters
- ✅ A second page for browsing all tweets
