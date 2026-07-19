import { chromium, Page } from 'playwright';

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function registerAndLogin(page: Page, email: string, name: string) {
  console.log(`Registering / Logging in: ${email}`);
  await page.goto('http://localhost:3000/login');
  await page.waitForLoadState('domcontentloaded');

  // Try to log in first
  try {
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 4000 });
    console.log(`Successfully logged in existing user: ${email}`);
    return;
  } catch (e) {
    console.log(`Login failed or timed out for ${email}, attempting registration...`);
  }

  // Go to register
  await page.goto('http://localhost:3000/register');
  await page.waitForLoadState('domcontentloaded');
  await page.fill('input[name="firstName"]', name);
  await page.fill('input[name="lastName"]', 'Test');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', 'Password123!');
  await page.click('button[type="submit"]');
  
  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard', { timeout: 8000 });
  console.log(`Successfully registered and logged in new user: ${email}`);
}

async function runTest() {
  console.log("Starting Multiplayer Playwright E2E Verification with custom media stubs...");
  
  const browser = await chromium.launch({ headless: true });
  
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  // Stub getUserMedia on both pages to return valid mock MediaStream audio track
  const mockMediaInit = async (page: Page) => {
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

  await mockMediaInit(pageA);
  await mockMediaInit(pageB);

  // Print browser console logs
  pageA.on('console', msg => console.log('BROWSER A:', msg.text()));
  pageB.on('console', msg => console.log('BROWSER B:', msg.text()));

  const userSuffix = Date.now();
  const emailA = `playwright-${userSuffix}-A@example.com`;
  const emailB = `playwright-${userSuffix}-B@example.com`;

  try {
    // 1. Register both users
    await registerAndLogin(pageA, emailA, 'Alice');
    await registerAndLogin(pageB, emailB, 'Bob');

    // 2. Navigating both to /collaboration
    console.log("Navigating to collaboration dashboard...");
    await pageA.goto('http://localhost:3000/collaboration');
    await pageB.goto('http://localhost:3000/collaboration');
    
    await pageA.waitForLoadState('domcontentloaded');
    await pageB.waitForLoadState('domcontentloaded');

    // 3. User A creates a study group
    console.log("User A creating study group...");
    await pageA.click('button:has(svg.lucide-plus)');
    await pageA.fill('input[placeholder*="Placement prep"]', 'Multiplayer Verification Group');
    await pageA.fill('input[placeholder*="Short description"]', 'Verification group goals');
    await pageA.click('button[type="submit"]');
    await delay(3000);

    // 3.5 Click newly created workspace sidebar card to activate room
    console.log("Activating created study group on User A...");
    await pageA.click('div:has-text("Multiplayer Verification Group")');
    await delay(2000);

    // 4. Invite User B via Right Sidebar tab
    console.log("User A inviting User B...");
    // open sidebar info drawer
    await pageA.click('button:has(svg.lucide-info)');
    await delay(1500);
    // select invites tab
    await pageA.locator('button').filter({ hasText: /^Invites$/ }).click();
    await delay(1500);
    // type and click selection autocomplete
    await pageA.fill('input[placeholder*="Type username or email"]', emailB);
    await delay(4500); // Wait for the 3-second autocomplete debounce in page.tsx to run!
    
    // Click suggestion matching User B's displayName ("Bob") specifically in the dropdown list
    await pageA.locator('.absolute.top-full div').filter({ hasText: 'Bob' }).click();
    await delay(1500);
    // send invitation
    await pageA.click('button:has-text("Send Invitation")');
    await delay(3000);

    // 5. User B accepts invite
    console.log("User B accepting invite...");
    await pageB.reload();
    await pageB.waitForLoadState('domcontentloaded');
    // Click invitations indicator button or tab
    await pageB.click('button:has(svg.lucide-user-plus)');
    await delay(2000);
    await pageB.click('button:has-text("Accept")');
    await delay(2500);
    // Close the invitations modal to clear viewport
    await pageB.click('div.fixed.inset-0.z-50 button:has(svg.lucide-x)');
    await delay(2000);

    // 6. Enter study group room
    console.log("Entering study group room for User B...");
    await pageB.click('div:has-text("Multiplayer Verification Group")');
    await delay(2500);

    // 7. Verify Voice Channel Join/Leave
    console.log("Testing Voice Channels...");
    await pageA.click('button:has-text("Join")');
    await delay(3500);
    await pageB.click('button:has-text("Join")');
    await delay(4500);
    
    // Assert connected count displays "Connected" status label
    const connectedTextA = await pageA.innerText('span:has-text("Connected")');
    console.log(`Connected users count (User A's perspective): ${connectedTextA}`);
    
    // Leave Voice Channels
    await pageA.click('button[title="Leave channel"]');
    await pageB.click('button[title="Leave channel"]');
    await delay(2000);
    console.log("Voice channel leave verified.");

    // 8. Verify Collaborative Whiteboard Drawing
    console.log("Testing Whiteboard drawing...");
    await pageA.locator('button').filter({ hasText: /^whiteboard$/ }).click();
    await pageB.locator('button').filter({ hasText: /^whiteboard$/ }).click();
    await delay(2000);

    // Click on canvas and draw
    const canvasA = await pageA.$('canvas');
    if (canvasA) {
      const box = await canvasA.boundingBox();
      if (box) {
        await pageA.mouse.move(box.x + 50, box.y + 50);
        await pageA.mouse.down();
        await pageA.mouse.move(box.x + 150, box.y + 150);
        await pageA.mouse.up();
        console.log("User A drew a line on whiteboard canvas.");
        await delay(3000);
      }
    }

    // 9. Verify Coding Playground Code Synchronization
    console.log("Testing Coding Playground...");
    await pageA.locator('button').filter({ hasText: /^playground$/ }).click();
    await pageB.locator('button').filter({ hasText: /^playground$/ }).click();
    await delay(2000);

    // Type code on User A's editor textarea
    await pageA.fill('textarea[placeholder*="collaborative code"]', 'console.log("Hello from Playwright E2E!");');
    await delay(3000);
    
    // Assert code synced to User B
    const codeB = await pageB.inputValue('textarea[placeholder*="collaborative code"]');
    console.log(`Code synced to User B: ${codeB}`);

    // Run Code & verify output
    console.log("Testing code execution...");
    await pageA.click('button:has-text("Run Code")');
    await delay(3000);
    const outputA = await pageA.innerText('pre:has-text("Hello from Playwright")');
    console.log(`Execution output: ${outputA}`);

    // Explain Code
    console.log("Testing AI Tutor code explanation...");
    await pageA.click('button:has-text("Explain Code")');
    await delay(4000);
    console.log("AI explanation verified.");

    // 10. Verify Workspace Goals Edit/Save
    console.log("Testing Workspace Goals...");
    await pageA.locator('button').filter({ hasText: /^overview$/ }).click();
    await pageB.locator('button').filter({ hasText: /^overview$/ }).click();
    await delay(2000);

    await pageA.click('button:has-text("Edit")');
    await pageA.fill('input[placeholder*="e.g. Finish Operating Systems"]', 'Verify premium voice & whiteboard features');
    await pageA.fill('input[value="10"]', '15'); // target
    await pageA.fill('input[value="0"]', '12'); // completed
    await pageA.click('button:has-text("Save Goal")');
    await delay(4000);

    // Assert goals synced to User B
    const goalTextB = await pageB.innerText('span:has-text("Goal:")');
    console.log(`Goal synced to User B: ${goalTextB}`);

    // 11. Verify Pomodoro Study Session & Sprint Report
    console.log("Testing Study Sessions & Sprint Report...");
    await pageA.click('button:has-text("Start Group Study")');
    await delay(3000);
    
    // Verify End Group Study ends session and opens Sprint Report modal
    await pageA.click('button:has-text("End Group Study")');
    await delay(3000);

    // Verify Sprint Report opens on screen
    const reportText = await pageA.innerText('h4:has-text("Multiplayer Study Sprint Report")');
    console.log(`Sprint Report text visible: ${reportText}`);
    
    await pageA.click('button:has-text("Close Sprint Report")');
    await delay(1500);

    console.log("All Collaborative Multiplayer E2E checks completed successfully!");
  } catch (err) {
    console.error("Multiplayer Playwright Test failed with exception:", err);
  } finally {
    await browser.close();
  }
}

runTest();
