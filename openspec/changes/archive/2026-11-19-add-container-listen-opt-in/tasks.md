## 1. Container listener opt-in

- [x] 1.1 Bind `0.0.0.0` in the packaged layout only for the exact `MEKSTATION_CONTAINER_LISTEN=all-interfaces` plus `HOSTNAME=0.0.0.0`, logging `CONTAINER_LISTEN_ALL_INTERFACES` at boot (`server.js`).
- [x] 1.2 Ignore, with a logged line, every other value and the variable with any other host; keep the loopback rule and development mode unchanged.
- [x] 1.3 Set the variable in the production `Dockerfile` only.
- [x] 1.4 Extend `scripts/__tests__/validate-multiplayer-packaged-socket.test.ts`: the exact-value matrix, the desktop shape (`127.0.0.1` with an inherited flag), every other rejected host with the flag, development mode, and a scan that keeps the variable out of everything but the Dockerfile.
- [x] 1.5 Prove the container answers `/api/health` through a loopback port map, and that a non-loopback `Host` is refused by the same-host guard. Fix the image HEALTHCHECK to `127.0.0.1` (in the image `localhost` resolves to `::1`, which the IPv4 all-interfaces listener does not serve).
- [x] 1.6 Publish the container port on `127.0.0.1` only in `docker-compose.yml` (app and dev) and `npm run docker:run`, drop the traefik labels, move the compose healthcheck to `127.0.0.1`, document that remote/LAN access is unsupported, and add a test that fails on any non-loopback publish or reverse-proxy label (C4 review F1, F2).
- [x] 1.7 Security review follow-ups: key `clientRateLimitKey` on the socket address for any non-loopback peer (new `clientRateLimitKey.test.ts`, red on the old code); strip the variable from the validator's and the test's rejection probes; widen the variable scan to root configs; mark the compose `dev` service unsupported; document the accepted page-data exposure.
- [x] 1.8 Independent security review recheck on the final config (APPROVE at c82d885c2, with the wording, long-syntax/host-networking test and proxy-comment follow-ups applied), and C4 review (APPROVE at 1ec509a04; `server.js` unchanged since).
