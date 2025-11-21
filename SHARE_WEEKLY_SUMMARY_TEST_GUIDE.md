# Weekly Summary Share Card - Testing Guide

## Quick Start Testing

### 1. Start the Development Server

```bash
cd frontend-react
npm run dev
```

### 2. Access the Feature

**Option A: Via Weekly Stats Page (Recommended)**
1. Navigate to `http://localhost:5173/weekly-stats`
2. Look for the new "📤 Share Weekly Summary →" button (first button)
3. Click it to navigate to the share page

**Option B: Direct URL**
1. Navigate directly to `http://localhost:5173/share/weekly-summary`

---

## What You Should See

### Share Weekly Summary Page

#### Loading State (briefly visible)
- 📊 emoji icon
- "Loading weekly summary..." text
- Clean, centered layout

#### Success State (Main View)
A beautiful 900px-wide card with:

**Header Section:**
- Title: "My Polish Learning Week" (large, bold, white text)
- Subtitle: Date range like "Nov 17 → Nov 23"

**XP Section:**
- Large glowing box with text like "✨ 320 XP"
- Subtitle: "earned this week"
- Glassmorphic container with backdrop blur

**Stats Grid (2 columns):**
- Left: "Days Practiced" showing X/7
- Right: "Current Streak" showing X 🔥
- Both cards have glassmorphic effect

**Best Badge Section:**
- Shows most recent badge icon (animated bounce on load)
- Badge name below icon
- Glow effect behind icon
- OR fallback text if no badges this week

**Footer:**
- "Polish Tutor • AI Powered" watermark

**Background Effects:**
- Purple-to-blue gradient
- Floating particles (5 white dots animating upward)
- Noise texture overlay
- Soft vignette darkening edges
- Corner accent glows

**Below the Card:**
- "📥 Export Weekly Summary as PNG" button (blue-purple gradient)
- "Back to Weekly Stats" button (gray)
- Usage hint text at bottom

---

## Testing Checklist

### Visual Verification

- [ ] Card is exactly 900px wide
- [ ] Background has smooth purple-blue gradient
- [ ] Particles are floating upward and fading
- [ ] XP number has glow effect
- [ ] Stats cards have glassmorphic appearance
- [ ] Badge icon (if present) bounces on load
- [ ] Text is white and readable
- [ ] Watermark is subtle at bottom

### Functional Testing

- [ ] Page loads without errors (check browser console)
- [ ] Real data is fetched from API
- [ ] Days practiced count is accurate (0-7)
- [ ] XP total matches weekly stats
- [ ] Streak number is displayed
- [ ] Best badge (if any) shows correct icon and name
- [ ] Export button is clickable and not disabled

### Export Testing

1. Click "📥 Export Weekly Summary as PNG"
2. Wait for button to show "Exporting…" spinner
3. PNG should download with filename like:
   - `weekly-summary-2025-11-17-to-2025-11-23.png`
4. Open downloaded PNG and verify:
   - [ ] Image is high resolution (2× pixel ratio)
   - [ ] All text is crisp and readable
   - [ ] Emojis render correctly
   - [ ] Gradients look smooth
   - [ ] Shadows and glows are visible
   - [ ] Card has rounded corners
   - [ ] No UI elements (buttons) in export

### Navigation Testing

- [ ] "Back to Weekly Stats" button returns to `/weekly-stats`
- [ ] From Weekly Stats, share button navigates to share page
- [ ] Browser back button works correctly
- [ ] No navigation errors in console

### Error State Testing

To test error state (optional):

1. Stop the backend API server
2. Reload the share page
3. Should see:
   - 😕 emoji
   - "Couldn't Load Weekly Summary" message
   - Error description
   - "Try Again" and "Back to Stats" buttons

---

## Browser Testing

Test in multiple browsers if possible:

- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari
- [ ] Edge

---

## Edge Cases to Test

### Data Variations

**Test 1: Perfect Week**
- 7/7 days practiced
- High XP (e.g., 500+)
- Multiple badges unlocked

**Test 2: Partial Week**
- 3/7 days practiced
- Moderate XP (e.g., 150)
- One badge unlocked

**Test 3: Minimal Activity**
- 0-1 days practiced
- Low XP (e.g., 20)
- No badges unlocked (should show fallback message)

**Test 4: Zero Activity**
- 0 days practiced
- 0 XP
- No badges
- Card should still render beautifully

### Week Boundaries

**Test on different days:**
- Monday (week start)
- Sunday (week end)
- Mid-week (Wednesday/Thursday)

Verify date range is always Monday-Sunday of current week.

---

## Common Issues & Fixes

### Issue: Card doesn't load
**Possible causes:**
- Backend API is down
- VITE_API_BASE env variable not set
- Network error

**Fix:**
- Check browser console for errors
- Verify backend is running
- Check `.env` file has correct API URL

### Issue: Export button doesn't work
**Possible causes:**
- Missing `html-to-image` package
- Browser doesn't support download API
- Card ref not properly attached

**Fix:**
- Run `npm install` to ensure dependencies
- Check browser console for errors
- Try a different browser

### Issue: Badge not showing
**Possible causes:**
- No badges unlocked this week
- Badge history API error
- Badge icon missing

**Expected behavior:**
- Should show fallback message if no badges
- Check badge history endpoint returns data

### Issue: Export quality is poor
**Possible causes:**
- PixelRatio not set to 2×
- Browser scaling issues

**Fix:**
- Already configured in `exportImage.ts` with `pixelRatio: 2`
- Try exporting from a different browser

---

## Developer Console Checks

Open browser DevTools (F12) and check:

### Console Tab
- [ ] No errors (red messages)
- [ ] API requests succeed (check Network tab)
- [ ] Export logs success message

### Network Tab
Filter by XHR/Fetch:
- [ ] `GET /api/v2/practice/weekly-stats?user_id=1` returns 200
- [ ] `GET /api/v2/user/1/badge-history` returns 200
- [ ] Response data looks correct

### Elements Tab
Inspect the card element:
- [ ] Card has ref attached
- [ ] All motion.div elements are present
- [ ] Styles are applied correctly

---

## Performance Checks

- [ ] Page loads in < 2 seconds
- [ ] Animations are smooth (60fps)
- [ ] Export completes in < 3 seconds
- [ ] No memory leaks after multiple exports

---

## Accessibility Checks (Optional)

- [ ] Card content is readable
- [ ] Sufficient color contrast (white on gradient)
- [ ] Buttons have clear labels
- [ ] Keyboard navigation works (Tab, Enter)

---

## Mobile Responsiveness (Note)

The share card is designed for **export/desktop viewing** at 900px width.

On mobile devices:
- Card may overflow viewport (expected)
- User should pinch/zoom to view
- Export will still produce full 900px card

For mobile optimization (future enhancement):
- Add responsive breakpoints
- Create mobile-sized card variant (e.g., 375px)

---

## Success Criteria

✅ **Pass:** All of the following work:
1. Card renders with real data
2. Visual effects are smooth and attractive
3. Export produces high-quality PNG
4. Navigation works in all directions
5. No console errors
6. Error state handles API failures gracefully

❌ **Fail:** Any of the following occur:
1. Page crashes or shows white screen
2. Data doesn't load from API
3. Export fails or produces corrupt file
4. Visual artifacts or broken styling
5. Console shows errors

---

## Next Steps After Testing

### If All Tests Pass ✅
1. Commit the changes
2. Push to feature branch
3. Create pull request
4. Share demo screenshots/video
5. Deploy to staging

### If Issues Found ❌
1. Document the issue
2. Check this guide for common fixes
3. Review browser console errors
4. Test in different browser/environment
5. Request help if needed with specific error messages

---

## Demo Data for Testing

If you want to test with specific data, you can temporarily modify `ShareWeeklySummaryPage.tsx` to use mock data instead of API calls.

**Example Mock Data:**
```typescript
const mockSummary: ShareWeeklySummaryCardProps = {
  weekStart: "2025-11-17",
  weekEnd: "2025-11-23",
  totalXp: 420,
  daysPracticed: 6,
  bestBadge: {
    code: "PERFECT_DAY",
    name: "Perfect Day",
    icon: "🌟",
  },
  streak: 8,
};

setSummaryData(mockSummary);
```

---

## Visual Reference

Expected gradient colors (can verify with color picker):
- Top Left: `#667eea` (blue)
- Center: `#764ba2` (purple)
- Bottom Right: `#5b4b8a` (darker purple)

Stats card glassmorphism:
- Background: `rgba(255, 255, 255, 0.15)`
- Border: `rgba(255, 255, 255, 0.2)`
- Backdrop filter: blur

---

**Happy Testing! 🎉**

If you encounter any issues not covered in this guide, check the main implementation summary document or the browser console for specific error messages.

