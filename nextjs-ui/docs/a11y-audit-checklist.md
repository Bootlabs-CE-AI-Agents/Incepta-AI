# Accessibility (A11y) Audit Checklist - WCAG 2.1 AA

Generated: 2025-11-25

## Automated Testing

### Lighthouse Accessibility Audit
- [ ] Run Lighthouse on all pages (Chrome DevTools > Lighthouse tab)
- [ ] All pages score 90+ on Accessibility
- [ ] Document any failures

### axe DevTools (axe-core)
- [ ] Run axe scan on all pages
- [ ] Fix all Critical violations
- [ ] Review Serious violations
- [ ] Document Known Issues (if any)

### Storybook A11y Addon
- [ ] Open Storybook (`npm run storybook`)
- [ ] View Accessibility tab for each component story
- [ ] Fix any violations shown

## Manual Testing

### 1. Color Contrast (AC-1)
- [ ] **Normal text (14-17px)**: Verify 4.5:1 contrast minimum
  - Tools: WebAIM Contrast Checker, axe, Lighthouse
  - Test backgrounds: light (white), dark (gray-900), accent colors
- [ ] **Large text (18pt+)**: Verify 3:1 contrast minimum
- [ ] **Focus indicators**: 3:1 contrast against adjacent colors
- [ ] **Graphical elements**: 3:1 contrast minimum
- [ ] Test in light mode (if applicable)
- [ ] Test in dark mode (if applicable)

### 2. Keyboard Navigation (AC-2)
**Navigate entire app using ONLY Tab, Shift+Tab, Enter, Space, Esc**
- [ ] All interactive elements reachable via Tab
- [ ] Focus order is logical (left→right, top→bottom)
- [ ] Focus indicators visible on all elements
- [ ] No keyboard traps (elements that trap focus)
- [ ] All buttons/links functional with keyboard
- [ ] Form submission works with Enter key
- [ ] Escape closes modals
- [ ] Modal focus loops within modal (Tab in modal doesn't escape)

**Pages to test:**
- [ ] Home page
- [ ] Dashboard
- [ ] All major sections/pages

### 3. Form Labels & Association (AC-3)
- [ ] All input fields have associated labels (via `htmlFor` attribute)
- [ ] Required fields marked with `aria-required="true"`
- [ ] Error messages associated with `aria-describedby`
- [ ] No placeholder-only labels (visible labels present)
- [ ] Form instructions programmatically associated
- [ ] Test form validation with keyboard only

### 4. ARIA Labels & Semantic HTML (AC-4)
- [ ] Icon-only buttons have `aria-label` or `aria-labelledby`
- [ ] Images have descriptive `alt` text (or `role="presentation"` if decorative)
- [ ] Semantic HTML used: `<nav>`, `<main>`, `<section>`, `<article>`
- [ ] Heading hierarchy correct (h1→h2→h3, no skips)
- [ ] Lists use proper elements: `<ul>`, `<ol>`, `<li>`
- [ ] Data tables have `<thead>`, `<tbody>`, `scope` attributes
- [ ] Custom components have proper ARIA roles/states

### 5. Screen Reader Testing (AC-5)
**Test with VoiceOver (Mac) or NVDA (Windows)**

#### Page Structure
- [ ] Page title announced correctly
- [ ] Landmark regions announced: `<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>`
- [ ] Headings announced in correct order
- [ ] Navigation structure announced clearly

#### Interactive Elements
- [ ] All buttons announced with label
- [ ] All links announced with label
- [ ] Form fields announced with label
- [ ] Icon buttons announce correctly

#### Dynamic Content
- [ ] Loading states announced (`aria-busy="true"`, "Loading...")
- [ ] Error messages announced immediately
- [ ] Success messages announced when relevant
- [ ] Live regions update announced (if used)

#### Pages to test:
- [ ] Home page
- [ ] Dashboard
- [ ] Forms
- [ ] Navigation

### 6. Focus Indicators & Visual Design (AC-6)
- [ ] All interactive elements have visible focus indicator
- [ ] Focus outline: 2px minimum width
- [ ] Focus outline: 3:1 minimum contrast
- [ ] Focus outline not obscured by overflow or other elements
- [ ] Focus indicator style consistent across app
- [ ] Test on light backgrounds
- [ ] Test on dark backgrounds
- [ ] Test on colored backgrounds

### 7. Motion & Animation (AC-7)
- [ ] Test with `prefers-reduced-motion: reduce` enabled
  - On Mac: System Preferences > Accessibility > Display > Reduce motion
- [ ] Animations respect `prefers-reduced-motion`
- [ ] Auto-playing animations can be paused
- [ ] No content flashes more than 3 times per second
- [ ] Critical features don't require animation

### 8. Navigation Features (AC-8)
- [ ] "Skip to Main Content" link present and visible on focus
- [ ] Skip link focuses correctly on `<main>`
- [ ] Landmark regions used: header, nav, main, aside, footer
- [ ] Breadcrumbs announced correctly (if present)
- [ ] Current page indicator: `aria-current="page"`
- [ ] Sidebar menu structure announced
- [ ] Menu state changes announced

### 9. Empty & Error States (AC-9)
- [ ] Empty state messages are clear and helpful
- [ ] Error messages announced immediately
- [ ] Error messages explain problem and solution
- [ ] Success messages announced when relevant
- [ ] Loading state announced: "Loading...", `aria-busy="true"`
- [ ] Test all error conditions

### 10. Mobile & Touch Accessibility (AC-10)
- [ ] Touch targets: 44x44 CSS pixels minimum
- [ ] Button/link spacing adequate on mobile
- [ ] No hover-only functionality
- [ ] Zoom not disabled: `<meta name="viewport" ... user-scalable="yes">`
- [ ] Text resizable to 200% without loss of functionality
- [ ] Test on:
  - [ ] iPhone SE (375px)
  - [ ] iPhone 13 (390px)
  - [ ] iPad (768px)
  - [ ] Tablet (1024px)

## Summary

**Pages Tested:**
- [ ] Home
- [ ] Dashboard
- [ ] Forms
- [ ] Other (list):

**Tools Used:**
- [ ] Lighthouse
- [ ] axe DevTools
- [ ] VoiceOver / NVDA
- [ ] WebAIM Contrast Checker
- [ ] Browser DevTools

**Results:**
- Total issues found: ____
- Critical: ____ | Serious: ____ | Minor: ____
- All issues addressed: [ ]
- Final build check: [ ] Passing

**Signed off by:** ____________________
**Date:** ____________________
