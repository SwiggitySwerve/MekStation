/**
 * Tactical exactly-once browser acceptance pack.
 *
 * E2E-09: harness delivers the same projected frame twice -> the client SHALL
 * reduce it once and acknowledge one delivery sequence.
 * E2E-10: a reconnect replay overlaps live delivery of the same event -> the
 * client SHALL converge without duplicate reducer effect.
 * E2E-11: harness withholds one viewer delivery sequence and sends a later
 * one -> that context SHALL enter syncing or behind state and recover the
 * missing authorized tail.
 * E2E-12: two different event identities claim one delivery sequence -> the
 * client SHALL enter an integrity-blocked state without advancing its cursor.
 *
 * The observable client contract is already shipped by section 5 in
 * `src/lib/multiplayer/client.ts`: the delivery cursor, `DeliveryAck`, gap
 * rejoin, and `PROTOCOL_VIOLATION/sequence-collision` emission are exercised
 * through the real `NetworkedGameSurface`, never reimplemented in this spec.
 *
 * @tags @exactly-once-pack @tactical @E2E-09 @E2E-10 @E2E-11 @E2E-12
 */

import {
  expect,
  test,
  type APIRequestContext,
  type Browser,
  type Page,
} from '@playwright/test';

const RUN_ID_HEADER = 'x-playwright-e2e-run-id';
const HOST_PASSWORD = 'HostPassword123!';
const GUEST_PASSWORD = 'GuestPassword123!';

type Scenario = 'duplicate' | 'reconnect' | 'gap' | 'collision';
type WireFrame = Record<string, unknown>;
type Identity = { readonly id: string; readonly displayName: string };
type Token = { readonly token: string; readonly playerId: string };
type Match = { readonly matchId: string; readonly roomCode: string };

interface ITargetFrame {
  readonly deliverySequence: number;
  readonly eventId: string;
}

interface IWireHarness {
  arm(): void;
  readonly acknowledgements: readonly number[];
  readonly joinCursors: readonly (number | null)[];
  readonly joins: number;
  readonly replayedEventIds: ReadonlySet<string>;
  readonly target: ITargetFrame | null;
  /** Every delivery number this page was SENT, in arrival order. */
  readonly deliveries: readonly number[];
}

test.describe('tactical client exactly-once delivery', () => {
  test('E2E-09 duplicate projected Event reduces once and acknowledges once @E2E-09', async ({
    browser,
    request,
  }) => {
    test.setTimeout(180_000);
    const fixture = await openTacticalFixture(browser, request, 'duplicate');
    try {
      fixture.harness.arm();
      await advanceToWeaponAttack(fixture.hostPage, fixture.guestPage);
      await expect(fixture.guestPage.getByTestId('phase-name')).toContainText(
        /Weapon Attack/i,
      );

      const target = requiredTarget(fixture.harness);
      await expect
        .poll(
          () => acknowledgementsFor(fixture.harness, target.deliverySequence),
          { timeout: 15_000 },
        )
        .toBe(1);
      await fixture.guestPage.waitForTimeout(500);
      expect(
        acknowledgementsFor(fixture.harness, target.deliverySequence),
      ).toBe(1);
      await expect(fixture.guestPage.getByTestId('phase-name')).toContainText(
        /Weapon Attack/i,
      );
    } finally {
      await fixture.cleanup();
    }
  });

  test('E2E-10 reconnect replay overlaps live delivery and converges once @E2E-10', async ({
    browser,
    request,
  }) => {
    test.setTimeout(180_000);
    const fixture = await openTacticalFixture(browser, request, 'reconnect');
    try {
      fixture.harness.arm();
      await advanceToWeaponAttack(fixture.hostPage, fixture.guestPage);
      const target = requiredTarget(fixture.harness);

      await expect
        .poll(() => fixture.harness.joins, { timeout: 20_000 })
        .toBeGreaterThan(1);
      await expect
        .poll(() => fixture.harness.replayedEventIds.has(target.eventId), {
          timeout: 20_000,
        })
        .toBe(true);
      await expect(fixture.guestPage.getByTestId('phase-name')).toContainText(
        /Weapon Attack/i,
        { timeout: 20_000 },
      );
      await fixture.guestPage.waitForTimeout(500);
      await expect(fixture.guestPage.getByTestId('phase-name')).toContainText(
        /Weapon Attack/i,
      );
    } finally {
      await fixture.cleanup();
    }
  });

  test('E2E-11 delivery hole rejoins from before the hole and recovers its tail @E2E-11', async ({
    browser,
    request,
  }) => {
    test.setTimeout(180_000);
    const fixture = await openTacticalFixture(browser, request, 'gap');
    try {
      fixture.harness.arm();
      await advanceToWeaponAttack(fixture.hostPage, fixture.guestPage);
      const target = requiredTarget(fixture.harness);
      await advanceToPhysicalAttack(fixture.hostPage, fixture.guestPage);

      await expect
        .poll(
          () =>
            fixture.harness.joinCursors.includes(target.deliverySequence - 1),
          { timeout: 20_000 },
        )
        .toBe(true);
      await expect
        .poll(() => fixture.harness.replayedEventIds.has(target.eventId), {
          timeout: 20_000,
        })
        .toBe(true);
      await expect(fixture.guestPage.getByTestId('phase-name')).toContainText(
        /Physical Attack/i,
        { timeout: 20_000 },
      );
    } finally {
      await fixture.cleanup();
    }
  });

  test('E2E-12 collision blocks the cursor before later delivery can advance it @E2E-12', async ({
    browser,
    request,
  }) => {
    test.setTimeout(180_000);
    const fixture = await openTacticalFixture(browser, request, 'collision');
    try {
      fixture.harness.arm();
      await advanceToWeaponAttack(fixture.hostPage, fixture.guestPage);
      const target = requiredTarget(fixture.harness);
      await expect(
        fixture.guestPage.getByTestId('intent-error-toast'),
      ).toContainText(/PROTOCOL_VIOLATION.*sequence-collision/i, {
        timeout: 15_000,
      });

      // LATER DELIVERY, WITHOUT A SECOND PHASE ADVANCE (finding #23).
      // The phase change the collision rode is not the last frame of
      // that commit - the authority publishes more behind it - so the
      // later deliveries the letter needs are already on the wire, and
      // this waits for one rather than manufacturing it.
      //
      // Manufacturing it was the old flake: driving another phase
      // advance needs a player to end the phase, a collided client
      // self-pauses (`paused` disables every control), and the D4
      // turn-ownership gate renders no End-phase control for the side
      // that is not active. MEASURED at both action bars: whoever was
      // wedged, the phase could not be advanced again - the row only
      // ever passed by clicking the wedged client's control in the
      // instant before its pause rendered, which it won on ~60% of runs.
      await expect
        .poll(
          () =>
            fixture.harness.deliveries.some(
              (sequence) => sequence > target.deliverySequence,
            ),
          { timeout: 30_000 },
        )
        .toBe(true);
      // A settle window so a late acknowledgement has time to be wrong.
      await fixture.guestPage.waitForTimeout(1_000);
      // The letter: later delivery arrived and did NOT advance the
      // cursor past the collided frame.
      expect(
        fixture.harness.acknowledgements.some(
          (sequence) => sequence > target.deliverySequence,
        ),
      ).toBe(false);
    } finally {
      await fixture.cleanup();
    }
  });
});

async function openTacticalFixture(
  browser: Browser,
  request: APIRequestContext,
  scenario: Scenario,
): Promise<{
  readonly hostPage: Page;
  readonly guestPage: Page;
  readonly harness: IWireHarness;
  readonly cleanup: () => Promise<void>;
}> {
  const identities: string[] = [];
  let match: Match | null = null;
  let hostToken: Token | null = null;
  const hostPage = await openContextPage(browser);
  const guestPage = await openContextPage(browser);
  const harness = await installHarness(guestPage, scenario);
  try {
    const host = await seedIdentity(
      request,
      'Exactly Once Host',
      HOST_PASSWORD,
    );
    identities.push(host.id);
    await hostPage.goto('/multiplayer');
    await hostPage.getByPlaceholder('Vault password').fill(HOST_PASSWORD);
    await hostPage.getByLabel('Display name').fill('Exactly Once Host');
    await hostPage.getByLabel('Map radius').fill('4');
    await hostPage.getByLabel('Turn limit').fill('5');
    const created = hostPage.waitForResponse(
      (response) =>
        response.url().endsWith('/api/multiplayer/matches') &&
        response.request().method() === 'POST' &&
        response.status() === 201,
      { timeout: 30_000 },
    );
    const token = hostPage.waitForResponse(
      (response) =>
        response.url().includes('/api/multiplayer/auth/token') &&
        response.request().method() === 'POST' &&
        response.status() === 200,
      { timeout: 30_000 },
    );
    await Promise.all([
      hostPage.waitForURL(/\/multiplayer\/lobby\/[A-Z0-9]+$/, {
        timeout: 30_000,
      }),
      hostPage.getByRole('button', { name: 'Create match' }).click(),
    ]);
    hostToken = await readToken(token);
    match = await readMatch(created);
    await connectLobby(hostPage, HOST_PASSWORD);

    const guest = await seedIdentity(
      request,
      'Exactly Once Guest',
      GUEST_PASSWORD,
    );
    identities.push(guest.id);
    await guestPage.goto('/multiplayer');
    await guestPage.getByPlaceholder('Vault password').fill(GUEST_PASSWORD);
    await guestPage.getByLabel('Room code').fill(match.roomCode);
    await Promise.all([
      guestPage.waitForURL(/\/multiplayer\/lobby\/[A-Z0-9]+$/, {
        timeout: 30_000,
      }),
      guestPage.getByRole('button', { name: 'Join match' }).click(),
    ]);
    await connectLobby(guestPage, GUEST_PASSWORD);
    await markReady(hostPage, 'alpha-1');
    await markReady(guestPage, 'bravo-1');
    await hostPage.getByRole('button', { name: 'Launch match' }).click();
    await expect(hostPage.getByTestId('networked-game-surface')).toBeVisible({
      timeout: 30_000,
    });
    await expect(guestPage.getByTestId('networked-game-surface')).toBeVisible({
      timeout: 30_000,
    });
    await advanceToMovement(hostPage, guestPage);
    return {
      hostPage,
      guestPage,
      harness,
      cleanup: async () => {
        if (match && hostToken) {
          await request.delete(`/api/multiplayer/matches/${match.matchId}`, {
            headers: { Authorization: `Bearer ${hostToken.token}` },
          });
        }
        await deleteIdentities(request, identities);
        await hostPage.context().close();
        await guestPage.context().close();
      },
    };
  } catch (error) {
    await hostPage.context().close();
    await guestPage.context().close();
    await deleteIdentities(request, identities);
    throw error;
  }
}

async function installHarness(
  page: Page,
  scenario: Scenario,
): Promise<IWireHarness> {
  const acknowledgements: number[] = [];
  const deliveries: number[] = [];
  const joinCursors: (number | null)[] = [];
  const replayedEventIds = new Set<string>();
  let armed = false;
  let joins = 0;
  let target: ITargetFrame | null = null;
  let reconnectClosed = false;

  await page.routeWebSocket(
    (url) => url.pathname === '/api/multiplayer/socket',
    (route) => {
      const server = route.connectToServer();
      route.onMessage((message) => {
        const frame = parseFrame(message);
        if (frame && frameKind(frame) === 'DeliveryAck') {
          const sequence = numberField(frame, 'deliverySequence');
          if (sequence !== null) acknowledgements.push(sequence);
        }
        if (frame && frameKind(frame) === 'SessionJoin') {
          joins += 1;
          joinCursors.push(numberField(frame, 'deliveryCursor'));
        }
        server.send(message);
      });
      server.onMessage((message) => {
        const frame = parseFrame(message);
        noteReplayEventIds(frame, replayedEventIds);
        // Recorded on the way IN, before any scenario rewrites the
        // stream, so "a later delivery reached this client" is a fact
        // about the wire and not about what the harness chose to pass on.
        if (frame) {
          const delivered = numberField(frame, 'deliverySequence');
          if (delivered !== null) deliveries.push(delivered);
        }
        // The collision scenario collides the FIRST delivered event of
        // the commit rather than its phase change. The phase change is
        // the LAST event the authority publishes for that commit
        // (measured: nothing is delivered after it until a player acts),
        // so colliding there left no later delivery for the cursor to
        // refuse - and manufacturing one needed a phase advance that a
        // collided, self-paused client can no longer drive.
        const candidate =
          frame &&
          (scenario === 'collision'
            ? deliveredEventTarget(frame)
            : phaseChangeTarget(frame));
        if (!armed || target || !candidate) {
          route.send(message);
          return;
        }
        target = candidate;
        if (scenario === 'duplicate') {
          route.send(message);
          route.send(message);
          return;
        }
        if (scenario === 'gap') return;
        if (scenario === 'collision') {
          const collision = collidingFrame(frame);
          if (!collision) throw new Error('Target Event could not be collided');
          route.send(message);
          route.send(collision);
          return;
        }
        route.send(message);
        if (!reconnectClosed) {
          reconnectClosed = true;
          void server.close();
        }
      });
    },
  );
  return {
    arm: () => {
      armed = true;
    },
    acknowledgements,
    deliveries,
    joinCursors,
    get joins() {
      return joins;
    },
    replayedEventIds,
    get target() {
      return target;
    },
  };
}

async function seedIdentity(
  request: APIRequestContext,
  displayName: string,
  password: string,
): Promise<Identity> {
  const response = await request.post('/api/e2e/vault-identity', {
    headers: { [RUN_ID_HEADER]: runId() },
    data: { displayName, password },
  });
  expect(response.status(), await response.text()).toBe(201);
  return (await response.json()) as Identity;
}

async function deleteIdentities(
  request: APIRequestContext,
  ids: readonly string[],
): Promise<void> {
  if (ids.length === 0) return;
  const response = await request.delete('/api/e2e/vault-identity', {
    headers: { [RUN_ID_HEADER]: runId() },
    data: { ids },
  });
  expect(response.status(), await response.text()).toBe(200);
}

async function openContextPage(browser: Browser): Promise<Page> {
  return (await browser.newContext()).newPage();
}

async function connectLobby(page: Page, password: string): Promise<void> {
  await expect(page.getByRole('heading', { name: 'Unlock vault' })).toBeVisible(
    {
      timeout: 20_000,
    },
  );
  await page.getByPlaceholder('Vault password').fill(password);
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes('/api/multiplayer/auth/token') &&
        response.request().method() === 'POST' &&
        response.status() === 200,
      { timeout: 30_000 },
    ),
    page.getByRole('button', { name: 'Connect to lobby' }).click(),
  ]);
}

async function markReady(page: Page, slotId: string): Promise<void> {
  const row = page.locator(`[data-slot-id="${slotId}"]`);
  await expect(row).toBeVisible({ timeout: 20_000 });
  await row.getByRole('button', { name: 'Ready' }).click();
  await expect(row).toContainText('Ready', { timeout: 15_000 });
}

async function advanceToMovement(host: Page, guest: Page): Promise<void> {
  await advancePhase(host);
  await expect(host.getByTestId('phase-name')).toContainText(/Movement/i);
  await expect(guest.getByTestId('phase-name')).toContainText(/Movement/i);
}

async function advanceToWeaponAttack(host: Page, guest: Page): Promise<void> {
  await advancePhase(host, guest);
  await expect(host.getByTestId('phase-name')).toContainText(/Weapon Attack/i);
}

async function advanceToPhysicalAttack(host: Page, guest: Page): Promise<void> {
  await advancePhase(host, guest);
  await expect(host.getByTestId('phase-name')).toContainText(
    /Physical Attack/i,
  );
}

async function advancePhase(...pages: readonly Page[]): Promise<void> {
  let activeIndex = -1;
  await expect
    .poll(
      async () => {
        for (let index = 0; index < pages.length; index += 1) {
          const page = pages[index];
          if (!page) continue;
          const control = page.getByTestId('advance-phase-button');
          if ((await control.count()) === 1 && (await control.isEnabled())) {
            activeIndex = index;
            return true;
          }
        }
        return false;
      },
      { timeout: 15_000 },
    )
    .toBe(true);
  const activePage = pages[activeIndex];
  if (!activePage) throw new Error('No player can advance the phase');
  await activePage.getByTestId('advance-phase-button').click();
}

async function readToken(
  response: Promise<import('@playwright/test').Response>,
): Promise<Token> {
  return (await (await response).json()) as Token;
}

async function readMatch(
  response: Promise<import('@playwright/test').Response>,
): Promise<Match> {
  const body = (await (await response).json()) as {
    readonly matchId: string;
    readonly roomCode?: string;
    readonly meta: { readonly roomCode?: string };
  };
  const roomCode = body.roomCode ?? body.meta.roomCode;
  if (!roomCode) throw new Error('Match response lacked a room code');
  return { matchId: body.matchId, roomCode };
}

function parseFrame(message: string | Buffer): WireFrame | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(message.toString());
  } catch (error) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }
  return isRecord(parsed) ? parsed : null;
}

/** Any delivered Event frame, whatever fact it carries. */
function deliveredEventTarget(frame: WireFrame): ITargetFrame | null {
  if (frameKind(frame) !== 'Event') return null;
  const event = objectField(frame, 'event');
  const sequence = numberField(frame, 'deliverySequence');
  const eventId = event === null ? null : stringField(event, 'id');
  return event !== null && sequence !== null && eventId !== null
    ? { deliverySequence: sequence, eventId }
    : null;
}

function phaseChangeTarget(frame: WireFrame): ITargetFrame | null {
  if (frameKind(frame) !== 'Event') return null;
  const event = objectField(frame, 'event');
  const sequence = numberField(frame, 'deliverySequence');
  const eventId = event === null ? null : stringField(event, 'id');
  return event !== null &&
    stringField(event, 'type') === 'phase_changed' &&
    sequence !== null &&
    eventId !== null
    ? { deliverySequence: sequence, eventId }
    : null;
}

function collidingFrame(frame: WireFrame): string | null {
  const event = objectField(frame, 'event');
  const eventId = event === null ? null : stringField(event, 'id');
  return eventId === null
    ? null
    : JSON.stringify({
        ...frame,
        event: { ...event, id: `collision-${eventId}` },
      });
}

function noteReplayEventIds(frame: WireFrame | null, ids: Set<string>): void {
  if (!frame || frameKind(frame) !== 'ReplayChunk') return;
  const events = frame.events;
  if (!Array.isArray(events)) return;
  for (const event of events) {
    if (!isRecord(event)) continue;
    const id = stringField(event, 'id');
    if (id) ids.add(id);
  }
}

function requiredTarget(harness: IWireHarness): ITargetFrame {
  if (!harness.target)
    throw new Error('Harness did not see a phase-change Event');
  return harness.target;
}

function acknowledgementsFor(harness: IWireHarness, sequence: number): number {
  return harness.acknowledgements.filter((value) => value === sequence).length;
}

function frameKind(frame: WireFrame): string | null {
  return stringField(frame, 'kind');
}

function stringField(value: WireFrame, key: string): string | null {
  const field = value[key];
  return typeof field === 'string' ? field : null;
}

function numberField(value: WireFrame, key: string): number | null {
  const field = value[key];
  return typeof field === 'number' ? field : null;
}

function objectField(value: WireFrame, key: string): WireFrame | null {
  const field = value[key];
  return isRecord(field) ? field : null;
}

function isRecord(value: unknown): value is WireFrame {
  return typeof value === 'object' && value !== null;
}

function runId(): string {
  const value = process.env.PLAYWRIGHT_E2E_RUN_ID;
  if (!value) throw new Error('PLAYWRIGHT_E2E_RUN_ID missing');
  return value;
}
