const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Ensure screenshots directory exists
const screenshotsDir = path.join(__dirname, '../screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function takeScreenshot(page, name) {
  const filePath = path.join(screenshotsDir, `${name}.png`);
  await page.screenshot({ path: filePath });
  console.log(`[SCREENSHOT] Saved: ${filePath}`);
}

async function registerAndLogin(page, email, name) {
  console.log(`[AUTH] Navigating to login for ${email}`);
  await page.goto('http://localhost:3000/login');
  await delay(4000);
  await page.waitForLoadState('domcontentloaded');

  try {
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 8000 });
    console.log(`[AUTH] Logged in existing user: ${email}`);
    return;
  } catch (e) {
    console.log(`[AUTH] Login failed/timed out, registering new user...`);
  }

  await page.goto('http://localhost:3000/register');
  await delay(4000);
  await page.waitForLoadState('domcontentloaded');
  try {
    await page.fill('input[name="firstName"]', name);
    await page.fill('input[name="lastName"]', 'Audit');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    console.log(`[AUTH] Registered and logged in: ${email}`);
  } catch (e) {
    await page.screenshot({ path: `/Users/muditsharma/Documents/StudySync AI/packages/database/screenshots/debug_register_error_${name}.png` });
    console.error(`[AUTH] Registration failed/timed out: ${e.message}`);
    throw e;
  }
}

async function seedUserContent(page) {
  console.log(`[SEED] Seeding Note for resource linking...`);
  await page.goto('http://localhost:3000/notes?action=new');
  await page.waitForLoadState('domcontentloaded');
  await delay(2000);

  // Fill in title
  await page.fill('input[placeholder*="Binary Trees"]', 'Multiplayer Audit Note');
  // Submit form
  await page.click('button[type="submit"]');
  await delay(3500);
  console.log(`[SEED] Note created successfully.`);
}

const mockMediaInit = async (page) => {
  await page.addInitScript(() => {
    const mockTrack = {
      kind: 'audio',
      enabled: true,
      id: 'mock-audio-track-id',
      label: 'Mock Audio Device',
      readyState: 'live',
      stop: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
    };

    const mockStream = {
      getTracks: () => [mockTrack],
      getAudioTracks: () => [mockTrack],
      getVideoTracks: () => [],
      addTrack: () => {},
      removeTrack: () => {},
    };

    if (navigator.mediaDevices) {
      Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
        value: async () => mockStream,
        writable: true,
        configurable: true,
      });
    }
  });
};

async function runAudit() {
  console.log("=== STARTING COLLABORATION MODULE MULTIPLAYER MANUAL AUDIT ===");
  const browser = await chromium.launch({ headless: true });
  
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  await mockMediaInit(pageA);
  await mockMediaInit(pageB);

  pageA.on('console', msg => console.log('BROWSER A:', msg.text()));
  pageB.on('console', msg => console.log('BROWSER B:', msg.text()));

  const userSuffix = Date.now();
  const emailA = `audit-${userSuffix}-A@studysync.ai`;
  const emailB = `audit-${userSuffix}-B@studysync.ai`;

  try {
    // 1. Auth Setup
    await registerAndLogin(pageA, emailA, 'Alice');
    await seedUserContent(pageA);
    await registerAndLogin(pageB, emailB, 'Bob');

    // 2. Navigation to Collaboration
    console.log("[NAV] Navigating to collaboration dashboard...");
    await pageA.goto('http://localhost:3000/collaboration');
    await pageB.goto('http://localhost:3000/collaboration');
    await pageA.waitForLoadState('domcontentloaded');
    await pageB.waitForLoadState('domcontentloaded');
    await delay(2000);

     // 3. Workspace Creation
    console.log("[WORKFLOW 1] Creating Workspace...");
    await pageA.click('button:has(svg.lucide-plus)');
    await pageA.fill('input[placeholder*="Placement prep"]', 'Multiplayer Audit Group');
    await pageA.fill('input[placeholder*="Short description"]', 'Multiplayer verification group goals');
    await pageA.click('button[type="submit"]');
    await delay(3000);
    await pageA.locator('span.truncate', { hasText: 'Multiplayer Audit Group' }).click();
    await delay(2000);
    await takeScreenshot(pageA, '01_workspace_created_alice');

    // 4. Invites & Autocomplete Debounce
    console.log("[WORKFLOW 2] Inviting Bob to Workspace...");
    await pageA.click('button:has(svg.lucide-info)'); // Open right sidebar info
    await delay(1500);
    await pageA.locator('button').filter({ hasText: /^Invites$/ }).click();
    await delay(1500);
    await pageA.fill('input[placeholder*="Type username or email"]', emailB);
    await delay(4500); // Debounce delay
    await pageA.locator('.absolute.top-full div').filter({ hasText: 'Bob' }).click();
    await delay(1000);
    await pageA.click('button:has-text("Send Invitation")');
    await delay(3000);
    await takeScreenshot(pageA, '02_invite_sent_alice');

    // Close info sidebar on Page A to clean viewport
    await pageA.click('button:has(svg.lucide-info)');
    await delay(1000);

    // 5. Accepting Invitation & Workspace Sync
    console.log("[WORKFLOW 3] Bob accepting invitation...");
    await pageB.reload();
    await pageB.waitForLoadState('domcontentloaded');
    await pageB.click('button:has(svg.lucide-user-plus)'); // Invitation drawer
    await delay(2000);
    await takeScreenshot(pageB, '03_invite_drawer_bob');
    await pageB.click('button:has-text("Accept")');
    await delay(2000);
    await pageB.click('div.fixed.inset-0.z-50 button:has(svg.lucide-x)'); // Close invite modal
    await delay(1500);
    await pageB.locator('span.truncate', { hasText: 'Multiplayer Audit Group' }).click();
    await delay(2000);
    await takeScreenshot(pageB, '04_workspace_active_bob');

    // 6. Chat Synchronization
    console.log("[WORKFLOW 4] Chat Message Synchronization...");
    await pageA.fill('input[placeholder*="Type a collaborative"]', 'Hello Bob! Starting the chat audit.');
    await pageA.click('button:has(svg.lucide-send)');
    await delay(2000);
    await takeScreenshot(pageB, '05_chat_received_bob');

    // 7. Voice Rooms (WebRTC & Custom Indicators)
    console.log("[WORKFLOW 5] Audio Room Joining & Indicators...");
    await pageA.click('button:has-text("Join")');
    await delay(2000);
    await pageB.click('button:has-text("Join")');
    await delay(3000);
    await takeScreenshot(pageA, '06_voice_room_connected_alice');

    // Toggle mute/deafen
    console.log("[WORKFLOW 5.1] Audio Room Mute/Deafen Toggles...");
    await pageA.click('button[title="Mute microphone"]');
    await delay(1000);
    await pageA.click('button[title="Deafen audio"]');
    await delay(2000);
    await takeScreenshot(pageB, '07_voice_status_alice_updated_on_bob');

    // Leave Voice Room
    await pageA.click('button[title="Leave channel"]');
    await pageB.click('button[title="Leave channel"]');
    await delay(1500);

    // 8. Whiteboard Shapes, Undo/Redo & Coordinates Scaling
    console.log("[WORKFLOW 6] Collaborative Whiteboard drawing and shape creation...");
    await pageA.locator('button').filter({ hasText: /^whiteboard$/ }).click();
    await pageB.locator('button').filter({ hasText: /^whiteboard$/ }).click();
    await delay(2000);

    const canvasA = await pageA.$('canvas');
    if (canvasA) {
      const box = await canvasA.boundingBox();
      if (box) {
        // Draw pencil line
        await pageA.mouse.move(box.x + 100, box.y + 100);
        await pageA.mouse.down();
        await pageA.mouse.move(box.x + 200, box.y + 200);
        await pageA.mouse.up();
        await delay(2000);
        await takeScreenshot(pageB, '08_whiteboard_pencil_sync_bob');

        // Select Rect tool and draw rectangle
        await pageA.click('button:has-text("Rect")');
        await pageA.mouse.move(box.x + 250, box.y + 100);
        await pageA.mouse.down();
        await pageA.mouse.move(box.x + 400, box.y + 250);
        await pageA.mouse.up();
        await delay(2000);
        await takeScreenshot(pageB, '09_whiteboard_rect_sync_bob');

        // Undo last drawing
        console.log("[WORKFLOW 6.1] Whiteboard Undo action...");
        await pageA.click('button[title="Undo stroke"]');
        await delay(2000);
        await takeScreenshot(pageA, '10_whiteboard_undo_alice');
      }
    }

    // 9. Monaco Coding Playground Execution
    console.log("[WORKFLOW 7] Coding Playground editor sync and running code...");
    await pageA.locator('button').filter({ hasText: /^playground$/ }).click();
    await pageB.locator('button').filter({ hasText: /^playground$/ }).click();
    await delay(2000);

    await pageA.fill('textarea[placeholder*="collaborative code"]', 'console.log("Multiplayer Audit Verified!");');
    await delay(2000);
    await takeScreenshot(pageB, '11_playground_code_sync_bob');

    await pageA.click('button:has-text("Run Code")');
    await delay(3000);
    await takeScreenshot(pageA, '12_playground_run_output_alice');

    // 9.5. Workspace Goals (Edit and Save)
    console.log("[WORKFLOW 7.5] Workspace Goals edit/save and sync...");
    await pageA.locator('button').filter({ hasText: /^overview$/ }).click();
    await pageB.locator('button').filter({ hasText: /^overview$/ }).click();
    await delay(2000);
    await pageA.click('button:has-text("Edit")');
    await delay(1000);
    await pageA.fill('input[placeholder*="e.g. Finish Operating Systems"]', 'Audit goal checklist tasks');
    await pageA.locator('input[type="number"]').first().fill('12');
    await pageA.locator('input[type="number"]').last().fill('15');
    await pageA.click('button:has-text("Save Goal")');
    await delay(3000);
    await takeScreenshot(pageB, '12.5_goal_synced_bob');

     // 10. Shared Library & File Polish (Toggles, Sorting & Dropzone)
    console.log("[WORKFLOW 8] Shared Library Resource Linking & Grid/List View Toggles...");
    await pageA.click('button:has(svg.lucide-info)'); // Open right sidebar info
    await delay(1500);
    await pageA.locator('button').filter({ hasText: /^Files$/ }).click();
    await delay(1500);
    await pageA.click('button:has-text("Link Library")');
    await delay(2000);
    await takeScreenshot(pageA, '13_link_library_modal_alice');
    
    // Select notes category and select seeded note
    await pageA.locator('button').filter({ hasText: /^NOTE$/ }).click();
    await delay(1500);
    await pageA.locator('span', { hasText: 'Multiplayer Audit Note' }).click();
    await delay(1000);
    await pageA.click('button:has-text("Link Asset")');
    await delay(2000);

    // Toggle Grid View
    await pageA.click('button:has-text("Grid")');
    await delay(1500);
    await takeScreenshot(pageA, '14_shared_library_grid_view_alice');

    // Toggle back to List View
    await pageA.click('button:has-text("List")');
    await delay(1000);

    // 11. Pinned Resources & Notebook Dual Pane View
    console.log("[WORKFLOW 9] Pinning linked Note & verifying player navigation...");
    await pageA.click('button:has(svg.lucide-pin)'); // Pin button next to note in list
    await delay(2000);
    await takeScreenshot(pageB, '15_note_pinned_sync_bob');

    // Open Note Player
    await pageA.locator('span', { hasText: 'Multiplayer Audit Note' }).first().click();
    await delay(2500);
    await takeScreenshot(pageA, '16_notebook_player_active_alice');

    // Close Note Player Modal
    await pageA.click('div.fixed.inset-0.z-50 button:has(svg.lucide-x)');
    await delay(1500);

    // 12. Study Session Pomodoro & Linear Summary Sprint Report
    console.log("[WORKFLOW 10] Pomodoro Group Study Session & Linear Sprint Report...");
    await pageA.locator('button').filter({ hasText: /^overview$/ }).click();
    await delay(1500);
    await pageA.click('button:has-text("Start Group Study")');
    await delay(3000);
    await takeScreenshot(pageB, '17_group_study_active_bob');

    await pageA.click('button:has-text("End Group Study")');
    await delay(3000);
    await takeScreenshot(pageA, '18_sprint_report_modal_alice');

    // Save Sprint Report to Library
    console.log("[WORKFLOW 10.1] Saving sprint summary to workspace library...");
    await pageA.click('button:has-text("Save Sprint Summary to Library")');
    await delay(3000);
    await pageA.click('button:has-text("Close Sprint Report")');
    await delay(1000);

    console.log("=== MULTIPLAYER MANUAL AUDIT COMPLETED SUCCESSFUL ===");
  } catch (err) {
    console.error("Multiplayer manual audit failed with exception:", err);
  } finally {
    await browser.close();
  }
}

runAudit();
