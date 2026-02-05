# P2P Sync Troubleshooting

Common issues and solutions for P2P Vault Sync.

## Connection Issues

### "Connection failed" / Can't connect to room

**Possible causes**:

1. **Firewall blocking WebRTC**: Some corporate/school networks block peer-to-peer connections
2. **Signaling server unavailable**: Public servers may be temporarily down
3. **Invalid room code**: Typo in the room code

**Solutions**:

- Try a different network (mobile hotspot often works)
- Verify the room code is correct (6 characters, no I/O/0/1)
- Wait a moment and try again
- Check if the room creator is still connected

### Peers can't see each other

**Possible causes**:

1. **Symmetric NAT**: Both peers behind restrictive NATs
2. **Different signaling servers**: Rare configuration issue

**Solutions**:

- One peer should try a different network
- Use a VPN to change network topology
- Ensure both peers are using the same app version

### Connection drops frequently

**Possible causes**:

1. **Unstable network**: WiFi interference, mobile data switching
2. **Browser throttling**: Inactive tabs may lose connections
3. **Signaling server issues**: Temporary server problems

**Solutions**:

- Keep the app tab active/visible
- Use a stable network connection
- The app will auto-reconnect (up to 5 attempts)

## Sync Issues

### Changes not appearing on other peer

**Possible causes**:

1. **Sync disabled**: Item might not have sync enabled
2. **Connection lost**: Peers may have disconnected
3. **Timing**: CRDT sync can take 1-2 seconds

**Solutions**:

- Verify sync is enabled on the item (toggle should be on)
- Check connection status indicator
- Wait a few seconds for sync to complete
- Try making another small change to trigger sync

### Items duplicated or missing

**Possible causes**:

1. **Concurrent edits**: Both peers edited simultaneously
2. **Offline edits**: Changes made while disconnected
3. **Import vs sync**: Imported items don't sync

**Solutions**:

- CRDT handles most conflicts automatically
- For conflicts, the most recent change wins
- Delete duplicates manually if they appear
- Ensure you're syncing, not importing

### Old data appearing after reconnect

**Possible causes**:

1. **IndexedDB cache**: Local offline data being replayed
2. **Merge behavior**: CRDT merging old and new state

**Solutions**:

- This is usually correct behavior - data should merge
- If incorrect, try leaving and rejoining the room
- Clear browser data for a fresh start (loses offline cache)

## Performance Issues

### Sync is slow

**Possible causes**:

1. **Large items**: Very complex units/forces take longer
2. **Many items**: Syncing hundreds of items simultaneously
3. **Network latency**: Geographic distance between peers

**Solutions**:

- Disable sync on items you don't need to share
- Start with fewer items and add gradually
- Use a faster network connection

### Browser becomes unresponsive

**Possible causes**:

1. **Too many sync events**: Rapid changes overwhelming UI
2. **Large data set**: Memory pressure from many items
3. **IndexedDB operations**: Heavy persistence writes

**Solutions**:

- Reduce number of synced items
- Close other browser tabs
- Refresh the page if needed

## Error Messages

### "Connection failed after X attempts"

The system tried to reconnect 5 times and gave up.

**Solutions**:

- Check your network connection
- Try manually rejoining the room
- Create a new room if the old one seems stuck

### "Failed to create room"

Could not establish a new sync room.

**Solutions**:

- Check internet connection
- Signaling servers may be down - wait and retry
- Try refreshing the page

### "Room not found"

The room code doesn't correspond to an active room.

**Solutions**:

- Verify the room code is correct
- The room creator may have left - ask them to create a new room
- Room codes are case-insensitive but check for typos

## Browser-Specific Issues

### Safari

- WebRTC support is good but may require user permission
- Private browsing mode may limit IndexedDB

### Firefox

- Generally works well
- Check that WebRTC is enabled (about:config)

### Chrome

- Best compatibility
- Ensure hardware acceleration is enabled for performance

### Mobile Browsers

- Works but battery/performance may be limited
- Keep app in foreground for reliable sync

## Advanced Troubleshooting

### Check connection state

Open browser DevTools (F12) and look for console messages:

- `[SyncProvider] Reconnect attempt X/5` - Connection retry
- `[SyncProvider] Error in event listener` - Code error

### Clear sync data

To reset everything:

1. Leave the current room
2. Clear browser data for the site
3. Refresh and start fresh

### Network debugging

1. Open DevTools > Network tab
2. Filter by "WS" (WebSocket)
3. Look for connections to signaling servers
4. Check for failed/blocked requests

## Getting Help

If none of these solutions work:

1. Note the exact error message
2. Check browser console for errors (F12 > Console)
3. Note your browser and version
4. Report the issue with these details

## FAQ

**Q: Is my data sent to a server?**
A: No, data is transmitted directly between peers. Signaling servers only help establish connections.

**Q: Can I recover data if I lose connection?**
A: Yes, data is cached locally in IndexedDB. It will sync when you reconnect.

**Q: How many peers can connect?**
A: Technically up to 20, but performance is best with 2-5 peers.

**Q: Does it work across different devices?**
A: Yes, as long as both devices can access the same room code and have WebRTC support.
