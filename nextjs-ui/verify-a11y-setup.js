#!/usr/bin/env node

/**
 * Accessibility Test Suite Verification Script
 *
 * Validates that all a11y infrastructure is properly set up and configured
 * without requiring the full E2E test environment
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔍 Accessibility Test Suite Verification\n');
console.log('='.repeat(60));

let passCount = 0;
let failCount = 0;

// Check 1: Test file exists
console.log('\n✓ Check 1: Test File Structure');
if (fs.existsSync('./e2e/a11y.spec.ts')) {
  console.log('  ✅ e2e/a11y.spec.ts exists');
  passCount++;
} else {
  console.log('  ❌ e2e/a11y.spec.ts NOT found');
  failCount++;
}

// Check 2: Audit checklist exists
console.log('\n✓ Check 2: Audit Documentation');
if (fs.existsSync('./docs/a11y-audit-checklist.md')) {
  console.log('  ✅ docs/a11y-audit-checklist.md exists');
  passCount++;
} else {
  console.log('  ❌ docs/a11y-audit-checklist.md NOT found');
  failCount++;
}

// Check 3: globals.css has accessibility features
console.log('\n✓ Check 3: CSS Accessibility Features');
const globalsCss = fs.readFileSync('./app/globals.css', 'utf-8');
const a11yFeatures = [
  { name: 'Focus indicators', pattern: 'focus-visible' },
  { name: 'prefers-reduced-motion', pattern: 'prefers-reduced-motion' },
  { name: 'sr-only utility', pattern: '\\.sr-only' },
  { name: 'Touch target sizing', pattern: 'pointer: coarse' },
  { name: 'High contrast mode', pattern: 'prefers-contrast' }
];

a11yFeatures.forEach(feature => {
  if (globalsCss.includes(feature.pattern) || globalsCss.match(new RegExp(feature.pattern, 'i'))) {
    console.log(`  ✅ ${feature.name} configured`);
    passCount++;
  } else {
    console.log(`  ⚠️  ${feature.name} not found`);
    failCount++;
  }
});

// Check 4: Layout has skip link
console.log('\n✓ Check 4: Skip-to-Main-Content Link');
const layoutFile = fs.readFileSync('./app/layout.tsx', 'utf-8');
if (layoutFile.includes('href="#main"') && layoutFile.includes('Skip to main content')) {
  console.log('  ✅ Skip link implemented in layout.tsx');
  passCount++;
} else {
  console.log('  ❌ Skip link not found');
  failCount++;
}

// Check 5: DashboardLayout has main id
console.log('\n✓ Check 5: Main Landmark Region');
const dashboardLayout = fs.readFileSync('./components/dashboard/DashboardLayout.tsx', 'utf-8');
if (dashboardLayout.includes('id="main"')) {
  console.log('  ✅ id="main" on main element');
  passCount++;
} else {
  console.log('  ❌ id="main" not found on main element');
  failCount++;
}

// Check 6: Sidebar has navigation ARIA
console.log('\n✓ Check 6: Navigation Accessibility');
const sidebar = fs.readFileSync('./components/dashboard/Sidebar.tsx', 'utf-8');
const navChecks = [
  { name: 'aria-current attribute', pattern: 'aria-current' },
  { name: 'aria-label on nav', pattern: 'aria-label' },
  { name: 'role="complementary"', pattern: 'role="complementary"' }
];

navChecks.forEach(check => {
  if (sidebar.includes(check.pattern)) {
    console.log(`  ✅ ${check.name} implemented`);
    passCount++;
  } else {
    console.log(`  ⚠️  ${check.name} not found`);
    failCount++;
  }
});

// Check 7: Input component accessibility
console.log('\n✓ Check 7: Form Accessibility');
const inputFile = fs.readFileSync('./components/ui/Input.tsx', 'utf-8');
const formChecks = [
  { name: 'htmlFor on labels', pattern: 'htmlFor' },
  { name: 'aria-describedby for errors', pattern: 'aria-describedby' },
  { name: 'aria-required support', pattern: 'aria-required' }
];

formChecks.forEach(check => {
  if (inputFile.includes(check.pattern)) {
    console.log(`  ✅ ${check.name} implemented`);
    passCount++;
  } else {
    console.log(`  ⚠️  ${check.name} not found`);
    failCount++;
  }
});

// Check 8: Test file syntax
console.log('\n✓ Check 8: Test Suite Structure');
const testFile = fs.readFileSync('./e2e/a11y.spec.ts', 'utf-8');
const testChecks = [
  { name: 'Contrast tests', pattern: 'color-contrast' },
  { name: 'Keyboard navigation tests', pattern: 'keyboard|tab|focus' },
  { name: 'Modal tests', pattern: 'modal|dialog' },
  { name: 'Form label tests', pattern: 'label|htmlFor' },
  { name: 'Screen reader tests', pattern: 'landmark|heading' },
  { name: 'Touch target tests', pattern: 'touch|44x44|pointer' }
];

testChecks.forEach(check => {
  if (testFile.match(new RegExp(check.pattern, 'i'))) {
    console.log(`  ✅ ${check.name} included`);
    passCount++;
  } else {
    console.log(`  ⚠️  ${check.name} not found`);
    failCount++;
  }
});

// Check 9: Package dependencies
console.log('\n✓ Check 9: Dependencies Installed');
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
const deps = [
  { name: 'axe-core', type: 'devDependencies' },
  { name: '@axe-core/playwright', type: 'devDependencies' },
  { name: '@playwright/test', type: 'devDependencies' },
  { name: 'axe-playwright', type: 'devDependencies' },
];

deps.forEach(dep => {
  if (packageJson[dep.type] && packageJson[dep.type][dep.name]) {
    console.log(`  ✅ ${dep.name} installed`);
    passCount++;
  } else {
    console.log(`  ❌ ${dep.name} NOT installed`);
    failCount++;
  }
});

// Summary
console.log('\n' + '='.repeat(60));
console.log('\n📊 Verification Summary\n');
console.log(`✅ Passed: ${passCount}`);
console.log(`⚠️  Issues: ${failCount}`);
console.log(`Total Checks: ${passCount + failCount}\n`);

if (failCount === 0) {
  console.log('🎉 All accessibility infrastructure checks PASSED!\n');
  console.log('Next Steps:');
  console.log('1. Run E2E tests: npm run test:e2e -- e2e/a11y.spec.ts');
  console.log('2. Manual verification: Use a11y-audit-checklist.md');
  console.log('3. Browser testing: Lighthouse, axe DevTools, VoiceOver/NVDA\n');
  process.exit(0);
} else {
  console.log('⚠️  Some checks did not pass. Review above details.\n');
  process.exit(1);
}
